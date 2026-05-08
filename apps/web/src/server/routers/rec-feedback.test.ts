import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for `recFeedbackRouter`. Per CLAUDE.md §8.1 Approach B these tests are
 * written against the documented contract. The router's only meaningful logic
 * is the partial-update upsert pattern — the test focuses on what hits the
 * recorder under each input shape.
 */

// ---------------------------------------------------------------------------
// Schema-table sentinels (column accessors are sentinels too).
// ---------------------------------------------------------------------------
function makeTableSentinel(name: string, cols: string[]): Record<string, unknown> {
  const table: Record<string, unknown> = { __table: name };
  for (const c of cols) {
    table[c] = { __col: `${name}.${c}` };
  }
  return table;
}

const recFeedbackTable = makeTableSentinel('rec_feedback', [
  'userId',
  'titleId',
  'rating',
  'dismissed',
]);
const usersTable = makeTableSentinel('users', ['id', 'clerkId']);

// The router imports `recFeedbackRatingEnum.enumValues` at module-load time to
// build its Zod validator. Provide the literal tuple here so the validator
// resolves with the same five values as the real schema.
const recFeedbackRatingEnumStub = {
  enumValues: ['terrible', 'bad', 'ok', 'good', 'terrific'] as const,
};

vi.mock('@/server/schema', () => ({
  recFeedback: recFeedbackTable,
  recFeedbackRatingEnum: recFeedbackRatingEnumStub,
  users: usersTable,
}));

// ---------------------------------------------------------------------------
// resolveInternalUserId mock.
// ---------------------------------------------------------------------------
const INTERNAL_USER_ID = 'internal-uuid-1';
const resolveInternalUserIdMock = vi.fn(async () => INTERNAL_USER_ID as string | null);

vi.mock('@/server/lib/resolve-user', () => ({
  resolveInternalUserId: resolveInternalUserIdMock,
}));

// ---------------------------------------------------------------------------
// Drizzle chain recorder.
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

