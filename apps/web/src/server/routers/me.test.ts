import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for `meRouter.setDefaultPrivacy`. Approach A per §8.1 — written
 * against the documented contract, not the implementation. The procedure
 * is mechanical (zod-validated input + one UPDATE), so the contract surface
 * is: accept only `public` / `private`, never `friends`; UPDATE the current
 * user's row keyed by clerkId; return the new value; throw NOT_FOUND when
 * the user row doesn't exist.
 */

// ---------------------------------------------------------------------------
// Schema-table sentinels (mirrors the pattern in rec-feedback.test.ts).
// ---------------------------------------------------------------------------
function makeTableSentinel(name: string, cols: string[]): Record<string, unknown> {
  const table: Record<string, unknown> = { __table: name };
  for (const c of cols) {
    table[c] = { __col: `${name}.${c}` };
  }
  return table;
}

const usersTable = makeTableSentinel('users', ['id', 'clerkId', 'defaultPrivacy', 'updatedAt']);

// The router reads privacyLevelEnum.enumValues at module-load to build its
// (re-exported) full-enum zod schema. The setDefaultPrivacy procedure
// itself only accepts public|private, but the module must load.
const privacyLevelEnumStub = {
  enumValues: ['public', 'friends', 'private'] as const,
};

vi.mock('@/server/schema', () => ({
  users: usersTable,
  privacyLevelEnum: privacyLevelEnumStub,
}));

// Clerk + ensureUser are imported at module level but only used by meRouter.get
// and meRouter.ensure — stub so the import resolves.
vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));
vi.mock('@/server/lib/ensure-user', () => ({
  ensureUserFromClerk: vi.fn(),
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
async function makeCaller() {
  const { meRouter } = await import('./me');
  return meRouter.createCaller({
    db: mockDb as never,
    userId: 'clerk-user-1',
  });
}

function findUpdateSet(): Record<string, unknown> | null {
  for (let i = 0; i < recorder.calls.length; i++) {
    const call = recorder.calls[i];
    if (call?.method === 'update') {
      for (let j = i + 1; j < recorder.calls.length; j++) {
        const next = recorder.calls[j];
        if (!next) break;
        if (next.method === 'set') return next.args[0] as Record<string, unknown>;
      }
    }
  }
  return null;
}

beforeEach(() => {
  recorder.reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('meRouter.setDefaultPrivacy', () => {
  it('writes defaultPrivacy=public to the user row keyed by clerkId', async () => {
    recorder.enqueueReturn([{ defaultPrivacy: 'public' }]);
    const caller = await makeCaller();

    const result = await caller.setDefaultPrivacy({ defaultPrivacy: 'public' });

    expect(result).toEqual({ defaultPrivacy: 'public' });
    const set = findUpdateSet();
    expect(set?.defaultPrivacy).toBe('public');
    expect(set?.updatedAt).toBeInstanceOf(Date);
  });

  it('writes defaultPrivacy=private to the user row', async () => {
    recorder.enqueueReturn([{ defaultPrivacy: 'private' }]);
    const caller = await makeCaller();

    const result = await caller.setDefaultPrivacy({ defaultPrivacy: 'private' });

    expect(result).toEqual({ defaultPrivacy: 'private' });
    const set = findUpdateSet();
    expect(set?.defaultPrivacy).toBe('private');
  });

  it('rejects defaultPrivacy=friends at the input layer (friends-only not yet selectable)', async () => {
    const caller = await makeCaller();
    // @ts-expect-error — deliberately violating the public input type to
    // assert the schema rejects 'friends' at runtime.
    await expect(caller.setDefaultPrivacy({ defaultPrivacy: 'friends' })).rejects.toThrow();
    // No DB write should have been attempted.
    expect(recorder.calls.find((c) => c.method === 'update')).toBeUndefined();
  });

  it('rejects unknown defaultPrivacy values', async () => {
    const caller = await makeCaller();
    // @ts-expect-error — deliberately invalid.
    await expect(caller.setDefaultPrivacy({ defaultPrivacy: 'nope' })).rejects.toThrow();
  });

  it('throws NOT_FOUND when no user row matches the clerkId (returning was empty)', async () => {
    recorder.enqueueReturn([]); // simulate UPDATE matching zero rows
    const caller = await makeCaller();

    await expect(caller.setDefaultPrivacy({ defaultPrivacy: 'public' })).rejects.toThrow(
      /User row not found/,
    );
  });
});
