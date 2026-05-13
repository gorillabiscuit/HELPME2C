import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for `processAnilistMedia`. Per CLAUDE.md §8.1 Approach B these tests
 * are written by a sub-agent against the documented contract and the exported
 * type signature, with the goal of verifying behaviour without rubber-stamping
 * the implementation.
 *
 * Mocking strategy mirrors `tmdb-sync.test.ts`:
 *  - `@/server/schema` table objects are replaced with sentinels so the SUT
 *    can pass them as the first argument to `db.insert()` without dragging in
 *    real Drizzle table metadata.
 *  - `@/server/db` is replaced with a chainable proxy recorder that captures
 *    every Drizzle-style call and resolves to a configurable canned row array.
 *  - `global.fetch` is stubbed via `vi.stubGlobal` so no real AniList GraphQL
 *    calls happen — `processAnilistMedia` itself takes a media object directly
 *    and does not call fetch, but stubbing keeps the safety net in place.
 */

// ---------------------------------------------------------------------------
// Schema-table sentinels
// ---------------------------------------------------------------------------
const titlesTable = { __table: 'titles' } as const;
const tagsTable = { __table: 'tags' } as const;
const titleTagsTable = { __table: 'title_tags' } as const;
const streamingAvailabilityTable = { __table: 'streaming_availability' } as const;

vi.mock('@/server/schema', () => ({
  titles: titlesTable,
  tags: tagsTable,
  titleTags: titleTagsTable,
  streamingAvailability: streamingAvailabilityTable,
}));

// ---------------------------------------------------------------------------
// Drizzle chain recorder. Copied (with light renaming) from
// `tmdb-sync.test.ts` — duplicating ~80 lines is cheaper than introducing a
// shared test-helper module just for two callers.
// ---------------------------------------------------------------------------
interface CallEntry {
  method: string;
  args: unknown[];
}

interface DbRecorder {
  calls: CallEntry[];
  returningQueue: unknown[][];
  findFirstQueue: Array<unknown | undefined>;
  reset(): void;
  enqueueReturn(rows: unknown[]): void;
  enqueueFindFirst(row: unknown | undefined): void;
}

function createDbRecorder(): { db: unknown; recorder: DbRecorder } {
  const calls: CallEntry[] = [];
  const returningQueue: unknown[][] = [];
  const findFirstQueue: Array<unknown | undefined> = [];

  const chainHandler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (value: unknown) => void) => {
          const rows = returningQueue.shift() ?? [];
          resolve(rows);
        };
      }
      if (prop === 'query') {
        return queryProxy;
      }
      if (typeof prop === 'symbol') {
        return undefined;
      }
      return (...args: unknown[]) => {
        calls.push({ method: prop, args });
        return chainProxy;
      };
    },
  };

  const tableQueryHandler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'findFirst') {
        return (...args: unknown[]) => {
          calls.push({ method: 'query.findFirst', args });
          return Promise.resolve(findFirstQueue.shift());
        };
      }
      if (prop === 'findMany') {
        return (...args: unknown[]) => {
          calls.push({ method: 'query.findMany', args });
          return Promise.resolve(returningQueue.shift() ?? []);
        };
      }
      return undefined;
    },
  };

  const queryHandler: ProxyHandler<object> = {
    get(_target, prop) {
      if (typeof prop === 'symbol') return undefined;
      return new Proxy({ __tableName: prop }, tableQueryHandler);
    },
  };

  const queryProxy: unknown = new Proxy({}, queryHandler);
  const chainProxy: unknown = new Proxy({}, chainHandler);

  const recorder: DbRecorder = {
    calls,
    returningQueue,
    findFirstQueue,
    reset() {
      calls.length = 0;
      returningQueue.length = 0;
      findFirstQueue.length = 0;
    },
    enqueueReturn(rows) {
      returningQueue.push(rows);
    },
    enqueueFindFirst(row) {
      findFirstQueue.push(row);
    },
  };

  return { db: chainProxy, recorder };
}

const { db: mockDb, recorder } = createDbRecorder();

