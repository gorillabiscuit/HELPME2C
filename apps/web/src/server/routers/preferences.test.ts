import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for `preferencesRouter.recordReasonFeedback` (ADR-0027). Per CLAUDE.md
 * §8.1 Approach A these are written against the documented contract, not the
 * implementation. The only real logic is: resolve the user, normalise empty
 * free text to NULL, and append one row — so the tests pin exactly that.
 */

// ---------------------------------------------------------------------------
// Schema-table sentinels.
// ---------------------------------------------------------------------------
function makeTableSentinel(name: string, cols: string[]): Record<string, unknown> {
  const table: Record<string, unknown> = { __table: name };
  for (const c of cols) {
    table[c] = { __col: `${name}.${c}` };
  }
  return table;
}

const reasonFeedbackEventsTable = makeTableSentinel('reason_feedback_events', [
  'userId',
  'titleId',
  'mode',
  'questionShown',
  'optionsShown',
  'selectedSlugs',
  'noneOfTheseFit',
  'freeText',
]);
const usersTable = makeTableSentinel('users', ['id', 'clerkId']);

// preferences.ts imports these at module load (used by other procedures we
// don't exercise here). Bare sentinels are enough — they're never invoked.
vi.mock('@/server/schema', () => ({
  reasonFeedbackEvents: reasonFeedbackEventsTable,
  users: usersTable,
  titles: makeTableSentinel('titles', ['id']),
  titleThemes: makeTableSentinel('title_themes', ['titleId']),
  userPreferences: makeTableSentinel('user_preferences', ['userId']),
}));

// ---------------------------------------------------------------------------
// Drizzle chain recorder — awaiting any chain resolves to the next queued rows.
// ---------------------------------------------------------------------------
interface CallEntry {
  method: string;
  args: unknown[];
}

function createDbRecorder() {
  const calls: CallEntry[] = [];
  const returningQueue: unknown[][] = [];

  const chainHandler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === 'then') {
        return (resolve: (value: unknown) => void) => {
          resolve(returningQueue.shift() ?? []);
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

  return {
    db: chainProxy,
    recorder: {
      calls,
      reset() {
        calls.length = 0;
        returningQueue.length = 0;
      },
      enqueueReturn(rows: unknown[]) {
        returningQueue.push(rows);
      },
    },
  };
}

const { db: mockDb, recorder } = createDbRecorder();
vi.mock('@/server/db', () => ({ db: mockDb }));

function findInsertedRow(table: object): Record<string, unknown> | undefined {
  for (let i = 0; i < recorder.calls.length; i++) {
    const call = recorder.calls[i];
    if (call?.method === 'insert' && call.args[0] === table) {
      const next = recorder.calls[i + 1];
      if (next?.method === 'values') return next.args[0] as Record<string, unknown>;
    }
  }
  return undefined;
}

async function makeCaller() {
  const { preferencesRouter } = await import('./preferences');
  return preferencesRouter.createCaller({ db: mockDb as never, userId: 'clerk-user-1' });
}

// ---------------------------------------------------------------------------
// Lifecycle + fixtures
// ---------------------------------------------------------------------------
const INTERNAL_USER_ID = 'internal-uuid-1';
const TITLE_UUID = '11111111-1111-4111-8111-111111111111';

const baseInput = {
  titleId: TITLE_UUID,
  mode: 'dislike' as const,
  questionShown: 'What put you off The Real Housewives of Atlanta?',
  optionsShown: [{ label: 'None of these fit', slugs: [] }],
  selectedSlugs: [],
  noneOfTheseFit: true,
};

beforeEach(() => {
  recorder.reset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('preferencesRouter.recordReasonFeedback', () => {
  it('appends one row keyed by the resolved internal user id', async () => {
    recorder.enqueueReturn([{ id: INTERNAL_USER_ID }]); // user lookup
    recorder.enqueueReturn([]); // insert resolves

    const caller = await makeCaller();
    await caller.recordReasonFeedback(baseInput);

    const row = findInsertedRow(reasonFeedbackEventsTable);
    expect(row?.userId).toBe(INTERNAL_USER_ID);
    expect(row?.titleId).toBe(TITLE_UUID);
  });

  it('passes the none_of_these_fit flag through unchanged', async () => {
    recorder.enqueueReturn([{ id: INTERNAL_USER_ID }]);
    recorder.enqueueReturn([]);

    const caller = await makeCaller();
    await caller.recordReasonFeedback({ ...baseInput, noneOfTheseFit: true });

    expect(findInsertedRow(reasonFeedbackEventsTable)?.noneOfTheseFit).toBe(true);
  });

  it('stores whitespace-only free text as NULL', async () => {
    recorder.enqueueReturn([{ id: INTERNAL_USER_ID }]);
    recorder.enqueueReturn([]);

    const caller = await makeCaller();
    await caller.recordReasonFeedback({ ...baseInput, freeText: '   ' });

    expect(findInsertedRow(reasonFeedbackEventsTable)?.freeText).toBeNull();
  });

  it('trims surrounding whitespace from non-empty free text', async () => {
    recorder.enqueueReturn([{ id: INTERNAL_USER_ID }]);
    recorder.enqueueReturn([]);

    const caller = await makeCaller();
    await caller.recordReasonFeedback({ ...baseInput, freeText: '  just lowbrow reality TV  ' });

    expect(findInsertedRow(reasonFeedbackEventsTable)?.freeText).toBe('just lowbrow reality TV');
  });

  it('omitted free text is stored as NULL', async () => {
    recorder.enqueueReturn([{ id: INTERNAL_USER_ID }]);
    recorder.enqueueReturn([]);

    const caller = await makeCaller();
    await caller.recordReasonFeedback(baseInput);

    expect(findInsertedRow(reasonFeedbackEventsTable)?.freeText).toBeNull();
  });

  it('does not insert when the user row cannot be resolved', async () => {
    recorder.enqueueReturn([]); // user lookup returns no row

    const caller = await makeCaller();
    const result = await caller.recordReasonFeedback(baseInput);

    expect(result).toEqual({ ok: false });
    expect(findInsertedRow(reasonFeedbackEventsTable)).toBeUndefined();
  });
});
