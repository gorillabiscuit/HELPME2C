import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { drizzle } from 'drizzle-orm/pglite';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regression tests for `titlesRouter.search` ranking.
 *
 * UNLIKE the other router tests in this directory, this one does NOT mock the
 * database — it runs the genuine SQL against a real in-process Postgres (PGlite
 * + pg_trgm). That is deliberate and necessary: the bugs guarded here live in
 * the SQL candidate query (`ORDER BY … LIMIT`) and in pg_trgm `word_similarity`
 * behaviour, neither of which a chain-recorder mock can reproduce. A mocked DB
 * test for this would pass against the very bug it claims to catch.
 *
 * Two failure modes are pinned (each was a real production bug, 2026-06):
 *  1. CANDIDATE-WINDOW TRUNCATION — the candidate `SELECT` was ordered by title
 *     ASC before `LIMIT`, so when the broad fuzzy filter matched more rows than
 *     the window, an exact match sorting alphabetically late ("Mad Men" after
 *     "Aaa…") was discarded before the JS re-rank ever saw it.
 *  2. COARSE MATCH GRADE — the JS re-rank treated "contains substring" as a
 *     single tier, so a more-popular partial match ("Aquaman and the Lost
 *     Kingdom") could outrank the exact title ("Lost").
 *
 * Per CLAUDE.md §8.1 these assert the documented contract (exact title should
 * rank first), not the implementation.
 */

// db.ts runs `neon(process.env.DATABASE_URL!)` at import; stub it so importing
// the router doesn't require a live connection. The real DB used by the
// procedure is the PGlite-backed drizzle instance passed into createCaller.
vi.mock('@/server/db', () => ({ db: {} }));
// Keep the on-demand TMDB ingest fallback inert (no network in tests).
vi.mock('@/inngest/functions/tmdb-sync', () => ({
  searchTmdbAndIngest: vi.fn(async () => [] as string[]),
}));

// Imported after the mocks above so the mocks are in place at module load.
const { titlesRouter } = await import('./titles');
const schema = await import('../schema');

// Full mirror of the `titles` table (schema/titles.ts) — drizzle's INSERT
// enumerates every column (DEFAULT for omitted ones), so the test table must
// have them all, not just the ones the query reads.
const DDL = `
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE TYPE media_source AS ENUM ('tmdb', 'anilist');
  CREATE TYPE media_type AS ENUM ('tv', 'film', 'anime');
  CREATE TYPE title_status AS ENUM ('ongoing', 'completed', 'cancelled', 'upcoming');
  CREATE TABLE titles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id text NOT NULL,
    source media_source NOT NULL,
    media_type media_type NOT NULL,
    title text NOT NULL,
    original_title text,
    synopsis text,
    status title_status,
    release_year integer,
    end_year integer,
    episode_count integer,
    episode_duration_minutes integer,
    poster_url text,
    backdrop_url text,
    popularity_score real,
    id_mal integer,
    trailer_provider text,
    trailer_video_id text,
    is_curated boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
`;

interface SeedTitle {
  externalId: string;
  source: 'tmdb' | 'anilist';
  mediaType: 'tv' | 'film' | 'anime';
  title: string;
  originalTitle?: string | null;
  popularityScore?: number;
}

async function makeCaller(seed: SeedTitle[]) {
  const client = new PGlite({ extensions: { pg_trgm } });
  await client.exec(DDL);
  const db = drizzle(client, { schema });
  await db.insert(schema.titles).values(seed);
  // protectedProcedure only checks userId; search uses only ctx.db.
  // `db as never` because the PGlite drizzle type is structurally distinct from
  // the production neon-http drizzle type, but exposes the identical query API.
  return titlesRouter.createCaller({ db: db as never, userId: 'test-user' });
}

describe('titlesRouter.search ranking', () => {
  let nextId = 0;
  beforeEach(() => {
    nextId = 0;
  });
  const seedId = () => `ext-${nextId++}`;

  it('ranks an exact title above a more popular partial-substring match', async () => {
    const caller = await makeCaller([
      // The exact title the user wants — deliberately low popularity.
      { externalId: seedId(), source: 'tmdb', mediaType: 'tv', title: 'Lost', popularityScore: 1 },
      // A far more popular title that merely *contains* the query as a substring.
      {
        externalId: seedId(),
        source: 'tmdb',
        mediaType: 'film',
        title: 'Aquaman and the Lost Kingdom',
        popularityScore: 9999,
      },
    ]);

    const results = await caller.search({ q: 'Lost' });

    expect(results[0]?.title).toBe('Lost');
  });

  it('surfaces an exact match even when many partial matches flood the candidate window', async () => {
    // The candidate SELECT keeps only a bounded window of rows before the JS
    // re-rank. Seed far more alphabetically-earlier partial matches than any
    // plausible window so that an ASC-ordered candidate query would truncate
    // the exact title out entirely. 120 comfortably exceeds the limit*3 / 60
    // candidate pool.
    const decoys: SeedTitle[] = Array.from({ length: 120 }, (_, i) => ({
      externalId: seedId(),
      source: 'tmdb' as const,
      mediaType: 'film' as const,
      // "Aaa …" sorts before "Mad Men"; contains the query so it matches the filter.
      title: `Aaa Mad Men Decoy ${String(i).padStart(3, '0')}`,
      popularityScore: 10,
    }));
    const caller = await makeCaller([
      {
        externalId: seedId(),
        source: 'tmdb',
        mediaType: 'tv',
        title: 'Mad Men',
        popularityScore: 500,
      },
      ...decoys,
    ]);

    const results = await caller.search({ q: 'Mad Men' });

    expect(results.map((r) => r.title)).toContain('Mad Men');
    expect(results[0]?.title).toBe('Mad Men');
  });

  it('matches a title by its original (romanized) title', async () => {
    const caller = await makeCaller([
      {
        externalId: seedId(),
        source: 'anilist',
        mediaType: 'anime',
        title: 'Attack on Titan',
        originalTitle: 'Shingeki no Kyojin',
        popularityScore: 100,
      },
      {
        externalId: seedId(),
        source: 'tmdb',
        mediaType: 'film',
        title: 'Aaa Decoy',
        popularityScore: 5,
      },
    ]);

    const results = await caller.search({ q: 'Shingeki no Kyojin' });

    expect(results[0]?.title).toBe('Attack on Titan');
  });
});
