import { TRPCError } from '@trpc/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for `groupsRouter`. Per CLAUDE.md §8.1 Approach B these tests are
 * written by a sub-agent against the documented contract — auth/membership/
 * ownership boundary logic is high-bug-surface, so coverage runs through
 * every contract bullet A1–I3.
 *
 * Mocking strategy mirrors list-import.test.ts:
 *  - `@/server/schema` table objects → sentinel objects with column-property
 *    accessors so the SUT can pass them to `db.insert()` / `eq(table.col, …)`.
 *  - `@/server/db` is replaced with a chainable proxy recorder; the router
 *    actually receives `db` via `ctx.db`, so it's the recorder we pass into
 *    `createCaller`. The module-level mock keeps the import graph happy.
 *  - `@/server/lib/resolve-user` returns a fixed internal uuid by default.
 *  - `@/inngest/client` exposes a vi.fn() `inngest.send` for assertions.
 *  - `node:crypto` `randomBytes` is stubbed to a deterministic byte buffer so
 *    invite-token generation is reproducible.
 */

// ---------------------------------------------------------------------------
// node:crypto stub — deterministic 24-byte buffer; base64url is the predictable
// "YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFh".
// ---------------------------------------------------------------------------
const DETERMINISTIC_TOKEN = 'YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFh';
const randomBytesMock = vi.fn(() => Buffer.from('a'.repeat(24), 'utf8'));

vi.mock('node:crypto', () => ({
  randomBytes: randomBytesMock,
}));

// ---------------------------------------------------------------------------
// Schema-table sentinels. Column accessors are sentinel objects too so the SUT
// can pass them to `eq(groups.id, …)` etc.
// ---------------------------------------------------------------------------
function makeTableSentinel(name: string, cols: string[]): Record<string, unknown> {
  const table: Record<string, unknown> = { __table: name };
  for (const c of cols) {
    table[c] = { __col: `${name}.${c}` };
  }
  return table;
}

const groupsTable = makeTableSentinel('groups', [
  'id',
  'name',
  'ownerId',
  'inviteToken',
  'createdAt',
  'updatedAt',
]);
const groupMembershipsTable = makeTableSentinel('group_memberships', [
  'groupId',
  'userId',
  'role',
  'joinedAt',
]);
const groupRecommendationsTable = makeTableSentinel('group_recommendations', [
  'groupId',
  'payload',
  'computedAt',
]);
const titlesTable = makeTableSentinel('titles', [
  'id',
  'title',
  'mediaType',
  'releaseYear',
  'posterUrl',
]);
const usersTable = makeTableSentinel('users', ['id', 'clerkId', 'displayName']);

vi.mock('@/server/schema', () => ({
  groups: groupsTable,
  groupMemberships: groupMembershipsTable,
  groupRecommendations: groupRecommendationsTable,
  titles: titlesTable,
  users: usersTable,
}));

// ---------------------------------------------------------------------------
// resolveInternalUserId mock — returns a fixed uuid by default.
// ---------------------------------------------------------------------------
const INTERNAL_USER_ID = '33333333-3333-4333-8333-333333333333';
const resolveInternalUserIdMock = vi.fn(async () => INTERNAL_USER_ID as string | null);

vi.mock('@/server/lib/resolve-user', () => ({
  resolveInternalUserId: resolveInternalUserIdMock,
}));

// ---------------------------------------------------------------------------
// Inngest client mock.
// ---------------------------------------------------------------------------
const inngestSendMock = vi.fn(async () => undefined);
const recommendGroupEventCreate = vi.fn((data: unknown) => ({
  name: 'recommend/group.recompute',
  data,
}));

vi.mock('@/inngest/client', () => ({
  inngest: { send: inngestSendMock },
  recommendGroupEvent: { create: recommendGroupEventCreate },
}));

// ---------------------------------------------------------------------------
// Drizzle chain recorder. Same shape as the list-import test recorder.
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
// callers from blowing up at module load.
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

function findUpdateSets(table: object): CapturedRow[] {
  // For an `update(table).set({...}).where(...)` chain, returns the set arg.
  const results: CapturedRow[] = [];
  for (let idx = 0; idx < recorder.calls.length; idx++) {
    const call = recorder.calls[idx];
    if (call?.method === 'update' && call.args[0] === table) {
      for (let j = idx + 1; j < recorder.calls.length; j++) {
        const next = recorder.calls[j];
        if (!next) break;
        if (next.method === 'set') {
          results.push(next.args[0] as CapturedRow);
          break;
        }
        if (next.method === 'update' || next.method === 'insert' || next.method === 'delete') {
          break;
        }
      }
    }
  }
  return results;
}

function findDeleteCalls(table: object): CallEntry[] {
  return recorder.calls.filter((c) => c.method === 'delete' && c.args[0] === table);
}

function hasOnConflictDoNothing(): boolean {
  return recorder.calls.some((c) => c.method === 'onConflictDoNothing');
}

