import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for `processTmdbTvShow`. Per CLAUDE.md §8.1 Approach B these tests are
 * written against the documented contract WITHOUT consulting the implementation
 * file body — only the exported signature is referenced.
 *
 * Mocking strategy:
 *  - `global.fetch` is stubbed via `vi.stubGlobal` so no real TMDB calls happen.
 *  - `@/server/db` is replaced with a chainable proxy recorder that captures
 *    every Drizzle-style call (`insert`, `delete`, `select`, `values`, `where`,
 *    `onConflictDoUpdate`, `onConflictDoNothing`, `returning`, `from`) and
 *    resolves to a configurable canned row array. We assert against the recorded
 *    call log to verify the mapped values reach the DB layer correctly.
 *  - `@/server/schema` table objects are replaced with simple sentinels so the
 *    SUT can pass them as the first argument of `db.insert()` / `db.delete()`
 *    without dragging in real Drizzle table metadata or a DB connection.
 */

// ---------------------------------------------------------------------------
// Schema-table sentinels — referentially identifiable so we can assert which
// table the SUT is writing to.
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
// Drizzle chain recorder.
//
// Every method on the recorder stores a `{ method, args }` entry in `calls` and
// returns the same proxy so chained calls work. When awaited (or when
// `.returning()` is awaited) the resolved value is taken from the queue
// `returningQueue` in FIFO order; if the queue is empty an empty array is
// returned. This lets each test stage canned responses for the DB writes it
// expects in the order they happen.
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

  // The chain proxy is both thenable (so `await db.insert(...)...` works
  // without an explicit `.returning()`) and chainable. Each method call appends
  // to `calls` and returns the same proxy.
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

  // Drizzle's relational-query API: `db.query.<tableName>.findFirst({...})`.
  // Each table name returns an object with `findFirst` / `findMany` methods
  // that consume from `findFirstQueue` / `returningQueue` respectively.
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
      // Return a fresh per-table proxy each access; behaviour is stateless.
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

// `inngest` is imported transitively by tmdb-sync.ts. The Inngest constructor
// is harmless at module load, but we don't want any real cron registration to
// fire side effects in tests. We let the real module load — there is no
// network call from `new Inngest({ id })` alone.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TMDB_TOKEN = 'test-token-not-real';

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
}

function setupFetch(responses: Array<{ ok: boolean; status: number; json: unknown }>): {
  calls: FetchCall[];
} {
  const calls: FetchCall[] = [];
  let i = 0;
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const r = responses[i++];
    if (!r) throw new Error(`Unexpected fetch call #${i}: ${url}`);
    return {
      ok: r.ok,
      status: r.status,
      json: async () => r.json,
    };
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls };
}

// `RequestInit.headers` is `HeadersInit` (a union of Headers / array / record).
// The SUT always passes a plain object literal, so this narrowing is safe; the
// cast is needed because the type system cannot prove that from RequestInit alone.
function getHeader(call: FetchCall | undefined, key: string): string | undefined {
  const headers = call?.init?.headers;
  if (
    !headers ||
    typeof headers !== 'object' ||
    Array.isArray(headers) ||
    headers instanceof Headers
  )
    return undefined;
  return (headers as Record<string, string>)[key];
}

interface TmdbDetailFixtureOverrides {
  id?: number;
  name?: string;
  original_name?: string;
  overview?: string;
  status?: string;
  first_air_date?: string;
  last_air_date?: string;
  number_of_episodes?: number;
  episode_run_time?: number[];
  poster_path?: string | null;
  backdrop_path?: string | null;
  popularity?: number;
  keywords?: { results: Array<{ id: number; name: string }> };
}

