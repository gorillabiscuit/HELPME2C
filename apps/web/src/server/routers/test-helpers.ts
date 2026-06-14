/**
 * Shared test utilities for tRPC router unit tests.
 *
 * Three patterns used by every router test file — extracted here so changes
 * to the mock mechanics apply everywhere and the copy-count stays at one.
 */

// ---------------------------------------------------------------------------
// Drizzle chain recorder
// ---------------------------------------------------------------------------

export interface CallEntry {
  method: string;
  args: unknown[];
}

export interface DbRecorder {
  calls: CallEntry[];
  returningQueue: unknown[][];
  reset(): void;
  enqueueReturn(rows: unknown[]): void;
}

export function createDbRecorder(): { db: unknown; recorder: DbRecorder } {
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
        calls.push({ method: String(prop), args });
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

// ---------------------------------------------------------------------------
// Table sentinel factory
// ---------------------------------------------------------------------------

/**
 * Creates a fake Drizzle table object whose column references are
 * distinguishable sentinel values (e.g. `{ __col: 'users.clerkId' }`).
 * Used to verify that router code passes the right column to WHERE/SET
 * clauses without importing the real schema (which pulls in pg).
 */
export function makeTableSentinel(name: string, cols: string[]): Record<string, unknown> {
  const table: Record<string, unknown> = { __table: name };
  for (const c of cols) {
    table[c] = { __col: `${name}.${c}` };
  }
  return table;
}

// ---------------------------------------------------------------------------
// tRPC caller factory
// ---------------------------------------------------------------------------

/**
 * Creates a tRPC caller for any router, wired to the provided mock DB and a
 * fixed test Clerk user ID. The router is imported lazily so vi.mock() calls
 * in the test file have already been applied before the module loads.
 */
export async function makeCaller<T>(
  importRouter: () => Promise<T>,
  getRouter: (mod: T) => { createCaller: (ctx: { db: unknown; userId: string }) => unknown },
  mockDb: unknown,
  userId = 'clerk-user-1',
) {
  const mod = await importRouter();
  const router = getRouter(mod);
  return router.createCaller({ db: mockDb as never, userId });
}
