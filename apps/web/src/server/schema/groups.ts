import { jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users';

// Group recommendations per ADR-0020. Three tables:
//
//   groups               — one row per group; carries name + invite token
//   group_memberships    — one row per (group, user) membership
//   group_recommendations — JSONB cache of the latest computed group recs
//
// All cascade-delete on user erasure per ADR-0012 §account-deletion: when
// a user is deleted, their owned groups vanish (taking memberships +
// recs with them) AND their memberships in other groups vanish (leaving
// the group intact for remaining members).
//
// Privacy posture per ROADMAP M7: members see group recs + each other's
// displayName + avatar only. They do NOT see other members' tastes,
// anchors, library, or per-title ratings. The only cross-member data
// exposed is the per-user-normalised score on each group rec
// (transparency layer per ADR-0020 §UX) — and even that is a single
// number, not the underlying signal.

export const groupMembershipRoleEnum = pgEnum('group_membership_role', ['owner', 'member']);

export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),

  // User-set display name. Length-capped at the tRPC layer (80 chars)
  // since text in PG is unbounded by default.
  name: text('name').notNull(),

  // The user who created the group. Has the 'owner' role on
  // group_memberships and is the only one who can delete the group or
  // remove members. Owner cannot leave their own group; they delete it
  // instead (which cascades to memberships + recs).
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // URL-safe random token used in /groups/join/[token]. Generated at
  // create time, server-side, ~192 bits of entropy. v1 doesn't rotate
  // — owner deletes + recreates to invalidate old links. Rotation API
  // is an M7 follow-on if the leak risk becomes real.
  inviteToken: text('invite_token').notNull().unique(),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const groupMemberships = pgTable(
  'group_memberships',
  {
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: groupMembershipRoleEnum('role').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] })],
);

// Shape of the group_recommendations.payload JSONB — mirrors
// user_recommendations.payload's schemaVersion + items pattern.
export interface GroupRecommendationsPayload {
  readonly schemaVersion: 1;
  /** Params used at compute time. Stored so callers can render
   * "computed with veto=0.5, λ=0.5" if they ever want to surface
   * the algorithm settings. */
  readonly params: {
    readonly vetoThreshold: number;
    readonly lambda: number;
  };
  readonly items: ReadonlyArray<{
    readonly titleId: string;
    readonly groupScore: number;
    /** Map serialised as plain object: userId → 0..1 normalised score.
     * Map ↔ object conversion happens at the writer / reader edges. */
    readonly perUserScores: Readonly<Record<string, number>>;
  }>;
}

export const groupRecommendations = pgTable('group_recommendations', {
  // PK on group_id — one row per group. Cascade with the group itself.
  groupId: uuid('group_id')
    .primaryKey()
    .references(() => groups.id, { onDelete: 'cascade' }),

  payload: jsonb('payload').$type<GroupRecommendationsPayload>().notNull(),

  computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
});
