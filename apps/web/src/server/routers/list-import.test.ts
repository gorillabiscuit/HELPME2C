import { TRPCError } from '@trpc/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for `listImportRouter`. Per CLAUDE.md §8.1 Approach B these tests are
 * written by a sub-agent against the documented contract — score-normalisation
 * across AniList's five scoring systems is the meatiest behaviour and gets
 * its own table-driven block.
 *
 * Mocking strategy mirrors the inngest-function tests:
 *  - `@/server/schema` table objects → sentinel objects with column-property
 *    accessors so the SUT can pass them to `db.insert()` / `eq(table.col, …)`.
 *  - `@/server/db` is replaced with a chainable proxy recorder — but the
 *    router actually receives `db` via `ctx.db`, so it's the recorder we pass
 *    into `createCaller`. The module-level mock just keeps the import graph
 *    happy.
 *  - `@/server/lib/resolve-user` returns a fixed internal uuid so the router's
 *    Clerk-id → users.id lookup never hits the recorder.
 *  - `@/inngest/client` exposes a vi.fn() `inngest.send` so we can assert the
 *    recompute event firing rule.
 *  - `global.fetch` is stubbed per-test for the AniList GraphQL call.
 */

// ---------------------------------------------------------------------------
// Schema-table sentinels. Column accessors are sentinel objects too so the SUT
// can pass them to `eq(titles.id, …)` etc.
// ---------------------------------------------------------------------------
function makeTableSentinel(name: string, cols: string[]): Record<string, unknown> {
  const table: Record<string, unknown> = { __table: name };
  for (const c of cols) {
    table[c] = { __col: `${name}.${c}` };
  }
  return table;
}

const titlesTable = makeTableSentinel('titles', [
  'id',
  'externalId',
  'idMal',
  'source',
  'mediaType',
]);
const watchEntriesTable = makeTableSentinel('watch_entries', [
  'id',
  'userId',
  'titleId',
  'kind',
  'status',
  'rating',
  'currentEpisode',
]);
const usersTable = makeTableSentinel('users', ['id', 'clerkId']);

vi.mock('@/server/schema', () => ({
  titles: titlesTable,
  watchEntries: watchEntriesTable,
  users: usersTable,
}));

// ---------------------------------------------------------------------------
// resolveInternalUserId mock — returns a fixed uuid so we don't have to stage
// a users.select() return value on the recorder.
// ---------------------------------------------------------------------------
const INTERNAL_USER_ID = 'internal-uuid-1';
const resolveInternalUserIdMock = vi.fn(async () => INTERNAL_USER_ID as string | null);

vi.mock('@/server/lib/resolve-user', () => ({
  resolveInternalUserId: resolveInternalUserIdMock,
}));

// ---------------------------------------------------------------------------
// Inngest client mock — observe `inngest.send` calls and the event creator.
// ---------------------------------------------------------------------------
const inngestSendMock = vi.fn(async () => undefined);
const recommendUserEventCreate = vi.fn((data: unknown) => ({
  name: 'recommend/user.recompute',
  data,
}));

vi.mock('@/inngest/client', () => ({
  inngest: { send: inngestSendMock },
  recommendUserEvent: { create: recommendUserEventCreate },
  // Other re-exports the router doesn't touch but the module would otherwise
  // expose. Keeping the surface narrow.
}));

// ---------------------------------------------------------------------------
// Drizzle chain recorder. Same shape as the inngest-function test recorders.
// ---------------------------------------------------------------------------
interface CallEntry {
  method: string;
  args: unknown[];
}

interface DbRecorder {
  calls: CallEntry[];
  returningQueue: unknown[][];
  reset(): void;
  enqueueReturn(rows: unknown[]): void;
}

function createDbRecorder(): { db: unknown; recorder: DbRecorder } {
  const calls: CallEntry[] = [];
  const returningQueue: unknown[][] = [];

  const chainHandler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (value: unknown) => void) => {
          const rows = returningQueue.shift() ?? [];
          resolve(rows);
        };
      }
      if (typeof prop === 'symbol') return undefined;
      return (...args: unknown[]) => {
        calls.push({ method: prop, args });
        return chainProxy;
      };
    },
  };

  const chainProxy: unknown = new Proxy({}, chainHandler);

  const recorder: DbRecorder = {
    calls,
    returningQueue,
    reset() {
      calls.length = 0;
      returningQueue.length = 0;
    },
    enqueueReturn(rows) {
      returningQueue.push(rows);
    },
  };

  return { db: chainProxy, recorder };
}