function tmdbDetailFixture(overrides: TmdbDetailFixtureOverrides = {}): Record<string, unknown> {
  return {
    id: 1399,
    name: 'Game of Thrones',
    original_name: 'Game of Thrones',
    overview: 'Seven noble families fight for control of the mythical land of Westeros.',
    status: 'Ended',
    first_air_date: '2011-04-17',
    last_air_date: '2019-05-19',
    number_of_episodes: 73,
    episode_run_time: [60],
    poster_path: '/abc.jpg',
    backdrop_path: '/def.jpg',
    popularity: 123.45,
    keywords: { results: [] },
    ...overrides,
  };
}

interface TmdbProvidersFixtureOverrides {
  results?: Record<string, unknown>;
}

function tmdbProvidersFixture(
  overrides: TmdbProvidersFixtureOverrides = {},
): Record<string, unknown> {
  return {
    id: 1399,
    results: overrides.results ?? {},
  };
}

type CapturedRow = Record<string, unknown>;

// Find every `values(...)` arg attached to a matching `insert(<table>)` call.
// The recorder stores call args as `unknown[]` because Drizzle's chain types
// vary per call — the cast to `CapturedRow | CapturedRow[]` is justified
// because the SUT only ever passes object literals or arrays of them; doing it
// in one place lets the call sites stay assertion-focused.
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

// Flatten nested arrays so callers can scan one flat list of rows regardless of
// whether the SUT inserted a single row or a batch.
function flattenRows(items: Array<CapturedRow | CapturedRow[]>): CapturedRow[] {
  return items.flatMap((v) => (Array.isArray(v) ? v : [v]));
}

