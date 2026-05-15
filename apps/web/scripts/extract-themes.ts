// LLM theme extraction — standalone CLI path for local one-offs and
// smoke tests. The production durable path is the Inngest function at
// apps/web/src/inngest/functions/extract-themes.ts; both use the same
// shared extraction logic in src/server/themes/extract.ts.
//
// Why keep this script: convenient for inspecting output on a small
// sample without bouncing through the Inngest dev server, and useful
// when Inngest infrastructure is unavailable.
//
// Run with:
//   pnpm dlx tsx --env-file=.env.local scripts/extract-themes.ts
//   # Optional flags:
//   THEMES_LIMIT=10 ...        → only process 10 titles (smoke test)
//   THEMES_FORCE=yes ...       → re-extract titles that already have themes
//   THEMES_MEDIA_TYPE=film ... → restrict to a single media_type

import Anthropic from '@anthropic-ai/sdk';
import { neon } from '@neondatabase/serverless';
import { processCandidate, type CandidateTitle } from '../src/server/themes/extract';

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY in env');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL!);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CONCURRENCY = 3;
const LIMIT = process.env.THEMES_LIMIT ? parseInt(process.env.THEMES_LIMIT) : Infinity;
const FORCE = process.env.THEMES_FORCE === 'yes';
const MEDIA_TYPE_FILTER = process.env.THEMES_MEDIA_TYPE;

type Row = {
  id: string;
  title: string;
  media_type: 'tv' | 'film' | 'anime';
  synopsis: string | null;
  release_year: number | null;
};

async function loadCandidates(): Promise<CandidateTitle[]> {
  const limit = Number.isFinite(LIMIT) ? LIMIT : 100000;
  const mediaType = MEDIA_TYPE_FILTER ?? null;
  let rows: Row[];
  if (FORCE && mediaType) {
    rows = (await sql`
      SELECT id, title, media_type, synopsis, release_year
      FROM titles
      WHERE synopsis IS NOT NULL AND media_type = ${mediaType}
      ORDER BY popularity_score DESC NULLS LAST
      LIMIT ${limit}
    `) as Row[];
  } else if (FORCE) {
    rows = (await sql`
      SELECT id, title, media_type, synopsis, release_year
      FROM titles
      WHERE synopsis IS NOT NULL
      ORDER BY popularity_score DESC NULLS LAST
      LIMIT ${limit}
    `) as Row[];
  } else if (mediaType) {
    rows = (await sql`
      SELECT id, title, media_type, synopsis, release_year
      FROM titles t
      WHERE synopsis IS NOT NULL AND media_type = ${mediaType}
        AND NOT EXISTS (SELECT 1 FROM title_themes tt WHERE tt.title_id = t.id)
      ORDER BY popularity_score DESC NULLS LAST
      LIMIT ${limit}
    `) as Row[];
  } else {
    rows = (await sql`
      SELECT id, title, media_type, synopsis, release_year
      FROM titles t
      WHERE synopsis IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM title_themes tt WHERE tt.title_id = t.id)
      ORDER BY popularity_score DESC NULLS LAST
      LIMIT ${limit}
    `) as Row[];
  }
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    mediaType: r.media_type,
    synopsis: r.synopsis,
    releaseYear: r.release_year,
  }));
}

async function main() {
  console.log('Loading candidates...');
  const titles = await loadCandidates();
  console.log(
    `${titles.length} titles to extract (force=${FORCE}, media=${MEDIA_TYPE_FILTER ?? 'all'}, limit=${LIMIT})`,
  );

  if (titles.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const t0 = Date.now();
  let ok = 0;
  let empty = 0;
  let failed = 0;

  // Lower concurrency than the prior 8: Tier 1 Anthropic rate limit
  // (50K input TPM) saturates fast with the ~1.7k-token prompt. 3 is
  // empirically safe; prompt caching makes subsequent calls cheaper.
  for (let i = 0; i < titles.length; i += CONCURRENCY) {
    const window = titles.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      window.map((t) => processCandidate(t, anthropic, sql)),
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const t = window[j];
      if (!r || !t) continue;
      if (r.status === 'rejected') {
        failed += 1;
        console.error(`  fail: ${t.title} — ${r.reason}`);
        continue;
      }
      const v = r.value;
      if (v.ok) {
        ok += 1;
      } else if (v.empty) {
        empty += 1;
      } else {
        failed += 1;
        if (v.error) console.error(`  ${t.title} → ${v.error}`);
      }
      if (Number.isFinite(LIMIT) && LIMIT <= 50 && v.slugs.length > 0) {
        console.log(`  ${t.title} (${t.mediaType}) → ${v.slugs.join(', ')}`);
      }
    }
    if ((i + CONCURRENCY) % 60 === 0 || i + CONCURRENCY >= titles.length) {
      console.log(
        `  progress: ${i + window.length}/${titles.length} (${ok} ok, ${empty} empty, ${failed} fail)`,
      );
    }
  }
  const dt = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\nDone: ${ok} extracted, ${empty} empty, ${failed} failed in ${dt}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