vi.mock('@/server/db', () => ({ db: mockDb }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
type CapturedRow = Record<string, unknown>;

function findInsertValues(table: object): CapturedRow[] {
  const values: CapturedRow[] = [];
  for (let idx = 0; idx < recorder.calls.length; idx++) {
    const call = recorder.calls[idx];
    if (call?.method === 'insert' && call.args[0] === table) {
      for (let j = idx + 1; j < recorder.calls.length; j++) {
        const next = recorder.calls[j];
        if (!next) break;
        if (next.method === 'values') {
          values.push(next.args[0] as CapturedRow);
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

function findOnConflictUpdates(): CapturedRow[] {
  const results: CapturedRow[] = [];
  for (const call of recorder.calls) {
    if (call.method === 'onConflictDoUpdate') {
      const arg = call.args[0] as { set?: CapturedRow } | undefined;
      if (arg?.set) results.push(arg.set);
    }
  }
  return results;
}

async function makeCaller(): Promise<{
  caller: ReturnType<typeof import('./rec-feedback').recFeedbackRouter.createCaller>;
}> {
  const { recFeedbackRouter } = await import('./rec-feedback');
  const caller = recFeedbackRouter.createCaller({
    db: mockDb as never,
    userId: 'clerk-user-1',
  });
  return { caller };
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
const TITLE_UUID = '11111111-1111-4111-8111-111111111111';
const OTHER_TITLE_UUID = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  recorder.reset();
  resolveInternalUserIdMock.mockReset();
  resolveInternalUserIdMock.mockResolvedValue(INTERNAL_USER_ID);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tests — upsert
// ---------------------------------------------------------------------------
// Contract R — rating only
describe('recFeedbackRouter.upsert — Contract R: rating only', () => {
  it('INSERT values include rating and dismissed: false (default) when only rating provided', async () => {
    recorder.enqueueReturn([]); // insert resolves

    const { caller } = await makeCaller();
    await caller.upsert({ titleId: TITLE_UUID, rating: 'good' });

    const inserted = findInsertValues(recFeedbackTable)[0];
    expect(inserted).toBeDefined();
    expect(inserted?.userId).toBe(INTERNAL_USER_ID);
    expect(inserted?.titleId).toBe(TITLE_UUID);
    expect(inserted?.rating).toBe('good');
    expect(inserted?.dismissed).toBe(false);
  });

  it('ON CONFLICT update set contains only rating + updatedAt — not dismissed', async () => {
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.upsert({ titleId: TITLE_UUID, rating: 'good' });

    const updates = findOnConflictUpdates();
    expect(updates.length).toBe(1);
    expect(updates[0]?.rating).toBe('good');
    expect('dismissed' in (updates[0] ?? {})).toBe(false);
    expect(updates[0]?.updatedAt).toBeInstanceOf(Date);
  });

  it('returns { ok: true } on success', async () => {
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    const result = await caller.upsert({ titleId: TITLE_UUID, rating: 'terrific' });

    expect(result).toEqual({ ok: true });
  });

  it('accepts rating: null (clears existing rating without setting dismissed)', async () => {
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.upsert({ titleId: TITLE_UUID, rating: null });

    const inserted = findInsertValues(recFeedbackTable)[0];
    expect(inserted?.rating).toBeNull();
    const updates = findOnConflictUpdates();
    expect(updates[0]?.rating).toBeNull();
    expect('dismissed' in (updates[0] ?? {})).toBe(false);
  });
});

// Contract S — dismissed only
describe('recFeedbackRouter.upsert — Contract S: dismissed only', () => {
  it('INSERT values include rating: null and dismissed when only dismissed provided', async () => {
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.upsert({ titleId: TITLE_UUID, dismissed: true });

    const inserted = findInsertValues(recFeedbackTable)[0];
    expect(inserted?.rating).toBeNull();
    expect(inserted?.dismissed).toBe(true);
  });

  it('ON CONFLICT update set contains only dismissed + updatedAt — not rating', async () => {
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.upsert({ titleId: TITLE_UUID, dismissed: true });

    const updates = findOnConflictUpdates();
    expect(updates.length).toBe(1);
    expect(updates[0]?.dismissed).toBe(true);
    expect('rating' in (updates[0] ?? {})).toBe(false);
    expect(updates[0]?.updatedAt).toBeInstanceOf(Date);
  });

  it('accepts dismissed: false (un-dismiss)', async () => {
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.upsert({ titleId: TITLE_UUID, dismissed: false });

    const inserted = findInsertValues(recFeedbackTable)[0];
    expect(inserted?.dismissed).toBe(false);
    const updates = findOnConflictUpdates();
    expect(updates[0]?.dismissed).toBe(false);
    expect('rating' in (updates[0] ?? {})).toBe(false);
  });
});

// Contract T — both rating and dismissed
describe('recFeedbackRouter.upsert — Contract T: both fields', () => {
  it('INSERT values contain both rating and dismissed when both are provided', async () => {
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.upsert({ titleId: TITLE_UUID, rating: 'bad', dismissed: true });

    const inserted = findInsertValues(recFeedbackTable)[0];
    expect(inserted?.rating).toBe('bad');
    expect(inserted?.dismissed).toBe(true);
  });

  it('ON CONFLICT update set contains both rating and dismissed (plus updatedAt)', async () => {
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.upsert({ titleId: TITLE_UUID, rating: 'bad', dismissed: true });

    const updates = findOnConflictUpdates();
    expect(updates.length).toBe(1);
    expect(updates[0]?.rating).toBe('bad');
    expect(updates[0]?.dismissed).toBe(true);
    expect(updates[0]?.updatedAt).toBeInstanceOf(Date);
  });

  it('accepts every rating enum value', async () => {
    const values = ['terrible', 'bad', 'ok', 'good', 'terrific'] as const;
    for (const r of values) {
      recorder.reset();
      recorder.enqueueReturn([]);
      const { caller } = await makeCaller();
      await caller.upsert({ titleId: TITLE_UUID, rating: r });
      const inserted = findInsertValues(recFeedbackTable)[0];
      expect(inserted?.rating).toBe(r);
    }
  });
});

// Contract U — input validation: at least one of rating or dismissed
describe('recFeedbackRouter.upsert — Contract U: at-least-one refine', () => {
  it('rejects a payload with neither rating nor dismissed', async () => {
    const { caller } = await makeCaller();
    // The Zod refine triggers at runtime regardless of the static type. Pass
    // the payload through `as unknown as` so the input shape compiles AND the
    // runtime validator sees a payload that fails the at-least-one rule.
    const noFields = { titleId: TITLE_UUID } as unknown as {
      titleId: string;
      rating: 'good';
    };
    await expect(caller.upsert(noFields)).rejects.toThrow();
  });

  it('rejects an invalid rating string', async () => {
    const { caller } = await makeCaller();
    await expect(
      caller.upsert({
        titleId: TITLE_UUID,
        // Cast via unknown so the test compiles but the runtime validator fires.
        rating: 'godlike' as unknown as 'good',
      }),
    ).rejects.toThrow();
  });

  it('rejects a non-uuid titleId', async () => {
    const { caller } = await makeCaller();
    await expect(
      caller.upsert({
        titleId: 'not-a-uuid',
        dismissed: true,
      }),
    ).rejects.toThrow();
  });
});

describe('recFeedbackRouter.upsert — auth guard', () => {
  it('throws when the user has no internal users row', async () => {
    resolveInternalUserIdMock.mockResolvedValueOnce(null);
    const { caller } = await makeCaller();
    await expect(caller.upsert({ titleId: TITLE_UUID, rating: 'good' })).rejects.toThrow(
      /user row missing/,
    );
  });
});

// ---------------------------------------------------------------------------
// Tests — get
// ---------------------------------------------------------------------------
// Contract V — null when no row
describe('recFeedbackRouter.get — Contract V: no row', () => {
  it('returns null when the SELECT returns no rows', async () => {
    recorder.enqueueReturn([]); // select returns empty

    const { caller } = await makeCaller();
    const result = await caller.get({ titleId: TITLE_UUID });

    expect(result).toBeNull();
  });

  it('returns null when the user has no internal row (resolveInternalUserId → null)', async () => {
    resolveInternalUserIdMock.mockResolvedValueOnce(null);
    // SELECT must NOT be staged because the SUT short-circuits before it.
    const { caller } = await makeCaller();
    const result = await caller.get({ titleId: TITLE_UUID });

    expect(result).toBeNull();
    expect(recorder.calls.find((c) => c.method === 'from')).toBeUndefined();
  });
});

// Contract W — returns the row
describe('recFeedbackRouter.get — Contract W: existing row', () => {
  it('returns the row { rating, dismissed } when present', async () => {
    recorder.enqueueReturn([{ rating: 'good', dismissed: false }]);

    const { caller } = await makeCaller();
    const result = await caller.get({ titleId: TITLE_UUID });

    expect(result).toEqual({ rating: 'good', dismissed: false });
  });

  it('returns dismissed-only row when rating is null', async () => {
    recorder.enqueueReturn([{ rating: null, dismissed: true }]);

    const { caller } = await makeCaller();
    const result = await caller.get({ titleId: TITLE_UUID });

    expect(result).toEqual({ rating: null, dismissed: true });
  });

  it('queries against the recFeedback table sentinel', async () => {
    recorder.enqueueReturn([{ rating: 'ok', dismissed: false }]);

    const { caller } = await makeCaller();
    await caller.get({ titleId: OTHER_TITLE_UUID });

    const fromCall = recorder.calls.find((c) => c.method === 'from');
    expect(fromCall?.args[0]).toBe(recFeedbackTable);
  });
});

describe('recFeedbackRouter.get — input validation', () => {
  it('rejects a non-uuid titleId', async () => {
    const { caller } = await makeCaller();
    await expect(caller.get({ titleId: 'not-a-uuid' })).rejects.toThrow();
  });
});