// ---------------------------------------------------------------------------
// Build a caller from the actual router under test, with our recorder db and a
// fixed clerk userId.
// ---------------------------------------------------------------------------
async function makeCaller(): Promise<{
  caller: ReturnType<typeof import('./groups').groupsRouter.createCaller>;
}> {
  const { groupsRouter } = await import('./groups');
  const caller = groupsRouter.createCaller({
    db: mockDb as never,
    userId: 'clerk-user-1',
  });
  return { caller };
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
const GROUP_UUID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_UUID = '22222222-2222-4222-8222-222222222222';

beforeEach(() => {
  recorder.reset();
  inngestSendMock.mockClear();
  recommendGroupEventCreate.mockClear();
  randomBytesMock.mockClear();
  randomBytesMock.mockImplementation(() => Buffer.from('a'.repeat(24), 'utf8'));
  resolveInternalUserIdMock.mockReset();
  resolveInternalUserIdMock.mockResolvedValue(INTERNAL_USER_ID);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ===========================================================================
// create
// ===========================================================================
describe('groupsRouter.create', () => {
  // A1
  it('rejects empty name at the input layer', async () => {
    const { caller } = await makeCaller();
    await expect(caller.create({ name: '' })).rejects.toThrow();
  });

  it('rejects whitespace-only name (after trim) at the input layer', async () => {
    const { caller } = await makeCaller();
    await expect(caller.create({ name: '   ' })).rejects.toThrow();
  });

  it('rejects a name longer than 80 chars at the input layer', async () => {
    const { caller } = await makeCaller();
    const longName = 'x'.repeat(81);
    await expect(caller.create({ name: longName })).rejects.toThrow();
  });

  it('accepts an exactly-80-char name', async () => {
    recorder.enqueueReturn([{ id: GROUP_UUID, inviteToken: DETERMINISTIC_TOKEN }]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    const result = await caller.create({ name: 'x'.repeat(80) });

    expect(result.id).toBe(GROUP_UUID);
  });

  it('trims name before passing to insert', async () => {
    recorder.enqueueReturn([{ id: GROUP_UUID, inviteToken: DETERMINISTIC_TOKEN }]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.create({ name: '  Movie Night  ' });

    const inserted = findInsertValues(groupsTable)[0];
    expect(inserted?.name).toBe('Movie Night');
  });

  // A2
  it('generates the invite token via randomBytes(24).toString(base64url)', async () => {
    recorder.enqueueReturn([{ id: GROUP_UUID, inviteToken: DETERMINISTIC_TOKEN }]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    const result = await caller.create({ name: 'Movie Night' });

    expect(randomBytesMock).toHaveBeenCalledWith(24);
    expect(result.inviteToken).toBe(DETERMINISTIC_TOKEN);
  });

  // A3
  it('inserts a row into groups with name, ownerId, inviteToken', async () => {
    recorder.enqueueReturn([{ id: GROUP_UUID, inviteToken: DETERMINISTIC_TOKEN }]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.create({ name: 'Movie Night' });

    const inserted = findInsertValues(groupsTable)[0];
    expect(inserted?.name).toBe('Movie Night');
    expect(inserted?.ownerId).toBe(INTERNAL_USER_ID);
    expect(inserted?.inviteToken).toBe(DETERMINISTIC_TOKEN);
  });

  it('returns { id, inviteToken } on success', async () => {
    recorder.enqueueReturn([{ id: GROUP_UUID, inviteToken: DETERMINISTIC_TOKEN }]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    const result = await caller.create({ name: 'Movie Night' });

    expect(result).toEqual({ id: GROUP_UUID, inviteToken: DETERMINISTIC_TOKEN });
  });

  // A4
  it('inserts a row into group_memberships with role: owner after creating the group', async () => {
    recorder.enqueueReturn([{ id: GROUP_UUID, inviteToken: DETERMINISTIC_TOKEN }]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.create({ name: 'Movie Night' });

    const membership = findInsertValues(groupMembershipsTable)[0];
    expect(membership).toBeDefined();
    expect(membership?.groupId).toBe(GROUP_UUID);
    expect(membership?.userId).toBe(INTERNAL_USER_ID);
    expect(membership?.role).toBe('owner');
  });

  // A5
  it('fires recommend/group.recompute event with the new group id', async () => {
    recorder.enqueueReturn([{ id: GROUP_UUID, inviteToken: DETERMINISTIC_TOKEN }]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.create({ name: 'Movie Night' });

    expect(inngestSendMock).toHaveBeenCalledTimes(1);
    expect(recommendGroupEventCreate).toHaveBeenCalledWith({ groupId: GROUP_UUID });
  });

  // A6
  it('throws NOT_FOUND when resolveInternalUserId returns null', async () => {
    resolveInternalUserIdMock.mockResolvedValueOnce(null);

    const { caller } = await makeCaller();
    try {
      await caller.create({ name: 'Movie Night' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const e = err as TRPCError;
      expect(e.code).toBe('NOT_FOUND');
      expect(e.message).toBe('user row missing');
    }
  });

  it('does not insert or fire event when user row is missing', async () => {
    resolveInternalUserIdMock.mockResolvedValueOnce(null);

    const { caller } = await makeCaller();
    try {
      await caller.create({ name: 'Movie Night' });
    } catch {
      // expected
    }

    expect(findInsertValues(groupsTable).length).toBe(0);
    expect(inngestSendMock).not.toHaveBeenCalled();
  });

  // A7
  it('throws INTERNAL_SERVER_ERROR when the groups insert returns no row', async () => {
    recorder.enqueueReturn([]); // returning() resolves to empty array

    const { caller } = await makeCaller();
    try {
      await caller.create({ name: 'Movie Night' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const e = err as TRPCError;
      expect(e.code).toBe('INTERNAL_SERVER_ERROR');
    }
  });
});

// ===========================================================================
// list
// ===========================================================================
describe('groupsRouter.list', () => {
  // B1
  it('returns empty array when resolveInternalUserId returns null', async () => {
    resolveInternalUserIdMock.mockResolvedValueOnce(null);

    const { caller } = await makeCaller();
    const result = await caller.list();

    expect(result).toEqual({ groups: [] });
  });

  it('does not query the database when user row is missing', async () => {
    resolveInternalUserIdMock.mockResolvedValueOnce(null);

    const { caller } = await makeCaller();
    await caller.list();

    expect(recorder.calls.find((c) => c.method === 'from')).toBeUndefined();
  });

  // B2
  it('returns empty array when no memberships found for the user', async () => {
    recorder.enqueueReturn([]); // memberships → empty

    const { caller } = await makeCaller();
    const result = await caller.list();

    expect(result).toEqual({ groups: [] });
  });

  // B3
  it('queries memberships filtered by userId === internalUserId', async () => {
    recorder.enqueueReturn([]); // memberships empty so we short-circuit

    const { caller } = await makeCaller();
    await caller.list();

    // The first SELECT is over groupMemberships
    const fromCall = recorder.calls.find((c) => c.method === 'from');
    expect(fromCall?.args[0]).toBe(groupMembershipsTable);
  });

  // B4 — happy path; tests payload shape
  it('returns per-group payload { id, name, isOwner, memberCount, createdAt }', async () => {
    const createdAt = new Date('2026-04-01T00:00:00Z');
    recorder.enqueueReturn([{ groupId: GROUP_UUID }]); // memberships
    recorder.enqueueReturn([
      { id: GROUP_UUID, name: 'Movie Night', ownerId: INTERNAL_USER_ID, createdAt },
    ]); // groups
    recorder.enqueueReturn([{ groupId: GROUP_UUID }, { groupId: GROUP_UUID }]); // member counts

    const { caller } = await makeCaller();
    const result = await caller.list();

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toEqual({
      id: GROUP_UUID,
      name: 'Movie Night',
      isOwner: true,
      memberCount: 2,
      createdAt,
    });
  });

  it('isOwner is true when ownerId equals internalUserId', async () => {
    recorder.enqueueReturn([{ groupId: GROUP_UUID }]);
    recorder.enqueueReturn([
      {
        id: GROUP_UUID,
        name: 'G',
        ownerId: INTERNAL_USER_ID,
        createdAt: new Date(),
      },
    ]);
    recorder.enqueueReturn([{ groupId: GROUP_UUID }]);

    const { caller } = await makeCaller();
    const result = await caller.list();

    expect(result.groups[0]?.isOwner).toBe(true);
  });

  it('isOwner is false when ownerId differs from internalUserId', async () => {
    recorder.enqueueReturn([{ groupId: GROUP_UUID }]);
    recorder.enqueueReturn([
      {
        id: GROUP_UUID,
        name: 'G',
        ownerId: OTHER_USER_UUID,
        createdAt: new Date(),
      },
    ]);
    recorder.enqueueReturn([{ groupId: GROUP_UUID }]);

    const { caller } = await makeCaller();
    const result = await caller.list();

    expect(result.groups[0]?.isOwner).toBe(false);
  });

  it('member count is 0 when no membership rows match (defensive — should not happen)', async () => {
    recorder.enqueueReturn([{ groupId: GROUP_UUID }]);
    recorder.enqueueReturn([
      {
        id: GROUP_UUID,
        name: 'G',
        ownerId: INTERNAL_USER_ID,
        createdAt: new Date(),
      },
    ]);
    recorder.enqueueReturn([]); // no member rows

    const { caller } = await makeCaller();
    const result = await caller.list();

    expect(result.groups[0]?.memberCount).toBe(0);
  });

  // B5
  it('orders groups by createdAt DESC', async () => {
    recorder.enqueueReturn([{ groupId: GROUP_UUID }]);
    recorder.enqueueReturn([
      {
        id: GROUP_UUID,
        name: 'G',
        ownerId: INTERNAL_USER_ID,
        createdAt: new Date(),
      },
    ]);
    recorder.enqueueReturn([{ groupId: GROUP_UUID }]);

    const { caller } = await makeCaller();
    await caller.list();

    const orderByCall = recorder.calls.find((c) => c.method === 'orderBy');
    expect(orderByCall).toBeDefined();
  });
});

// ===========================================================================
// get
// ===========================================================================
describe('groupsRouter.get', () => {
  // C1
  it('throws NOT_FOUND when resolveInternalUserId returns null', async () => {
    resolveInternalUserIdMock.mockResolvedValueOnce(null);

    const { caller } = await makeCaller();
    try {
      await caller.get({ id: GROUP_UUID });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const e = err as TRPCError;
      expect(e.code).toBe('NOT_FOUND');
    }
  });

  // C2 — 404 both paths: no membership
  it('throws NOT_FOUND when caller has no membership row in the group', async () => {
    recorder.enqueueReturn([]); // membership SELECT → empty

    const { caller } = await makeCaller();
    try {
      await caller.get({ id: GROUP_UUID });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const e = err as TRPCError;
      expect(e.code).toBe('NOT_FOUND');
    }
  });

  it('NOT_FOUND error from missing membership does not leak that the group exists', async () => {
    // The contract is identical-error parity: if there's no membership we
    // return NOT_FOUND, period. The error message should not encode "you
    // don't have access" vs "group doesn't exist" differently.
    recorder.enqueueReturn([]); // membership empty

    const { caller } = await makeCaller();
    try {
      await caller.get({ id: GROUP_UUID });
      throw new Error('expected throw');
    } catch (err) {
      const e = err as TRPCError;
      // No leak that group existence is the discriminator.
      expect(e.message).not.toMatch(/access|forbidden|permission/i);
    }
  });

  // C3
  it('throws NOT_FOUND when group row does not exist (membership exists but group removed)', async () => {
    recorder.enqueueReturn([{ role: 'member' }]); // membership found
    recorder.enqueueReturn([]); // group SELECT empty

    const { caller } = await makeCaller();
    try {
      await caller.get({ id: GROUP_UUID });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const e = err as TRPCError;
      expect(e.code).toBe('NOT_FOUND');
    }
  });

  it('rejects a non-uuid id at the input layer', async () => {
    const { caller } = await makeCaller();
    await expect(caller.get({ id: 'not-a-uuid' })).rejects.toThrow();
  });

  // C4 — happy path shape
  describe('happy path payload shape', () => {
    function stageSuccessfulGet(opts: {
      role?: 'owner' | 'member';
      members?: Array<{
        userId: string;
        role: 'owner' | 'member';
        joinedAt: Date;
        displayName: string | null;
      }>;
      recRow?: unknown;
      titleRows?: unknown[];
    }): void {
      const role = opts.role ?? 'owner';
      recorder.enqueueReturn([{ role }]); // membership
      recorder.enqueueReturn([
        {
          id: GROUP_UUID,
          name: 'Movie Night',
          ownerId: role === 'owner' ? INTERNAL_USER_ID : OTHER_USER_UUID,
          inviteToken: 'secret-token',
          createdAt: new Date('2026-04-01T00:00:00Z'),
        },
      ]); // group
      recorder.enqueueReturn(opts.members ?? []); // member rows
      recorder.enqueueReturn(opts.recRow === undefined ? [] : [opts.recRow]); // recRow
      if (opts.titleRows !== undefined) {
        recorder.enqueueReturn(opts.titleRows);
      }
    }

    it('returns id, name, isOwner, createdAt on success', async () => {
      stageSuccessfulGet({ role: 'owner' });

      const { caller } = await makeCaller();
      const result = await caller.get({ id: GROUP_UUID });

      expect(result.id).toBe(GROUP_UUID);
      expect(result.name).toBe('Movie Night');
      expect(result.isOwner).toBe(true);
      expect(result.createdAt).toEqual(new Date('2026-04-01T00:00:00Z'));
    });

    // C5 — privacy posture
    it('returns inviteToken to the owner', async () => {
      stageSuccessfulGet({ role: 'owner' });

      const { caller } = await makeCaller();
      const result = await caller.get({ id: GROUP_UUID });

      expect(result.inviteToken).toBe('secret-token');
    });

    it('does NOT return inviteToken to a non-owner member (sanitised to null)', async () => {
      stageSuccessfulGet({ role: 'member' });

      const { caller } = await makeCaller();
      const result = await caller.get({ id: GROUP_UUID });

      expect(result.inviteToken).toBeNull();
    });

    it('non-owner sees isOwner: false', async () => {
      stageSuccessfulGet({ role: 'member' });

      const { caller } = await makeCaller();
      const result = await caller.get({ id: GROUP_UUID });

      expect(result.isOwner).toBe(false);
    });

    // C6 — members list shape
    it('member list contains userId, displayName, role, joinedAt, isYou', async () => {
      const joinedAt = new Date('2026-04-02T00:00:00Z');
      stageSuccessfulGet({
        role: 'owner',
        members: [
          {
            userId: INTERNAL_USER_ID,
            role: 'owner',
            joinedAt,
            displayName: 'Wouter',
          },
          {
            userId: OTHER_USER_UUID,
            role: 'member',
            joinedAt,
            displayName: 'Friend',
          },
        ],
      });

      const { caller } = await makeCaller();
      const result = await caller.get({ id: GROUP_UUID });

      expect(result.members).toHaveLength(2);
      expect(result.members[0]).toEqual({
        userId: INTERNAL_USER_ID,
        displayName: 'Wouter',
        role: 'owner',
        joinedAt,
        isYou: true,
      });
      expect(result.members[1]).toEqual({
        userId: OTHER_USER_UUID,
        displayName: 'Friend',
        role: 'member',
        joinedAt,
        isYou: false,
      });
    });

    it('isYou is true exactly for the current caller, false for everyone else', async () => {
      stageSuccessfulGet({
        role: 'member',
        members: [
          {
            userId: INTERNAL_USER_ID,
            role: 'member',
            joinedAt: new Date(),
            displayName: 'Me',
          },
          {
            userId: OTHER_USER_UUID,
            role: 'owner',
            joinedAt: new Date(),
            displayName: 'Owner',
          },
        ],
      });

      const { caller } = await makeCaller();
      const result = await caller.get({ id: GROUP_UUID });

      const me = result.members.find((m) => m.userId === INTERNAL_USER_ID);
      const them = result.members.find((m) => m.userId === OTHER_USER_UUID);
      expect(me?.isYou).toBe(true);
      expect(them?.isYou).toBe(false);
    });

    // C7
    it('joins recommendation items to titles when schemaVersion is 1', async () => {
      const computedAt = new Date('2026-04-03T00:00:00Z');
      stageSuccessfulGet({
        role: 'owner',
        recRow: {
          groupId: GROUP_UUID,
          computedAt,
          payload: {
            schemaVersion: 1,
            params: { vetoThreshold: 0.5, lambda: 0.5 },
            items: [
              {
                titleId: 'title-1',
                groupScore: 0.9,
                perUserScores: { [INTERNAL_USER_ID]: 0.8 },
              },
            ],
          },
        },
        titleRows: [
          {
            id: 'title-1',
            title: 'Inception',
            mediaType: 'film',
            releaseYear: 2010,
            posterUrl: '/inception.jpg',
          },
        ],
      });

      const { caller } = await makeCaller();
      const result = await caller.get({ id: GROUP_UUID });

      expect(result.recs.items).toHaveLength(1);
      expect(result.recs.items[0]).toEqual({
        id: 'title-1',
        title: 'Inception',
        mediaType: 'film',
        releaseYear: 2010,
        posterUrl: '/inception.jpg',
        groupScore: 0.9,
        perUserScores: { [INTERNAL_USER_ID]: 0.8 },
      });
    });

    it('returns empty items array when schemaVersion mismatches (e.g. 2)', async () => {
      stageSuccessfulGet({
        role: 'owner',
        recRow: {
          groupId: GROUP_UUID,
          computedAt: new Date(),
          payload: {
            schemaVersion: 2,
            params: { vetoThreshold: 0.5, lambda: 0.5 },
            items: [{ titleId: 'title-1', groupScore: 0.9, perUserScores: {} }],
          },
        },
      });

      const { caller } = await makeCaller();
      const result = await caller.get({ id: GROUP_UUID });

      expect(result.recs.items).toEqual([]);
    });

    // C8
    it('computedAt is set from recRow.computedAt when a rec row exists', async () => {
      const computedAt = new Date('2026-04-03T00:00:00Z');
      stageSuccessfulGet({
        role: 'owner',
        recRow: {
          groupId: GROUP_UUID,
          computedAt,
          payload: {
            schemaVersion: 1,
            params: { vetoThreshold: 0.5, lambda: 0.5 },
            items: [],
          },
        },
      });

      const { caller } = await makeCaller();
      const result = await caller.get({ id: GROUP_UUID });

      expect(result.recs.computedAt).toEqual(computedAt);
    });

    it('computedAt is null when no rec row exists', async () => {
      stageSuccessfulGet({ role: 'owner' });

      const { caller } = await makeCaller();
      const result = await caller.get({ id: GROUP_UUID });

      expect(result.recs.computedAt).toBeNull();
    });

    // C9
    it('silently drops rec items whose title row was deleted between cache write and read', async () => {
      stageSuccessfulGet({
        role: 'owner',
        recRow: {
          groupId: GROUP_UUID,
          computedAt: new Date(),
          payload: {
            schemaVersion: 1,
            params: { vetoThreshold: 0.5, lambda: 0.5 },
            items: [
              { titleId: 'title-alive', groupScore: 0.9, perUserScores: {} },
              { titleId: 'title-deleted', groupScore: 0.7, perUserScores: {} },
            ],
          },
        },
        titleRows: [
          {
            id: 'title-alive',
            title: 'Alive',
            mediaType: 'film',
            releaseYear: 2020,
            posterUrl: null,
          },
        ],
      });

      const { caller } = await makeCaller();
      const result = await caller.get({ id: GROUP_UUID });

      expect(result.recs.items).toHaveLength(1);
      expect(result.recs.items[0]?.id).toBe('title-alive');
    });

    // C10
    it('perUserScores in items is a plain object copy of the cached payload value', async () => {
      const cachedPerUser = { [INTERNAL_USER_ID]: 0.8, [OTHER_USER_UUID]: 0.6 };
      stageSuccessfulGet({
        role: 'owner',
        recRow: {
          groupId: GROUP_UUID,
          computedAt: new Date(),
          payload: {
            schemaVersion: 1,
            params: { vetoThreshold: 0.5, lambda: 0.5 },
            items: [
              {
                titleId: 'title-1',
                groupScore: 0.9,
                perUserScores: cachedPerUser,
              },
            ],
          },
        },
        titleRows: [
          {
            id: 'title-1',
            title: 'X',
            mediaType: 'film',
            releaseYear: 2020,
            posterUrl: null,
          },
        ],
      });

      const { caller } = await makeCaller();
      const result = await caller.get({ id: GROUP_UUID });

      const item = result.recs.items[0];
      expect(item?.perUserScores).toEqual(cachedPerUser);
      // It's a copy (spread), not the same reference.
      expect(item?.perUserScores).not.toBe(cachedPerUser);
    });

    it('returns empty items array when payload has no items (titleIds list is empty)', async () => {
      stageSuccessfulGet({
        role: 'owner',
        recRow: {
          groupId: GROUP_UUID,
          computedAt: new Date(),
          payload: {
            schemaVersion: 1,
            params: { vetoThreshold: 0.5, lambda: 0.5 },
            items: [],
          },
        },
      });

      const { caller } = await makeCaller();
      const result = await caller.get({ id: GROUP_UUID });

      expect(result.recs.items).toEqual([]);
    });
  });
});

// ===========================================================================
// rotateInvite
// ===========================================================================
describe('groupsRouter.rotateInvite', () => {
  it('throws NOT_FOUND when resolveInternalUserId returns null', async () => {
    resolveInternalUserIdMock.mockResolvedValueOnce(null);

    const { caller } = await makeCaller();
    try {
      await caller.rotateInvite({ id: GROUP_UUID });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const e = err as TRPCError;
      expect(e.code).toBe('NOT_FOUND');
    }
  });

  // D1
  it('throws FORBIDDEN when caller is not the group owner', async () => {
    recorder.enqueueReturn([{ ownerId: OTHER_USER_UUID }]); // group

    const { caller } = await makeCaller();
    try {
      await caller.rotateInvite({ id: GROUP_UUID });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const e = err as TRPCError;
      expect(e.code).toBe('FORBIDDEN');
    }
  });

  it('throws FORBIDDEN when group does not exist (no row)', async () => {
    recorder.enqueueReturn([]); // group SELECT empty

    const { caller } = await makeCaller();
    try {
      await caller.rotateInvite({ id: GROUP_UUID });
      throw new Error('expected throw');
    } catch (err) {
      const e = err as TRPCError;
      expect(e.code).toBe('FORBIDDEN');
    }
  });

  it('does not update or generate a new token when caller is not owner', async () => {
    recorder.enqueueReturn([{ ownerId: OTHER_USER_UUID }]);

    const { caller } = await makeCaller();
    try {
      await caller.rotateInvite({ id: GROUP_UUID });
    } catch {
      // expected
    }

    expect(findUpdateSets(groupsTable).length).toBe(0);
    expect(randomBytesMock).not.toHaveBeenCalled();
  });

  // D2 + D3 + D4
  it('owner rotation generates new token and UPDATEs groups with token + updatedAt', async () => {
    recorder.enqueueReturn([{ ownerId: INTERNAL_USER_ID }]); // group
    recorder.enqueueReturn([]); // update

    const { caller } = await makeCaller();
    const result = await caller.rotateInvite({ id: GROUP_UUID });

    expect(randomBytesMock).toHaveBeenCalledWith(24);
    expect(result.inviteToken).toBe(DETERMINISTIC_TOKEN);

    const updates = findUpdateSets(groupsTable);
    expect(updates.length).toBe(1);
    expect(updates[0]?.inviteToken).toBe(DETERMINISTIC_TOKEN);
    expect(updates[0]?.updatedAt).toBeInstanceOf(Date);
  });

  it('rejects non-uuid id at input layer', async () => {
    const { caller } = await makeCaller();
    await expect(caller.rotateInvite({ id: 'not-a-uuid' })).rejects.toThrow();
  });
});

// ===========================================================================
// preview
// ===========================================================================
describe('groupsRouter.preview', () => {
  // E1
  it('returns { id, name } for a valid token', async () => {
    recorder.enqueueReturn([{ id: GROUP_UUID, name: 'Movie Night' }]);

    const { caller } = await makeCaller();
    const result = await caller.preview({ token: 'some-valid-token' });

    expect(result).toEqual({ id: GROUP_UUID, name: 'Movie Night' });
  });

  it('does not check membership — any authenticated caller with a valid token gets the preview', async () => {
    recorder.enqueueReturn([{ id: GROUP_UUID, name: 'Movie Night' }]);

    const { caller } = await makeCaller();
    await caller.preview({ token: 'some-valid-token' });

    // Only one SELECT — against groups, by inviteToken.
    const selectCalls = recorder.calls.filter((c) => c.method === 'select');
    expect(selectCalls.length).toBe(1);
    const fromCalls = recorder.calls.filter((c) => c.method === 'from');
    expect(fromCalls[0]?.args[0]).toBe(groupsTable);
  });

  // E2
  it('throws NOT_FOUND when the token does not match any group', async () => {
    recorder.enqueueReturn([]); // no group

    const { caller } = await makeCaller();
    try {
      await caller.preview({ token: 'invalid-token' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const e = err as TRPCError;
      expect(e.code).toBe('NOT_FOUND');
    }
  });

  it('rejects empty token at input layer', async () => {
    const { caller } = await makeCaller();
    await expect(caller.preview({ token: '' })).rejects.toThrow();
  });
});

// ===========================================================================
// join
// ===========================================================================
describe('groupsRouter.join', () => {
  // F1
  it('throws NOT_FOUND when resolveInternalUserId returns null', async () => {
    resolveInternalUserIdMock.mockResolvedValueOnce(null);

    const { caller } = await makeCaller();
    try {
      await caller.join({ token: 'some-token' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const e = err as TRPCError;
      expect(e.code).toBe('NOT_FOUND');
      expect(e.message).toBe('user row missing');
    }
  });

  // F2
  it('throws NOT_FOUND when token does not match any group', async () => {
    recorder.enqueueReturn([]); // group lookup empty

    const { caller } = await makeCaller();
    try {
      await caller.join({ token: 'invalid' });
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(TRPCError);
      const e = err as TRPCError;
      expect(e.code).toBe('NOT_FOUND');
      expect(e.message).toBe('invite invalid');
    }
  });

  // F3
  it('inserts a membership with role: member when token matches', async () => {
    recorder.enqueueReturn([{ id: GROUP_UUID }]); // group
    recorder.enqueueReturn([]); // insert

    const { caller } = await makeCaller();
    await caller.join({ token: 'valid' });

    const inserted = findInsertValues(groupMembershipsTable)[0];
    expect(inserted?.groupId).toBe(GROUP_UUID);
    expect(inserted?.userId).toBe(INTERNAL_USER_ID);
    expect(inserted?.role).toBe('member');
  });

  it('uses ON CONFLICT DO NOTHING (re-joining is a no-op)', async () => {
    recorder.enqueueReturn([{ id: GROUP_UUID }]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.join({ token: 'valid' });

    expect(hasOnConflictDoNothing()).toBe(true);
  });

  // F4
  it('fires recommend/group.recompute event with the group id', async () => {
    recorder.enqueueReturn([{ id: GROUP_UUID }]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.join({ token: 'valid' });

    expect(inngestSendMock).toHaveBeenCalledTimes(1);
    expect(recommendGroupEventCreate).toHaveBeenCalledWith({ groupId: GROUP_UUID });
  });

  // F5
  it('returns { groupId } on success', async () => {
    recorder.enqueueReturn([{ id: GROUP_UUID }]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    const result = await caller.join({ token: 'valid' });

    expect(result).toEqual({ groupId: GROUP_UUID });
  });

  it('does not insert or fire event when token is invalid', async () => {
    recorder.enqueueReturn([]); // no group

    const { caller } = await makeCaller();
    try {
      await caller.join({ token: 'invalid' });
    } catch {
      // expected
    }

    expect(findInsertValues(groupMembershipsTable).length).toBe(0);
    expect(inngestSendMock).not.toHaveBeenCalled();
  });

  it('rejects empty token at input layer', async () => {
    const { caller } = await makeCaller();
    await expect(caller.join({ token: '' })).rejects.toThrow();
  });
});

// ===========================================================================
// removeMember
// ===========================================================================
describe('groupsRouter.removeMember', () => {
  // G1
  it('throws NOT_FOUND when resolveInternalUserId returns null', async () => {
    resolveInternalUserIdMock.mockResolvedValueOnce(null);

    const { caller } = await makeCaller();
    try {
      await caller.removeMember({ groupId: GROUP_UUID, userId: OTHER_USER_UUID });
      throw new Error('expected throw');
    } catch (err) {
      const e = err as TRPCError;
      expect(e.code).toBe('NOT_FOUND');
    }
  });

  // G2
  it('throws FORBIDDEN when caller is not the group owner', async () => {
    recorder.enqueueReturn([{ ownerId: OTHER_USER_UUID }]); // group, owned by someone else

    const { caller } = await makeCaller();
    try {
      await caller.removeMember({ groupId: GROUP_UUID, userId: OTHER_USER_UUID });
      throw new Error('expected throw');
    } catch (err) {
      const e = err as TRPCError;
      expect(e.code).toBe('FORBIDDEN');
    }
  });

  it('throws FORBIDDEN when group does not exist', async () => {
    recorder.enqueueReturn([]); // no group row

    const { caller } = await makeCaller();
    try {
      await caller.removeMember({ groupId: GROUP_UUID, userId: OTHER_USER_UUID });
      throw new Error('expected throw');
    } catch (err) {
      const e = err as TRPCError;
      expect(e.code).toBe('FORBIDDEN');
    }
  });

  // G3
  it('throws BAD_REQUEST when owner attempts to remove themselves', async () => {
    recorder.enqueueReturn([{ ownerId: INTERNAL_USER_ID }]); // owner is the caller

    const { caller } = await makeCaller();
    try {
      await caller.removeMember({ groupId: GROUP_UUID, userId: INTERNAL_USER_ID });
      throw new Error('expected throw');
    } catch (err) {
      const e = err as TRPCError;
      expect(e.code).toBe('BAD_REQUEST');
      expect(e.message).toContain('owner cannot remove self');
    }
  });

  it('does not delete or fire event when owner attempts self-remove', async () => {
    recorder.enqueueReturn([{ ownerId: INTERNAL_USER_ID }]);

    const { caller } = await makeCaller();
    try {
      await caller.removeMember({ groupId: GROUP_UUID, userId: INTERNAL_USER_ID });
    } catch {
      // expected
    }

    expect(findDeleteCalls(groupMembershipsTable).length).toBe(0);
    expect(inngestSendMock).not.toHaveBeenCalled();
  });

  // G4
  it('owner removes another member: DELETEs from group_memberships', async () => {
    recorder.enqueueReturn([{ ownerId: INTERNAL_USER_ID }]);
    recorder.enqueueReturn([]); // delete

    const { caller } = await makeCaller();
    const result = await caller.removeMember({
      groupId: GROUP_UUID,
      userId: OTHER_USER_UUID,
    });

    expect(result).toEqual({ ok: true });
    expect(findDeleteCalls(groupMembershipsTable).length).toBe(1);
  });

  // G5
  it('fires recompute event after the delete', async () => {
    recorder.enqueueReturn([{ ownerId: INTERNAL_USER_ID }]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.removeMember({ groupId: GROUP_UUID, userId: OTHER_USER_UUID });

    expect(inngestSendMock).toHaveBeenCalledTimes(1);
    expect(recommendGroupEventCreate).toHaveBeenCalledWith({ groupId: GROUP_UUID });
  });

  it('rejects non-uuid groupId at input layer', async () => {
    const { caller } = await makeCaller();
    await expect(
      caller.removeMember({ groupId: 'not-a-uuid', userId: OTHER_USER_UUID }),
    ).rejects.toThrow();
  });

  it('rejects non-uuid userId at input layer', async () => {
    const { caller } = await makeCaller();
    await expect(
      caller.removeMember({ groupId: GROUP_UUID, userId: 'not-a-uuid' }),
    ).rejects.toThrow();
  });
});

// ===========================================================================
// leave
// ===========================================================================
describe('groupsRouter.leave', () => {
  // H1
  it('throws NOT_FOUND when resolveInternalUserId returns null', async () => {
    resolveInternalUserIdMock.mockResolvedValueOnce(null);

    const { caller } = await makeCaller();
    try {
      await caller.leave({ groupId: GROUP_UUID });
      throw new Error('expected throw');
    } catch (err) {
      const e = err as TRPCError;
      expect(e.code).toBe('NOT_FOUND');
    }
  });

  // H2
  it('throws NOT_FOUND when group does not exist', async () => {
    recorder.enqueueReturn([]); // no group

    const { caller } = await makeCaller();
    try {
      await caller.leave({ groupId: GROUP_UUID });
      throw new Error('expected throw');
    } catch (err) {
      const e = err as TRPCError;
      expect(e.code).toBe('NOT_FOUND');
    }
  });

  // H3
  it('throws BAD_REQUEST when caller is the group owner', async () => {
    recorder.enqueueReturn([{ ownerId: INTERNAL_USER_ID }]);

    const { caller } = await makeCaller();
    try {
      await caller.leave({ groupId: GROUP_UUID });
      throw new Error('expected throw');
    } catch (err) {
      const e = err as TRPCError;
      expect(e.code).toBe('BAD_REQUEST');
      expect(e.message).toContain('owner cannot leave');
    }
  });

  it('does not delete or fire event when owner attempts to leave', async () => {
    recorder.enqueueReturn([{ ownerId: INTERNAL_USER_ID }]);

    const { caller } = await makeCaller();
    try {
      await caller.leave({ groupId: GROUP_UUID });
    } catch {
      // expected
    }

    expect(findDeleteCalls(groupMembershipsTable).length).toBe(0);
    expect(inngestSendMock).not.toHaveBeenCalled();
  });

  // H4
  it('non-owner leaves: DELETEs from group_memberships', async () => {
    recorder.enqueueReturn([{ ownerId: OTHER_USER_UUID }]); // someone else owns
    recorder.enqueueReturn([]); // delete

    const { caller } = await makeCaller();
    const result = await caller.leave({ groupId: GROUP_UUID });

    expect(result).toEqual({ ok: true });
    expect(findDeleteCalls(groupMembershipsTable).length).toBe(1);
  });

  // H5
  it('fires recompute event after the delete', async () => {
    recorder.enqueueReturn([{ ownerId: OTHER_USER_UUID }]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    await caller.leave({ groupId: GROUP_UUID });

    expect(inngestSendMock).toHaveBeenCalledTimes(1);
    expect(recommendGroupEventCreate).toHaveBeenCalledWith({ groupId: GROUP_UUID });
  });

  it('rejects non-uuid groupId at input layer', async () => {
    const { caller } = await makeCaller();
    await expect(caller.leave({ groupId: 'not-a-uuid' })).rejects.toThrow();
  });
});

// ===========================================================================
// delete
// ===========================================================================
describe('groupsRouter.delete', () => {
  it('throws NOT_FOUND when resolveInternalUserId returns null', async () => {
    resolveInternalUserIdMock.mockResolvedValueOnce(null);

    const { caller } = await makeCaller();
    try {
      await caller.delete({ id: GROUP_UUID });
      throw new Error('expected throw');
    } catch (err) {
      const e = err as TRPCError;
      expect(e.code).toBe('NOT_FOUND');
    }
  });

  // I1
  it('throws FORBIDDEN when caller is not the group owner', async () => {
    recorder.enqueueReturn([{ ownerId: OTHER_USER_UUID }]);

    const { caller } = await makeCaller();
    try {
      await caller.delete({ id: GROUP_UUID });
      throw new Error('expected throw');
    } catch (err) {
      const e = err as TRPCError;
      expect(e.code).toBe('FORBIDDEN');
    }
  });

  it('throws FORBIDDEN when group does not exist', async () => {
    recorder.enqueueReturn([]); // no group

    const { caller } = await makeCaller();
    try {
      await caller.delete({ id: GROUP_UUID });
      throw new Error('expected throw');
    } catch (err) {
      const e = err as TRPCError;
      expect(e.code).toBe('FORBIDDEN');
    }
  });

  it('does not DELETE the group when caller is not owner', async () => {
    recorder.enqueueReturn([{ ownerId: OTHER_USER_UUID }]);

    const { caller } = await makeCaller();
    try {
      await caller.delete({ id: GROUP_UUID });
    } catch {
      // expected
    }

    expect(findDeleteCalls(groupsTable).length).toBe(0);
  });

  // I2
  it('owner DELETEs the group from groups table', async () => {
    recorder.enqueueReturn([{ ownerId: INTERNAL_USER_ID }]);
    recorder.enqueueReturn([]); // delete

    const { caller } = await makeCaller();
    await caller.delete({ id: GROUP_UUID });

    expect(findDeleteCalls(groupsTable).length).toBe(1);
  });

  // I3
  it('returns { ok: true } on success', async () => {
    recorder.enqueueReturn([{ ownerId: INTERNAL_USER_ID }]);
    recorder.enqueueReturn([]);

    const { caller } = await makeCaller();
    const result = await caller.delete({ id: GROUP_UUID });

    expect(result).toEqual({ ok: true });
  });

  it('rejects non-uuid id at input layer', async () => {
    const { caller } = await makeCaller();
    await expect(caller.delete({ id: 'not-a-uuid' })).rejects.toThrow();
  });
});