vi.mock('@/server/db', () => ({
  db: mockDb,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type CapturedRow = Record<string, unknown>;

// Find every `values(...)` arg attached to a matching `insert(<table>)` call.
// The cast to `CapturedRow | CapturedRow[]` is justified because the SUT only
// ever passes object literals or arrays of them.
function findInsertValues(table: object): Array<CapturedRow | CapturedRow[]> {
  const values: Array<CapturedRow | CapturedRow[]> = [];
  for (let idx = 0; idx < recorder.calls.length; idx++) {
    const call = recorder.calls[idx];
    if (call?.method === 'insert' && call.args[0] === table) {
      for (let j = idx + 1; j < recorder.calls.length; j++) {
        const next = recorder.calls[j];
        if (!next) break;
        if (next.method === 'values') {
          values.push(next.args[0] as CapturedRow | CapturedRow[]);
          break;
        }
        if (next.method === 'insert' || next.method === 'delete' || next.method === 'select') {
          break;
        }
      }
    }
  }
  return values;
}

function flattenRows(items: Array<CapturedRow | CapturedRow[]>): CapturedRow[] {
  return items.flatMap((v) => (Array.isArray(v) ? v : [v]));
}

// AniList media fixture. Defaults model a fully-populated FINISHED show with
// a couple of tags so the typical happy-path can be reached with no overrides.
interface AniListTagFixture {
  id: number;
  name: string;
  category: string | null;
  rank: number;
  isMediaSpoiler: boolean;
  description: string | null;
}

interface AniListMediaFixture {
  id: number;
  idMal: number | null;
  title: { romaji: string | null; english: string | null; native: string | null };
  description: string | null;
  status: 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS' | null;
  startDate: { year: number | null };
  endDate: { year: number | null };
  episodes: number | null;
  duration: number | null;
  coverImage: { extraLarge: string | null; large: string | null };
  bannerImage: string | null;
  popularity: number;
  trailer: { id: string | null; site: string | null } | null;
  tags: AniListTagFixture[];
}

interface AniListMediaOverrides {
  id?: number;
  idMal?: number | null;
  title?: Partial<AniListMediaFixture['title']>;
  description?: string | null;
  status?: AniListMediaFixture['status'];
  startDate?: { year: number | null };
  endDate?: { year: number | null };
  episodes?: number | null;
  duration?: number | null;
  coverImage?: Partial<AniListMediaFixture['coverImage']>;
  bannerImage?: string | null;
  popularity?: number;
  tags?: AniListTagFixture[];
}

function anilistMediaFixture(overrides: AniListMediaOverrides = {}): AniListMediaFixture {
  // Pull nested-merge fields out of `overrides` so the spread below doesn't
  // clobber them; we then write the merged values explicitly. Avoids the
  // duplicate-key footgun of `{ a: defaultA, ...overrides, a: mergedA }`.
  const { title: titleOverride, coverImage: coverOverride, ...rest } = overrides;
  const base: AniListMediaFixture = {
    id: 21,
    idMal: 21,
    title: { romaji: 'One Piece', english: 'ONE PIECE', native: 'ワンピース' },
    description: 'Pirates seek the One Piece.',
    status: 'FINISHED',
    startDate: { year: 1999 },
    endDate: { year: 2024 },
    episodes: 1000,
    duration: 24,
    coverImage: {
      extraLarge: 'https://example.test/extra.jpg',
      large: 'https://example.test/large.jpg',
    },
    bannerImage: 'https://example.test/banner.jpg',
    popularity: 555_000,
    trailer: null,
    tags: [
      {
        id: 100,
        name: 'Pirates',
        category: 'Theme-Other',
        rank: 95,
        isMediaSpoiler: false,
        description: 'Stories about pirates.',
      },
      {
        id: 101,
        name: 'Adventure',
        category: 'Cast-Main Cast',
        rank: 80,
        isMediaSpoiler: false,
        description: null,
      },
    ],
  };
  return {
    ...base,
    ...rest,
    title: { ...base.title, ...(titleOverride ?? {}) },
    coverImage: { ...base.coverImage, ...(coverOverride ?? {}) },
  };
}

beforeEach(() => {
  recorder.reset();
  // Belt-and-braces: stub fetch with a thrower so any accidental network call
  // becomes a test failure rather than a flaky outbound request.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      throw new Error('fetch should not be called by processAnilistMedia');
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function loadSut(): Promise<typeof import('./anilist-sync')> {
  return import('./anilist-sync');
}

// Helper: stage canned returns for a process call with the given number of
// tags. Order: 1× titles upsert returning, then per tag 1× tags upsert
// returning, then 1× title_tags insert (only if at least one tag).
function stageHappyPath(opts: {
  titleUuid: string | null;
  tagUuids: Array<string | null>; // null means tags upsert returned no row
}): void {
  recorder.enqueueReturn(opts.titleUuid === null ? [] : [{ id: opts.titleUuid }]);
  for (const tagId of opts.tagUuids) {
    recorder.enqueueReturn(tagId === null ? [] : [{ id: tagId }]);
  }
  // The title_tags batch insert is awaited but its return is ignored — still
  // need a queue slot so the recorder doesn't return undefined.
  recorder.enqueueReturn([]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('processAnilistMedia', () => {
  // Contract A — title row scalar mapping ----------------------------------
  it('upserts a titles row with correctly mapped scalar fields', async () => {
    stageHappyPath({ titleUuid: 'title-uuid', tagUuids: ['tag-1', 'tag-2'] });

    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(
      anilistMediaFixture({
        id: 21,
        idMal: 21,
        startDate: { year: 1999 },
        endDate: { year: 2024 },
        episodes: 1000,
        duration: 24,
        bannerImage: 'https://example.test/banner.jpg',
        popularity: 555_000,
      }),
    );

    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted).toBeDefined();
    expect(inserted?.externalId).toBe('21');
    expect(inserted?.source).toBe('anilist');
    expect(inserted?.mediaType).toBe('anime');
    expect(inserted?.releaseYear).toBe(1999);
    expect(inserted?.episodeCount).toBe(1000);
    expect(inserted?.episodeDurationMinutes).toBe(24);
    expect(inserted?.backdropUrl).toBe('https://example.test/banner.jpg');
    expect(inserted?.popularityScore).toBe(555_000);
  });

  // Contract H — display-name fallback -------------------------------------
  it('uses the english title when present', async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(
      anilistMediaFixture({
        title: { english: 'ONE PIECE', romaji: 'One Piece', native: 'ワンピース' },
      }),
    );
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.title).toBe('ONE PIECE');
  });

  it('falls back to romaji when english is null', async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(
      anilistMediaFixture({
        title: { english: null, romaji: 'Shingeki no Kyojin', native: '進撃の巨人' },
      }),
    );
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.title).toBe('Shingeki no Kyojin');
  });

  it('falls back to native when english and romaji are null', async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(
      anilistMediaFixture({
        title: { english: null, romaji: null, native: '進撃の巨人' },
      }),
    );
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.title).toBe('進撃の巨人');
  });

  it('falls back to "AniList #<id>" when all three title variants are null', async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(
      anilistMediaFixture({
        id: 9999,
        title: { english: null, romaji: null, native: null },
      }),
    );
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.title).toBe('AniList #9999');
  });

  // Contract I — original-title de-dup -------------------------------------
  it('stores native as originalTitle when distinct from the display title', async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(
      anilistMediaFixture({
        title: { english: 'ONE PIECE', romaji: 'One Piece', native: 'ワンピース' },
      }),
    );
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.originalTitle).toBe('ワンピース');
  });

  it('stores null originalTitle when native is identical to the display title', async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(
      anilistMediaFixture({
        title: { english: 'Pluto', romaji: 'Pluto', native: 'Pluto' },
      }),
    );
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.originalTitle).toBeNull();
  });

  it('stores null originalTitle when native is null', async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(
      anilistMediaFixture({ title: { english: 'X', romaji: 'X', native: null } }),
    );
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.originalTitle).toBeNull();
  });

  // Contract F — synopsis HTML stripping ------------------------------------
  it('strips HTML tags and decodes entities in the synopsis', async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(
      anilistMediaFixture({
        description:
          '<i>Eren</i> &amp; friends fight titans.<br>Season 1 &lt;spoilers&gt; &nbsp;&#39;lol&#39;',
      }),
    );
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.synopsis).toBe("Eren & friends fight titans.\nSeason 1 <spoilers>  'lol'");
  });

  it('stores null synopsis when description is null', async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(anilistMediaFixture({ description: null }));
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.synopsis).toBeNull();
  });

  // Contract E / G — status enum mapping ------------------------------------
  it("maps AniList status 'FINISHED' to the 'completed' DB enum", async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(anilistMediaFixture({ status: 'FINISHED' }));
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.status).toBe('completed');
  });

  it("maps AniList status 'RELEASING' to the 'ongoing' DB enum", async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(anilistMediaFixture({ status: 'RELEASING' }));
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.status).toBe('ongoing');
  });

  it("maps AniList status 'HIATUS' to the 'ongoing' DB enum", async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(anilistMediaFixture({ status: 'HIATUS' }));
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.status).toBe('ongoing');
  });

  it("maps AniList status 'CANCELLED' to the 'cancelled' DB enum", async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(anilistMediaFixture({ status: 'CANCELLED' }));
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.status).toBe('cancelled');
  });

  it("maps AniList status 'NOT_YET_RELEASED' to the 'upcoming' DB enum", async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(anilistMediaFixture({ status: 'NOT_YET_RELEASED' }));
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.status).toBe('upcoming');
  });

  it('maps a null AniList status to a null DB status', async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(anilistMediaFixture({ status: null }));
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.status).toBeNull();
  });

  // Contract K — endYear gating --------------------------------------------
  it('writes endYear when status is FINISHED and endDate.year is set', async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(anilistMediaFixture({ status: 'FINISHED', endDate: { year: 2024 } }));
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.endYear).toBe(2024);
  });

  it('writes null endYear for a RELEASING show even if endDate.year is set', async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(
      anilistMediaFixture({ status: 'RELEASING', endDate: { year: 2026 } }),
    );
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.endYear).toBeNull();
  });

  it('writes null endYear for a HIATUS show even if endDate.year is set', async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(anilistMediaFixture({ status: 'HIATUS', endDate: { year: 2026 } }));
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.endYear).toBeNull();
  });

  // Contract L — idMal pass-through ----------------------------------------
  it('passes idMal through to the titles row when populated', async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(anilistMediaFixture({ idMal: 21 }));
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.idMal).toBe(21);
  });

  it('passes idMal through as null when AniList does not know one', async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(anilistMediaFixture({ idMal: null }));
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.idMal).toBeNull();
  });

  // Poster fallback (extraLarge → large) ------------------------------------
  it('prefers coverImage.extraLarge for posterUrl', async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(
      anilistMediaFixture({
        coverImage: { extraLarge: 'https://x.test/xl.jpg', large: 'https://x.test/lg.jpg' },
      }),
    );
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.posterUrl).toBe('https://x.test/xl.jpg');
  });

  it('falls back to coverImage.large when extraLarge is null', async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(
      anilistMediaFixture({
        coverImage: { extraLarge: null, large: 'https://x.test/lg.jpg' },
      }),
    );
    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.posterUrl).toBe('https://x.test/lg.jpg');
  });

  // Contract B — tag upserts ------------------------------------------------
  it('upserts a tags row with source=anilist for each AniList tag', async () => {
    stageHappyPath({ titleUuid: 'uuid', tagUuids: ['tag-uuid-1', 'tag-uuid-2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(
      anilistMediaFixture({
        tags: [
          {
            id: 1,
            name: 'Pirates',
            category: 'Theme-Other',
            rank: 95,
            isMediaSpoiler: false,
            description: 'Pirates desc',
          },
          {
            id: 2,
            name: 'Adventure',
            category: 'Cast-Main Cast',
            rank: 80,
            isMediaSpoiler: false,
            description: null,
          },
        ],
      }),
    );

    const tagRows = flattenRows(findInsertValues(tagsTable));
    expect(tagRows.length).toBe(2);
    for (const row of tagRows) {
      expect(row.source).toBe('anilist');
    }
    const names = tagRows.map((r) => r.name);
    expect(names).toContain('Pirates');
    expect(names).toContain('Adventure');
    const piratesRow = tagRows.find((r) => r.name === 'Pirates');
    expect(piratesRow?.category).toBe('Theme-Other');
    expect(piratesRow?.description).toBe('Pirates desc');
  });

  // Contract C / J — title_tags weight passes through ---------------------
  it('writes title_tags.weight as the AniList tag rank, not 100', async () => {
    stageHappyPath({ titleUuid: 'title-uuid', tagUuids: ['tag-1', 'tag-2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(
      anilistMediaFixture({
        tags: [
          {
            id: 1,
            name: 'Pirates',
            category: null,
            rank: 95,
            isMediaSpoiler: false,
            description: null,
          },
          {
            id: 2,
            name: 'Adventure',
            category: null,
            rank: 73,
            isMediaSpoiler: false,
            description: null,
          },
        ],
      }),
    );

    const titleTagRows = flattenRows(findInsertValues(titleTagsTable));
    expect(titleTagRows.length).toBe(2);
    const weights = titleTagRows.map((r) => r.weight).sort((a, b) => Number(a) - Number(b));
    expect(weights).toEqual([73, 95]);
    // None of them should be 100 — that's the TMDB convention, not AniList's.
    expect(titleTagRows.every((r) => r.weight !== 100)).toBe(true);
  });

  // Contract C — isSpoiler passthrough --------------------------------------
  it('writes title_tags.isSpoiler from tag.isMediaSpoiler', async () => {
    stageHappyPath({ titleUuid: 'title-uuid', tagUuids: ['tag-1', 'tag-2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(
      anilistMediaFixture({
        tags: [
          {
            id: 1,
            name: 'Pirates',
            category: null,
            rank: 95,
            isMediaSpoiler: false,
            description: null,
          },
          {
            id: 2,
            name: 'Major Twist',
            category: null,
            rank: 60,
            isMediaSpoiler: true,
            description: null,
          },
        ],
      }),
    );

    const titleTagRows = flattenRows(findInsertValues(titleTagsTable));
    const piratesJoin = titleTagRows.find((r) => r.weight === 95);
    const twistJoin = titleTagRows.find((r) => r.weight === 60);
    expect(piratesJoin?.isSpoiler).toBe(false);
    expect(twistJoin?.isSpoiler).toBe(true);
  });

  it('uses the upserted title id as titleId on every title_tags row', async () => {
    stageHappyPath({ titleUuid: 'expected-title-uuid', tagUuids: ['tag-1', 'tag-2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(anilistMediaFixture());

    const titleTagRows = flattenRows(findInsertValues(titleTagsTable));
    expect(titleTagRows.length).toBe(2);
    for (const row of titleTagRows) {
      expect(row.titleId).toBe('expected-title-uuid');
    }
  });

  // Contract C — skip rows whose tag upsert produced no row -----------------
  it('skips title_tags rows for tags whose upsert returned no row', async () => {
    // First tag upsert returns no row → its id is missing from the map and
    // the corresponding title_tags row should be filtered out. Second tag
    // upserts normally.
    stageHappyPath({ titleUuid: 'title-uuid', tagUuids: [null, 'tag-2'] });
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(
      anilistMediaFixture({
        tags: [
          {
            id: 1,
            name: 'Pirates',
            category: null,
            rank: 95,
            isMediaSpoiler: false,
            description: null,
          },
          {
            id: 2,
            name: 'Adventure',
            category: null,
            rank: 80,
            isMediaSpoiler: false,
            description: null,
          },
        ],
      }),
    );

    const titleTagRows = flattenRows(findInsertValues(titleTagsTable));
    expect(titleTagRows.length).toBe(1);
    expect(titleTagRows[0]?.tagId).toBe('tag-2');
    expect(titleTagRows[0]?.weight).toBe(80);
  });

  // Contract C — empty tag list short-circuits -----------------------------
  it('inserts no title_tags rows when the AniList tag list is empty', async () => {
    // Only a titles upsert is staged because no tags means no tag inserts
    // and no title_tags insert.
    recorder.enqueueReturn([{ id: 'title-uuid' }]);
    const { processAnilistMedia } = await loadSut();
    await processAnilistMedia(anilistMediaFixture({ tags: [] }));

    expect(findInsertValues(tagsTable).length).toBe(0);
    expect(findInsertValues(titleTagsTable).length).toBe(0);
  });

  // Contract D — return value ----------------------------------------------
  it('returns the upserted title UUID on success', async () => {
    stageHappyPath({ titleUuid: 'returned-uuid', tagUuids: ['t1', 't2'] });
    const { processAnilistMedia } = await loadSut();
    const result = await processAnilistMedia(anilistMediaFixture());
    expect(result).toBe('returned-uuid');
  });

  it('returns null when the titles upsert produces no row', async () => {
    // No tag work happens because the function returns early when the title
    // upsert returns nothing.
    recorder.enqueueReturn([]);
    const { processAnilistMedia } = await loadSut();
    const result = await processAnilistMedia(anilistMediaFixture());
    expect(result).toBeNull();
    // Confirm it short-circuited before tag upserts.
    expect(findInsertValues(tagsTable).length).toBe(0);
    expect(findInsertValues(titleTagsTable).length).toBe(0);
  });
});