beforeEach(() => {
  recorder.reset();
  process.env.TMDB_READ_ACCESS_TOKEN = TMDB_TOKEN;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

async function loadSut(): Promise<typeof import('./tmdb-sync')> {
  return import('./tmdb-sync');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('processTmdbTvShow', () => {
  it('calls the TMDB tv detail endpoint with a Bearer token and the keywords append param', async () => {
    const { calls: fetchCalls } = setupFetch([
      { ok: true, status: 200, json: tmdbDetailFixture() },
      { ok: true, status: 200, json: tmdbProvidersFixture() },
    ]);
    recorder.enqueueReturn([{ id: 'uuid-1' }]); // titles upsert

    const { processTmdbTvShow } = await loadSut();
    await processTmdbTvShow(1399);

    const detailCall = fetchCalls.find((c) => c.url.includes('/tv/1399?'));
    expect(detailCall).toBeDefined();
    expect(detailCall?.url).toContain('append_to_response=keywords');
    expect(detailCall?.url).toContain('language=en-US');
    expect(getHeader(detailCall, 'Authorization')).toBe(`Bearer ${TMDB_TOKEN}`);
    expect(getHeader(detailCall, 'accept')).toBe('application/json');
  });

  it('calls the TMDB watch-providers endpoint with the same Bearer auth', async () => {
    const { calls: fetchCalls } = setupFetch([
      { ok: true, status: 200, json: tmdbDetailFixture() },
      { ok: true, status: 200, json: tmdbProvidersFixture() },
    ]);
    recorder.enqueueReturn([{ id: 'uuid-1' }]);

    const { processTmdbTvShow } = await loadSut();
    await processTmdbTvShow(1399);

    const providersCall = fetchCalls.find((c) => c.url.includes('/tv/1399/watch/providers'));
    expect(providersCall).toBeDefined();
    expect(getHeader(providersCall, 'Authorization')).toBe(`Bearer ${TMDB_TOKEN}`);
  });

  it('throws when the TMDB detail response is non-2xx', async () => {
    setupFetch([
      { ok: false, status: 404, json: {} },
      { ok: true, status: 200, json: tmdbProvidersFixture() },
    ]);

    const { processTmdbTvShow } = await loadSut();
    await expect(processTmdbTvShow(1399)).rejects.toThrow(/TMDB.*404/);
  });

  it('throws when the TMDB providers response is non-2xx', async () => {
    setupFetch([
      { ok: true, status: 200, json: tmdbDetailFixture() },
      { ok: false, status: 500, json: {} },
    ]);

    const { processTmdbTvShow } = await loadSut();
    await expect(processTmdbTvShow(1399)).rejects.toThrow(/TMDB.*500/);
  });

  it('upserts a titles row with correctly mapped scalar fields', async () => {
    setupFetch([
      {
        ok: true,
        status: 200,
        json: tmdbDetailFixture({
          id: 1399,
          name: 'Game of Thrones',
          first_air_date: '2011-04-17',
          poster_path: '/poster.jpg',
          popularity: 42.5,
        }),
      },
      { ok: true, status: 200, json: tmdbProvidersFixture() },
    ]);
    recorder.enqueueReturn([{ id: 'uuid-1' }]);

    const { processTmdbTvShow } = await loadSut();
    await processTmdbTvShow(1399);

    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted).toBeDefined();
    expect(inserted?.externalId).toBe('1399');
    expect(inserted?.source).toBe('tmdb');
    expect(inserted?.mediaType).toBe('tv');
    expect(inserted?.title).toBe('Game of Thrones');
    expect(inserted?.releaseYear).toBe(2011);
    expect(inserted?.posterUrl).toBe('https://image.tmdb.org/t/p/w500/poster.jpg');
    expect(inserted?.popularityScore).toBe(42.5);
  });

  it("maps TMDB status 'Ended' to the 'completed' DB enum", async () => {
    setupFetch([
      {
        ok: true,
        status: 200,
        json: tmdbDetailFixture({ status: 'Ended', last_air_date: '2019-05-19' }),
      },
      { ok: true, status: 200, json: tmdbProvidersFixture() },
    ]);
    recorder.enqueueReturn([{ id: 'uuid-1' }]);

    const { processTmdbTvShow } = await loadSut();
    await processTmdbTvShow(1399);

    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.status).toBe('completed');
  });

  it("maps TMDB status 'Returning Series' to the 'ongoing' DB enum", async () => {
    setupFetch([
      { ok: true, status: 200, json: tmdbDetailFixture({ status: 'Returning Series' }) },
      { ok: true, status: 200, json: tmdbProvidersFixture() },
    ]);
    recorder.enqueueReturn([{ id: 'uuid-1' }]);

    const { processTmdbTvShow } = await loadSut();
    await processTmdbTvShow(1399);

    const [inserted] = flattenRows(findInsertValues(titlesTable));
    expect(inserted?.status).toBe('ongoing');
  });

  it('upserts a tags row with source=tmdb for each TMDB keyword', async () => {
    setupFetch([
      {
        ok: true,
        status: 200,
        json: tmdbDetailFixture({
          keywords: {
            results: [
              { id: 1, name: 'dragons' },
              { id: 2, name: 'medieval fantasy' },
            ],
          },
        }),
      },
      { ok: true, status: 200, json: tmdbProvidersFixture() },
    ]);
    // titles upsert returns id; then for each keyword: query.findFirst returns
    // undefined (so the function inserts), tags insert returns new id,
    // title_tags insert.
    recorder.enqueueReturn([{ id: 'title-uuid' }]); // titles upsert returning
    recorder.enqueueFindFirst(undefined); // query.tags.findFirst #1 → not found
    recorder.enqueueReturn([{ id: 'tag-uuid-1' }]); // tags insert returning #1
    recorder.enqueueReturn([]); // title_tags insert (no rows used)
    recorder.enqueueFindFirst(undefined); // query.tags.findFirst #2 → not found
    recorder.enqueueReturn([{ id: 'tag-uuid-2' }]); // tags insert returning #2
    recorder.enqueueReturn([]); // title_tags insert
    recorder.enqueueReturn([]); // delete streaming
    // No streaming inserts (results empty)

    const { processTmdbTvShow } = await loadSut();
    await processTmdbTvShow(1399);

    const tagRows = flattenRows(findInsertValues(tagsTable));
    expect(tagRows.length).toBeGreaterThanOrEqual(1);
    for (const row of tagRows) {
      expect(row.source).toBe('tmdb');
      expect(typeof row.name).toBe('string');
    }
    const insertedNames = tagRows.map((r) => r.name);
    expect(insertedNames).toContain('dragons');
    expect(insertedNames).toContain('medieval fantasy');
  });

  it("inserts a streaming_availability row with flatrate mapped to type='streaming'", async () => {
    setupFetch([
      { ok: true, status: 200, json: tmdbDetailFixture() },
      {
        ok: true,
        status: 200,
        json: tmdbProvidersFixture({
          results: {
            ZA: {
              link: 'https://www.themoviedb.org/tv/1399/watch?locale=ZA',
              flatrate: [
                {
                  provider_id: 8,
                  provider_name: 'Netflix',
                  logo_path: '/netflix.jpg',
                },
              ],
            },
          },
        }),
      },
    ]);
    recorder.enqueueReturn([{ id: 'title-uuid' }]); // titles upsert
    recorder.enqueueReturn([]); // delete streaming
    recorder.enqueueReturn([]); // streaming insert

    const { processTmdbTvShow } = await loadSut();
    await processTmdbTvShow(1399);

    const allRows = flattenRows(findInsertValues(streamingAvailabilityTable));
    expect(allRows.length).toBeGreaterThanOrEqual(1);
    const netflixZA = allRows.find((r) => r.countryCode === 'ZA' && r.providerName === 'Netflix');
    expect(netflixZA).toBeDefined();
    expect(netflixZA?.type).toBe('streaming');
    expect(netflixZA?.providerId).toBe('8');
    expect(netflixZA?.providerLogoUrl).toBe('https://image.tmdb.org/t/p/w500/netflix.jpg');
    expect(netflixZA?.sourceUrl).toBe('https://www.themoviedb.org/tv/1399/watch?locale=ZA');
  });

  it('inserts no streaming_availability rows when providers.results is empty', async () => {
    setupFetch([
      { ok: true, status: 200, json: tmdbDetailFixture() },
      { ok: true, status: 200, json: tmdbProvidersFixture({ results: {} }) },
    ]);
    recorder.enqueueReturn([{ id: 'title-uuid' }]); // titles upsert
    recorder.enqueueReturn([]); // delete streaming

    const { processTmdbTvShow } = await loadSut();
    await processTmdbTvShow(1399);

    const streamingInserts = findInsertValues(streamingAvailabilityTable);
    expect(streamingInserts.length).toBe(0);
  });

  it('inserts no tags or title_tags rows when keywords.results is empty', async () => {
    setupFetch([
      {
        ok: true,
        status: 200,
        json: tmdbDetailFixture({ keywords: { results: [] } }),
      },
      { ok: true, status: 200, json: tmdbProvidersFixture({ results: {} }) },
    ]);
    recorder.enqueueReturn([{ id: 'title-uuid' }]); // titles upsert
    recorder.enqueueReturn([]); // delete streaming

    const { processTmdbTvShow } = await loadSut();
    await processTmdbTvShow(1399);

    expect(findInsertValues(tagsTable).length).toBe(0);
    expect(findInsertValues(titleTagsTable).length).toBe(0);
  });

  it('returns the upserted title UUID on success', async () => {
    setupFetch([
      { ok: true, status: 200, json: tmdbDetailFixture() },
      { ok: true, status: 200, json: tmdbProvidersFixture() },
    ]);
    recorder.enqueueReturn([{ id: 'returned-title-uuid' }]); // titles upsert

    const { processTmdbTvShow } = await loadSut();
    const result = await processTmdbTvShow(1399);

    expect(result).toBe('returned-title-uuid');
  });

  it('returns null when the titles upsert produces no row', async () => {
    setupFetch([
      { ok: true, status: 200, json: tmdbDetailFixture() },
      { ok: true, status: 200, json: tmdbProvidersFixture() },
    ]);
    recorder.enqueueReturn([]); // titles upsert returns no rows

    const { processTmdbTvShow } = await loadSut();
    const result = await processTmdbTvShow(1399);

    expect(result).toBeNull();
  });
});