const { db: mockDb, recorder } = createDbRecorder();

// The module-level `@/server/db` mock keeps any transitive `import { db }`
// callers (none in the router itself, but defence-in-depth) from blowing up
// at module load.
vi.mock('@/server/db', () => ({ db: mockDb }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type CapturedRow = Record<string, unknown>;

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

function findOnConflictUpdates(): CapturedRow[] {
  // Returns the `set` arg from each onConflictDoUpdate call, in order.
  const results: CapturedRow[] = [];
  for (const call of recorder.calls) {
    if (call.method === 'onConflictDoUpdate') {
      const arg = call.args[0] as { set?: CapturedRow } | undefined;
      if (arg?.set) results.push(arg.set);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------
interface AniListEntry {
  mediaId: number;
  status: string;
  score: number;
  progress: number;
}

interface AniListGraphQLResponse {
  data?: {
    MediaListCollection: {
      user: { mediaListOptions: { scoreFormat: string } } | null;
      lists: Array<{ entries: AniListEntry[] }>;
    };
  };
  errors?: Array<{ message: string }>;
}

function anilistResponse(opts: {
  entries?: AniListEntry[];
  scoreFormat?: string | null;
}): AniListGraphQLResponse {
  return {
    data: {
      MediaListCollection: {
        user:
          opts.scoreFormat === null
            ? null
            : { mediaListOptions: { scoreFormat: opts.scoreFormat ?? 'POINT_10' } },
        lists: [{ entries: opts.entries ?? [] }],
      },
    },
  };
}

function setupFetch(impl: () => Promise<unknown> | unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      const result = await impl();
      return result;
    }),
  );
}

function okJsonResponse(body: unknown): Response {
  // Casting to Response is safe because the SUT only reads `.ok`, `.status`,
  // and `.json()` — the structural duck shape we provide.
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as unknown as Response;
}

function errorJsonResponse(status: number, body: unknown = {}): Response {
  // Same Response-cast rationale as okJsonResponse above.
  return {
    ok: false,
    status,
    json: async () => body,
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Build a caller from the actual router under test, with our recorder db and a
// fixed clerk userId. The `@/server/db` mock above guarantees the router's own
// imports resolve cleanly; passing the recorder via createCaller means every
// `ctx.db` call lands on the recorder.
// ---------------------------------------------------------------------------
async function makeCaller(): Promise<{
  caller: ReturnType<typeof import('./list-import').listImportRouter.createCaller>;
}> {
  const { listImportRouter } = await import('./list-import');
  const caller = listImportRouter.createCaller({
    db: mockDb as never,
    userId: 'clerk-user-1',
  });
  return { caller };
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
beforeEach(() => {
  recorder.reset();
  inngestSendMock.mockClear();
  recommendUserEventCreate.mockClear();
  resolveInternalUserIdMock.mockReset();
  resolveInternalUserIdMock.mockResolvedValue(INTERNAL_USER_ID);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tests — fromAnilist
// ---------------------------------------------------------------------------
describe('listImportRouter.fromAnilist — happy path (Contract A)', () => {
  it('returns imported/skipped/total counts for a successful import', async () => {
    setupFetch(() =>
      okJsonResponse(
        anilistResponse({
          scoreFormat: 'POINT_10',
          entries: [
            { mediaId: 21, status: 'CURRENT', score: 8, progress: 12 },
            { mediaId: 22, status: 'COMPLETED', score: 10, progress: 100 },
          ],
        }),
      ),
    );
    // titles SELECT — both ids matched.
    recorder.enqueueReturn([
      { id: 'title-uuid-21', externalId: '21' },
      { id: 'title-uuid-22', externalId: '22' },
    ]);
    // First entry: existing watch_entries select returns nothing, then insert.
    recorder.enqueueReturn([]);
    recorder.enqueueReturn([]); // insert
    // Second entry: same.
    recorder.enqueueReturn([]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    const result = await caller.fromAnilist({ username: 'wouter' });

    expect(result).toEqual({ imported: 2, skipped: 0, total: 2 });
  });

  it('fires the personal-rec recompute event when at least one entry imported', async () => {
    setupFetch(() =>
      okJsonResponse(
        anilistResponse({
          scoreFormat: 'POINT_10',
          entries: [{ mediaId: 21, status: 'CURRENT', score: 8, progress: 12 }],
        }),
      ),
    );
    recorder.enqueueReturn([{ id: 'title-uuid-21', externalId: '21' }]);
    recorder.enqueueReturn([]); // existing select
    recorder.enqueueReturn([]); // insert

    const { caller } = await makeCaller();
    await caller.fromAnilist({ username: 'wouter' });

    expect(inngestSendMock).toHaveBeenCalledTimes(1);
    expect(recommendUserEventCreate).toHaveBeenCalledWith({ userId: INTERNAL_USER_ID });
  });

  it('inserts the watch_entries row with mapped status / rating / currentEpisode', async () => {
    setupFetch(() =>
      okJsonResponse(
        anilistResponse({
          scoreFormat: 'POINT_10',
          entries: [{ mediaId: 21, status: 'CURRENT', score: 8, progress: 12 }],
        }),
      ),
    );
    recorder.enqueueReturn([{ id: 'title-uuid-21', externalId: '21' }]);
    recorder.enqueueReturn([]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.fromAnilist({ username: 'wouter' });

    const inserted = flattenRows(findInsertValues(watchEntriesTable))[0];
    expect(inserted).toBeDefined();
    expect(inserted?.userId).toBe(INTERNAL_USER_ID);
    expect(inserted?.titleId).toBe('title-uuid-21');
    expect(inserted?.kind).toBe('tracking');
    expect(inserted?.status).toBe('watching');
    expect(inserted?.rating).toBe(8);
    expect(inserted?.currentEpisode).toBe(12);
  });
});

describe('listImportRouter.fromAnilist — error mappings', () => {
  // Contract B
  it('maps HTTP 404 to TRPCError NOT_FOUND with "AniList user not found"', async () => {
    setupFetch(() => errorJsonResponse(404));

    const { caller } = await makeCaller();
    try {
      await caller.fromAnilist({ username: 'ghost' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const e = err as TRPCError;
      expect(e.code).toBe('NOT_FOUND');
      expect(e.message).toBe('AniList user not found');
    }
  });

  // Contract C
  it('maps a GraphQL error containing "not found" (case-insensitive) to NOT_FOUND', async () => {
    setupFetch(() => okJsonResponse({ errors: [{ message: 'User Not Found.' }] }));

    const { caller } = await makeCaller();
    try {
      await caller.fromAnilist({ username: 'ghost' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const e = err as TRPCError;
      expect(e.code).toBe('NOT_FOUND');
      expect(e.message).toBe('AniList user not found');
    }
  });

  it('maps a non-"not found" GraphQL error to INTERNAL_SERVER_ERROR with message preserved', async () => {
    setupFetch(() => okJsonResponse({ errors: [{ message: 'rate limited' }] }));

    const { caller } = await makeCaller();
    try {
      await caller.fromAnilist({ username: 'wouter' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const e = err as TRPCError;
      expect(e.code).toBe('INTERNAL_SERVER_ERROR');
      expect(e.message).toContain('rate limited');
    }
  });

  // Contract D
  it('maps an AbortSignal.timeout TimeoutError to TRPCError TIMEOUT', async () => {
    setupFetch(() => {
      // DOMException is a Node global in modern runtimes.
      throw new DOMException('aborted', 'TimeoutError');
    });

    const { caller } = await makeCaller();
    try {
      await caller.fromAnilist({ username: 'wouter' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const e = err as TRPCError;
      expect(e.code).toBe('TIMEOUT');
      expect(e.message).toContain('AniList took too long');
    }
  });

  // Contract E
  it('maps a non-404 non-timeout HTTP error to INTERNAL_SERVER_ERROR with the status code in the message', async () => {
    setupFetch(() => errorJsonResponse(503));

    const { caller } = await makeCaller();
    try {
      await caller.fromAnilist({ username: 'wouter' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const e = err as TRPCError;
      expect(e.code).toBe('INTERNAL_SERVER_ERROR');
      expect(e.message).toContain('503');
    }
  });

  it('maps a generic fetch failure (network error, non-AbortError) to INTERNAL_SERVER_ERROR', async () => {
    setupFetch(() => {
      throw new Error('econnrefused');
    });

    const { caller } = await makeCaller();
    try {
      await caller.fromAnilist({ username: 'wouter' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const e = err as TRPCError;
      expect(e.code).toBe('INTERNAL_SERVER_ERROR');
      expect(e.message).toContain('Failed to reach AniList');
    }
  });
});

// Contract F — score normalisation. Black-box-tested through the router by
// staging a one-entry response and observing the `rating` written.
describe('listImportRouter.fromAnilist — Contract F: score normalisation', () => {
  async function importOneAndReadRating(score: number, scoreFormat: string): Promise<unknown> {
    setupFetch(() =>
      okJsonResponse(
        anilistResponse({
          scoreFormat,
          entries: [{ mediaId: 21, status: 'CURRENT', score, progress: 0 }],
        }),
      ),
    );
    recorder.enqueueReturn([{ id: 'title-uuid-21', externalId: '21' }]);
    recorder.enqueueReturn([]); // existing
    recorder.enqueueReturn([]); // insert

    const { caller } = await makeCaller();
    await caller.fromAnilist({ username: 'wouter' });
    return flattenRows(findInsertValues(watchEntriesTable))[0]?.rating;
  }

  it('returns null when rawScore is 0 in any format', async () => {
    expect(await importOneAndReadRating(0, 'POINT_100')).toBeNull();
  });

  it('returns null when rawScore is negative in any format', async () => {
    expect(await importOneAndReadRating(-5, 'POINT_10')).toBeNull();
  });

  it('POINT_100: divides by 10, rounds, clamps to 1..10 (85 → 9)', async () => {
    expect(await importOneAndReadRating(85, 'POINT_100')).toBe(9);
  });

  it('POINT_100: clamps a sub-1 result up to 1 (5 → 1, not 0.5)', async () => {
    expect(await importOneAndReadRating(5, 'POINT_100')).toBe(1);
  });

  it('POINT_100: clamps an over-10 result down to 10 (105 → 10)', async () => {
    expect(await importOneAndReadRating(105, 'POINT_100')).toBe(10);
  });

  it('POINT_10_DECIMAL: rounds and clamps to 1..10 (7.4 → 7)', async () => {
    expect(await importOneAndReadRating(7.4, 'POINT_10_DECIMAL')).toBe(7);
  });

  it('POINT_10_DECIMAL: rounds and clamps to 1..10 (7.6 → 8)', async () => {
    expect(await importOneAndReadRating(7.6, 'POINT_10_DECIMAL')).toBe(8);
  });

  it('POINT_10: rounds and clamps to 1..10 (7 → 7)', async () => {
    expect(await importOneAndReadRating(7, 'POINT_10')).toBe(7);
  });

  it('POINT_10: clamps over-10 down to 10 (15 → 10)', async () => {
    expect(await importOneAndReadRating(15, 'POINT_10')).toBe(10);
  });

  it('POINT_5: doubles, clamps 1..10 (1 → 2)', async () => {
    expect(await importOneAndReadRating(1, 'POINT_5')).toBe(2);
  });

  it('POINT_5: doubles, clamps 1..10 (2 → 4)', async () => {
    expect(await importOneAndReadRating(2, 'POINT_5')).toBe(4);
  });

  it('POINT_5: doubles, clamps 1..10 (5 → 10)', async () => {
    expect(await importOneAndReadRating(5, 'POINT_5')).toBe(10);
  });

  it('POINT_3: maps 1 → 2', async () => {
    expect(await importOneAndReadRating(1, 'POINT_3')).toBe(2);
  });

  it('POINT_3: maps 2 → 6', async () => {
    expect(await importOneAndReadRating(2, 'POINT_3')).toBe(6);
  });

  it('POINT_3: maps 3 → 10', async () => {
    expect(await importOneAndReadRating(3, 'POINT_3')).toBe(10);
  });

  it('POINT_3: maps any other value (e.g. 4) to null', async () => {
    expect(await importOneAndReadRating(4, 'POINT_3')).toBeNull();
  });

  it('Unknown format: passthrough when rawScore is in 1..10', async () => {
    expect(await importOneAndReadRating(7, 'POINT_42_OBSCURE')).toBe(7);
  });

  it('Unknown format: returns null when rawScore is outside 1..10', async () => {
    expect(await importOneAndReadRating(50, 'POINT_42_OBSCURE')).toBeNull();
  });
});

// Contract G — status mapping table. Exercised through the import flow.
describe('listImportRouter.fromAnilist — Contract G: status mapping', () => {
  async function importOneAndReadStatus(status: string): Promise<unknown> {
    setupFetch(() =>
      okJsonResponse(
        anilistResponse({
          scoreFormat: 'POINT_10',
          entries: [{ mediaId: 21, status, score: 0, progress: 0 }],
        }),
      ),
    );
    recorder.enqueueReturn([{ id: 'title-uuid-21', externalId: '21' }]);
    recorder.enqueueReturn([]); // existing
    recorder.enqueueReturn([]); // insert

    const { caller } = await makeCaller();
    await caller.fromAnilist({ username: 'wouter' });
    return flattenRows(findInsertValues(watchEntriesTable))[0]?.status;
  }

  it('maps CURRENT to watching', async () => {
    expect(await importOneAndReadStatus('CURRENT')).toBe('watching');
  });

  it('maps COMPLETED to completed', async () => {
    expect(await importOneAndReadStatus('COMPLETED')).toBe('completed');
  });

  it('maps PAUSED to on_hold', async () => {
    expect(await importOneAndReadStatus('PAUSED')).toBe('on_hold');
  });

  it('maps DROPPED to dropped', async () => {
    expect(await importOneAndReadStatus('DROPPED')).toBe('dropped');
  });

  it('maps PLANNING to plan_to_watch', async () => {
    expect(await importOneAndReadStatus('PLANNING')).toBe('plan_to_watch');
  });

  it('maps REPEATING to watching (REPEATING is folded into watching, no rewatch model)', async () => {
    expect(await importOneAndReadStatus('REPEATING')).toBe('watching');
  });

  it('skips entries with an unknown status (counted in skipped, no DB write)', async () => {
    setupFetch(() =>
      okJsonResponse(
        anilistResponse({
          scoreFormat: 'POINT_10',
          entries: [{ mediaId: 21, status: 'BIZARRE_NEW_STATUS', score: 5, progress: 0 }],
        }),
      ),
    );
    recorder.enqueueReturn([{ id: 'title-uuid-21', externalId: '21' }]);
    // No existing/insert pair should be drained — but stage one each in case
    // the SUT performs any extra read before classifying, so the test fails on
    // count not on a "missing return" hang.
    const { caller } = await makeCaller();
    const result = await caller.fromAnilist({ username: 'wouter' });

    expect(result).toEqual({ imported: 0, skipped: 1, total: 1 });
    expect(findInsertValues(watchEntriesTable).length).toBe(0);
  });
});

// Contract H — title lookup
describe('listImportRouter.fromAnilist — Contract H: title lookup', () => {
  it('counts entries whose mediaId is not in our titles catalogue as skipped', async () => {
    setupFetch(() =>
      okJsonResponse(
        anilistResponse({
          scoreFormat: 'POINT_10',
          entries: [
            { mediaId: 21, status: 'CURRENT', score: 8, progress: 0 },
            { mediaId: 99999, status: 'CURRENT', score: 8, progress: 0 },
          ],
        }),
      ),
    );
    // titles SELECT only returns one matching row.
    recorder.enqueueReturn([{ id: 'title-uuid-21', externalId: '21' }]);
    recorder.enqueueReturn([]); // existing select for the matched entry
    recorder.enqueueReturn([]); // insert for the matched entry

    const { caller } = await makeCaller();
    const result = await caller.fromAnilist({ username: 'wouter' });

    expect(result).toEqual({ imported: 1, skipped: 1, total: 2 });
  });

  it('queries titles with source = anilist (filtered to AniList catalogue)', async () => {
    setupFetch(() =>
      okJsonResponse(
        anilistResponse({
          scoreFormat: 'POINT_10',
          entries: [{ mediaId: 21, status: 'CURRENT', score: 8, progress: 0 }],
        }),
      ),
    );
    recorder.enqueueReturn([{ id: 'title-uuid-21', externalId: '21' }]);
    recorder.enqueueReturn([]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.fromAnilist({ username: 'wouter' });

    // The SELECT must run against `titles` table sentinel.
    const fromCall = recorder.calls.find((c) => c.method === 'from');
    expect(fromCall?.args[0]).toBe(titlesTable);
  });
});

// Contract I — anchor preservation
describe('listImportRouter.fromAnilist — Contract I: anchor preservation', () => {
  it('does not write to watch_entries when an existing anchor row is present', async () => {
    setupFetch(() =>
      okJsonResponse(
        anilistResponse({
          scoreFormat: 'POINT_10',
          entries: [{ mediaId: 21, status: 'CURRENT', score: 8, progress: 0 }],
        }),
      ),
    );
    recorder.enqueueReturn([{ id: 'title-uuid-21', externalId: '21' }]);
    // The existing-row select returns an anchor.
    recorder.enqueueReturn([{ kind: 'anchor' }]);
    // No insert is staged because the SUT should skip writing.

    const { caller } = await makeCaller();
    const result = await caller.fromAnilist({ username: 'wouter' });

    expect(result).toEqual({ imported: 1, skipped: 0, total: 1 });
    expect(findInsertValues(watchEntriesTable).length).toBe(0);
  });

  it('counts the anchor-preserved entry as imported (the lookup work was done)', async () => {
    setupFetch(() =>
      okJsonResponse(
        anilistResponse({
          scoreFormat: 'POINT_10',
          entries: [{ mediaId: 21, status: 'CURRENT', score: 8, progress: 0 }],
        }),
      ),
    );
    recorder.enqueueReturn([{ id: 'title-uuid-21', externalId: '21' }]);
    recorder.enqueueReturn([{ kind: 'anchor' }]);

    const { caller } = await makeCaller();
    const result = await caller.fromAnilist({ username: 'wouter' });

    expect(result.imported).toBe(1);
  });

  it('overwrites a tracking row (non-anchor) on import', async () => {
    setupFetch(() =>
      okJsonResponse(
        anilistResponse({
          scoreFormat: 'POINT_10',
          entries: [{ mediaId: 21, status: 'COMPLETED', score: 9, progress: 24 }],
        }),
      ),
    );
    recorder.enqueueReturn([{ id: 'title-uuid-21', externalId: '21' }]);
    recorder.enqueueReturn([{ kind: 'tracking' }]);
    recorder.enqueueReturn([]); // insert

    const { caller } = await makeCaller();
    await caller.fromAnilist({ username: 'wouter' });

    const inserted = flattenRows(findInsertValues(watchEntriesTable))[0];
    expect(inserted?.status).toBe('completed');
    expect(inserted?.rating).toBe(9);
    expect(inserted?.currentEpisode).toBe(24);
  });
});

// Contract J — recompute event firing rule
describe('listImportRouter.fromAnilist — Contract J: recompute event firing', () => {
  it('does NOT call inngest.send when zero entries imported', async () => {
    setupFetch(() =>
      okJsonResponse(
        anilistResponse({
          scoreFormat: 'POINT_10',
          // mediaId not in catalogue → all skipped.
          entries: [{ mediaId: 99999, status: 'CURRENT', score: 0, progress: 0 }],
        }),
      ),
    );
    recorder.enqueueReturn([]); // titles select empty

    const { caller } = await makeCaller();
    await caller.fromAnilist({ username: 'wouter' });

    expect(inngestSendMock).not.toHaveBeenCalled();
  });
});

// Contract K — empty list
describe('listImportRouter.fromAnilist — Contract K: empty list', () => {
  it('returns zero counts and skips the titles SELECT when mediaIds is empty', async () => {
    setupFetch(() => okJsonResponse(anilistResponse({ scoreFormat: 'POINT_10', entries: [] })));

    const { caller } = await makeCaller();
    const result = await caller.fromAnilist({ username: 'ghost' });

    expect(result).toEqual({ imported: 0, skipped: 0, total: 0 });
    // No SELECT against titles, no inngest send.
    const fromCalls = recorder.calls.filter((c) => c.method === 'from');
    expect(fromCalls.length).toBe(0);
    expect(inngestSendMock).not.toHaveBeenCalled();
  });
});

// Contract L — score format default
describe('listImportRouter.fromAnilist — Contract L: scoreFormat default', () => {
  it('falls back to POINT_10 when collection.user is null (rawScore 7 → 7, not 0.7)', async () => {
    setupFetch(() =>
      okJsonResponse(
        anilistResponse({
          scoreFormat: null,
          entries: [{ mediaId: 21, status: 'CURRENT', score: 7, progress: 0 }],
        }),
      ),
    );
    recorder.enqueueReturn([{ id: 'title-uuid-21', externalId: '21' }]);
    recorder.enqueueReturn([]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.fromAnilist({ username: 'wouter' });

    const inserted = flattenRows(findInsertValues(watchEntriesTable))[0];
    // POINT_10 default: round + clamp to 1..10 → 7
    expect(inserted?.rating).toBe(7);
  });
});

// progress = 0 → null currentEpisode (separate guard from the score guard).
describe('listImportRouter.fromAnilist — currentEpisode handling', () => {
  it('writes null currentEpisode when progress is 0', async () => {
    setupFetch(() =>
      okJsonResponse(
        anilistResponse({
          scoreFormat: 'POINT_10',
          entries: [{ mediaId: 21, status: 'CURRENT', score: 0, progress: 0 }],
        }),
      ),
    );
    recorder.enqueueReturn([{ id: 'title-uuid-21', externalId: '21' }]);
    recorder.enqueueReturn([]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.fromAnilist({ username: 'wouter' });

    const inserted = flattenRows(findInsertValues(watchEntriesTable))[0];
    expect(inserted?.currentEpisode).toBeNull();
  });
});

// Auth guard
describe('listImportRouter.fromAnilist — auth guard', () => {
  it('throws NOT_FOUND when the user has no internal users row', async () => {
    resolveInternalUserIdMock.mockResolvedValueOnce(null);
    // Even with no fetch — the SUT should bail before fetching.
    setupFetch(() => okJsonResponse(anilistResponse({})));

    const { caller } = await makeCaller();
    try {
      await caller.fromAnilist({ username: 'wouter' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const e = err as TRPCError;
      expect(e.code).toBe('NOT_FOUND');
      expect(e.message).toContain('user row missing');
    }
  });
});

// ---------------------------------------------------------------------------
// Tests — fromMal
// ---------------------------------------------------------------------------
describe('listImportRouter.fromMal — Contract M: empty entries', () => {
  it('returns zero counts and does not call titles SELECT or inngest', async () => {
    const { caller } = await makeCaller();
    const result = await caller.fromMal({ entries: [] });

    expect(result).toEqual({ imported: 0, skipped: 0, total: 0 });
    expect(recorder.calls.length).toBe(0);
    expect(inngestSendMock).not.toHaveBeenCalled();
  });
});

describe('listImportRouter.fromMal — Contract N: title lookup by id_mal', () => {
  it('matches entries to titles by titles.id_mal (not external_id)', async () => {
    // titles SELECT returns rows keyed by idMal. The SUT must find the row by
    // matching idMal, not externalId.
    recorder.enqueueReturn([
      { id: 'title-uuid-A', idMal: 21 },
      { id: 'title-uuid-B', idMal: 30 },
    ]);
    recorder.enqueueReturn([]); // existing select
    recorder.enqueueReturn([]); // insert

    const { caller } = await makeCaller();
    const result = await caller.fromMal({
      entries: [
        {
          malId: 21,
          status: 'watching',
          rating: 7,
          currentEpisode: 5,
        },
      ],
    });

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
    const inserted = flattenRows(findInsertValues(watchEntriesTable))[0];
    expect(inserted?.titleId).toBe('title-uuid-A');
  });

  it('skips entries whose malId is not in our titles catalogue', async () => {
    recorder.enqueueReturn([{ id: 'title-uuid-A', idMal: 21 }]);
    // Only one title matches; the second entry should be skipped.
    recorder.enqueueReturn([]); // existing select for matched entry
    recorder.enqueueReturn([]); // insert

    const { caller } = await makeCaller();
    const result = await caller.fromMal({
      entries: [
        { malId: 21, status: 'watching', rating: null, currentEpisode: null },
        { malId: 99999, status: 'watching', rating: null, currentEpisode: null },
      ],
    });

    expect(result).toEqual({ imported: 1, skipped: 1, total: 2 });
  });

  it('skips entries when titles.idMal is null (TMDB-only rows are not matched)', async () => {
    recorder.enqueueReturn([{ id: 'title-uuid-A', idMal: null }]);

    const { caller } = await makeCaller();
    const result = await caller.fromMal({
      entries: [{ malId: 21, status: 'watching', rating: null, currentEpisode: null }],
    });

    expect(result).toEqual({ imported: 0, skipped: 1, total: 1 });
  });
});

describe('listImportRouter.fromMal — Contract O: anchor preservation', () => {
  it('does not write to watch_entries when an existing anchor row is present', async () => {
    recorder.enqueueReturn([{ id: 'title-uuid-A', idMal: 21 }]);
    recorder.enqueueReturn([{ kind: 'anchor' }]); // existing — anchor

    const { caller } = await makeCaller();
    const result = await caller.fromMal({
      entries: [{ malId: 21, status: 'watching', rating: 7, currentEpisode: 5 }],
    });

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(0);
    expect(findInsertValues(watchEntriesTable).length).toBe(0);
  });
});

describe('listImportRouter.fromMal — Contract P: pass-through values', () => {
  it('passes status, rating, and currentEpisode through to the inserted row', async () => {
    recorder.enqueueReturn([{ id: 'title-uuid-A', idMal: 21 }]);
    recorder.enqueueReturn([]); // existing
    recorder.enqueueReturn([]); // insert

    const { caller } = await makeCaller();
    await caller.fromMal({
      entries: [{ malId: 21, status: 'completed', rating: 9, currentEpisode: 24 }],
    });

    const inserted = flattenRows(findInsertValues(watchEntriesTable))[0];
    expect(inserted?.userId).toBe(INTERNAL_USER_ID);
    expect(inserted?.titleId).toBe('title-uuid-A');
    expect(inserted?.kind).toBe('tracking');
    expect(inserted?.status).toBe('completed');
    expect(inserted?.rating).toBe(9);
    expect(inserted?.currentEpisode).toBe(24);
  });

  it('passes null rating and null currentEpisode through unchanged', async () => {
    recorder.enqueueReturn([{ id: 'title-uuid-A', idMal: 21 }]);
    recorder.enqueueReturn([]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.fromMal({
      entries: [{ malId: 21, status: 'plan_to_watch', rating: null, currentEpisode: null }],
    });

    const inserted = flattenRows(findInsertValues(watchEntriesTable))[0];
    expect(inserted?.rating).toBeNull();
    expect(inserted?.currentEpisode).toBeNull();
  });
});

describe('listImportRouter.fromMal — Contract Q: recompute event firing', () => {
  it('fires inngest.send when at least one entry imported', async () => {
    recorder.enqueueReturn([{ id: 'title-uuid-A', idMal: 21 }]);
    recorder.enqueueReturn([]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.fromMal({
      entries: [{ malId: 21, status: 'watching', rating: 7, currentEpisode: 5 }],
    });

    expect(inngestSendMock).toHaveBeenCalledTimes(1);
    expect(recommendUserEventCreate).toHaveBeenCalledWith({ userId: INTERNAL_USER_ID });
  });

  it('does NOT fire inngest.send when zero entries imported (all skipped)', async () => {
    recorder.enqueueReturn([{ id: 'title-uuid-A', idMal: 21 }]);

    const { caller } = await makeCaller();
    await caller.fromMal({
      entries: [{ malId: 99999, status: 'watching', rating: null, currentEpisode: null }],
    });

    expect(inngestSendMock).not.toHaveBeenCalled();
  });
});

describe('listImportRouter.fromMal — input validation', () => {
  it('rejects a negative malId at the input layer', async () => {
    const { caller } = await makeCaller();
    await expect(
      caller.fromMal({
        entries: [{ malId: -1, status: 'watching', rating: null, currentEpisode: null }],
      }),
    ).rejects.toThrow();
  });

  it('rejects a rating of 0 at the input layer (below min)', async () => {
    const { caller } = await makeCaller();
    await expect(
      caller.fromMal({
        entries: [{ malId: 21, status: 'watching', rating: 0, currentEpisode: null }],
      }),
    ).rejects.toThrow();
  });

  it('rejects a rating of 11 at the input layer (above max)', async () => {
    const { caller } = await makeCaller();
    await expect(
      caller.fromMal({
        entries: [{ malId: 21, status: 'watching', rating: 11, currentEpisode: null }],
      }),
    ).rejects.toThrow();
  });

  it('rejects an unknown status at the input layer', async () => {
    const { caller } = await makeCaller();
    await expect(
      caller.fromMal({
        entries: [
          {
            malId: 21,
            // Cast through unknown so the test deliberately violates the
            // typed enum to exercise the runtime Zod validator.
            status: 'invalid' as unknown as 'watching',
            rating: null,
            currentEpisode: null,
          },
        ],
      }),
    ).rejects.toThrow();
  });
});

describe('listImportRouter.fromMal — auth guard', () => {
  it('throws NOT_FOUND when the user has no internal users row', async () => {
    resolveInternalUserIdMock.mockResolvedValueOnce(null);
    const { caller } = await makeCaller();
    try {
      await caller.fromMal({
        entries: [{ malId: 21, status: 'watching', rating: 7, currentEpisode: 5 }],
      });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const e = err as TRPCError;
      expect(e.code).toBe('NOT_FOUND');
    }
  });
});

// onConflictDoUpdate set assertion — covers the shape of the upsert update set
// for both fromAnilist and fromMal (mirrors of each other).
describe('listImportRouter — upsert set shape', () => {
  it('fromAnilist onConflictDoUpdate set includes status, rating, currentEpisode, updatedAt', async () => {
    setupFetch(() =>
      okJsonResponse(
        anilistResponse({
          scoreFormat: 'POINT_10',
          entries: [{ mediaId: 21, status: 'COMPLETED', score: 9, progress: 12 }],
        }),
      ),
    );
    recorder.enqueueReturn([{ id: 'title-uuid-21', externalId: '21' }]);
    recorder.enqueueReturn([]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.fromAnilist({ username: 'wouter' });

    const updates = findOnConflictUpdates();
    expect(updates.length).toBe(1);
    expect(updates[0]?.status).toBe('completed');
    expect(updates[0]?.rating).toBe(9);
    expect(updates[0]?.currentEpisode).toBe(12);
    expect(updates[0]?.updatedAt).toBeInstanceOf(Date);
  });
});
