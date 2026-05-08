import { randomBytes } from 'node:crypto';
import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { inngest, recommendGroupEvent } from '@/inngest/client';
import { groupMemberships, groupRecommendations, groups, titles, users } from '../schema';
import { resolveInternalUserId } from '../lib/resolve-user';
import { protectedProcedure, router } from '../trpc';

// Group rec procedures per ADR-0020 + ROADMAP M7.
//
// Authorisation model:
//   - protectedProcedure (Clerk auth) gates every endpoint
//   - resolveInternalUserId maps clerkId → users.id
//   - Read endpoints check group membership before returning data
//   - Write endpoints (invite, removeMember, delete) check 'owner' role
//   - join is the one endpoint that operates on a group the caller is
//     not yet a member of — gated by the unguessable invite token

const NAME_MAX = 80;
const groupNameSchema = z
  .string()
  .min(1, 'name required')
  .max(NAME_MAX, `name max ${NAME_MAX} chars`)
  .trim();

/** Generates an unguessable URL-safe invite token. ~192 bits of entropy
 * via 24 random bytes → 32-char base64url. */
function generateInviteToken(): string {
  return randomBytes(24).toString('base64url');
}

export const groupsRouter = router({
  // Create a new group with the caller as owner. Returns the created
  // group's id + invite token. The invite token is shown to the owner
  // immediately so they can build the share link client-side.
  create: protectedProcedure
    .input(z.object({ name: groupNameSchema }))
    .mutation(async ({ ctx, input }) => {
      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'user row missing' });
      }

      const inviteToken = generateInviteToken();
      const [group] = await ctx.db
        .insert(groups)
        .values({
          name: input.name,
          ownerId: internalUserId,
          inviteToken,
        })
        .returning({ id: groups.id, inviteToken: groups.inviteToken });
      if (!group) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // Auto-add the creator as the 'owner' member so list / get queries
      // that filter by membership find them.
      await ctx.db.insert(groupMemberships).values({
        groupId: group.id,
        userId: internalUserId,
        role: 'owner',
      });

      // Fire-and-forward recompute so the new group has recs by the time
      // the user lands on /groups/[id]. Single-member group will produce
      // recs equivalent to that user's personal recs, post-veto/lambda.
      await inngest.send(recommendGroupEvent.create({ groupId: group.id }));

      return { id: group.id, inviteToken: group.inviteToken };
    }),

  // List the caller's groups (owned + joined). Includes member count
  // and last-computed timestamp for the dashboard list rendering.
  list: protectedProcedure.query(async ({ ctx }) => {
    const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
    if (!internalUserId) return { groups: [] };

    // groups the caller is a member of
    const myMemberships = await ctx.db
      .select({ groupId: groupMemberships.groupId })
      .from(groupMemberships)
      .where(eq(groupMemberships.userId, internalUserId));
    const myGroupIds = myMemberships.map((m) => m.groupId);
    if (myGroupIds.length === 0) return { groups: [] };

    const rows = await ctx.db
      .select({
        id: groups.id,
        name: groups.name,
        ownerId: groups.ownerId,
        createdAt: groups.createdAt,
      })
      .from(groups)
      .where(inArray(groups.id, myGroupIds))
      .orderBy(desc(groups.createdAt));

    // Member count per group — single query grouping by groupId.
    const memberCounts = new Map<string, number>();
    const membershipRows = await ctx.db
      .select({ groupId: groupMemberships.groupId })
      .from(groupMemberships)
      .where(inArray(groupMemberships.groupId, myGroupIds));
    for (const m of membershipRows) {
      memberCounts.set(m.groupId, (memberCounts.get(m.groupId) ?? 0) + 1);
    }

    return {
      groups: rows.map((g) => ({
        id: g.id,
        name: g.name,
        isOwner: g.ownerId === internalUserId,
        memberCount: memberCounts.get(g.id) ?? 0,
        createdAt: g.createdAt,
      })),
    };
  }),

  // Full group view — group meta, member list (display name + avatar
  // only per ROADMAP M7 privacy), and the latest cached recs (resolved
  // to title metadata for display). 404 if the caller isn't a member.
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) throw new TRPCError({ code: 'NOT_FOUND' });

      // Membership check — enforced via the join, not by exposing the
      // group existence to non-members.
      const [membership] = await ctx.db
        .select({ role: groupMemberships.role })
        .from(groupMemberships)
        .where(
          and(eq(groupMemberships.groupId, input.id), eq(groupMemberships.userId, internalUserId)),
        )
        .limit(1);
      if (!membership) throw new TRPCError({ code: 'NOT_FOUND' });

      const [group] = await ctx.db
        .select({
          id: groups.id,
          name: groups.name,
          ownerId: groups.ownerId,
          inviteToken: groups.inviteToken,
          createdAt: groups.createdAt,
        })
        .from(groups)
        .where(eq(groups.id, input.id))
        .limit(1);
      if (!group) throw new TRPCError({ code: 'NOT_FOUND' });

      const memberRows = await ctx.db
        .select({
          userId: groupMemberships.userId,
          role: groupMemberships.role,
          joinedAt: groupMemberships.joinedAt,
          displayName: users.displayName,
        })
        .from(groupMemberships)
        .innerJoin(users, eq(groupMemberships.userId, users.id))
        .where(eq(groupMemberships.groupId, input.id));

      const [recRow] = await ctx.db
        .select()
        .from(groupRecommendations)
        .where(eq(groupRecommendations.groupId, input.id))
        .limit(1);

      let recItems: Array<{
        id: string;
        title: string;
        mediaType: 'tv' | 'film' | 'anime';
        releaseYear: number | null;
        posterUrl: string | null;
        groupScore: number;
        perUserScores: Record<string, number>;
      }> = [];
      let computedAt: Date | null = null;

      if (recRow && recRow.payload.schemaVersion === 1) {
        computedAt = recRow.computedAt;
        const titleIds = recRow.payload.items.map((i) => i.titleId);
        if (titleIds.length > 0) {
          const titleRows = await ctx.db
            .select({
              id: titles.id,
              title: titles.title,
              mediaType: titles.mediaType,
              releaseYear: titles.releaseYear,
              posterUrl: titles.posterUrl,
            })
            .from(titles)
            .where(inArray(titles.id, titleIds));
          const titleById = new Map(titleRows.map((t) => [t.id, t]));
          recItems = recRow.payload.items.flatMap((item) => {
            const t = titleById.get(item.titleId);
            if (!t) return [];
            return [
              {
                ...t,
                groupScore: item.groupScore,
                perUserScores: { ...item.perUserScores },
              },
            ];
          });
        }
      }

      // Only the owner sees the invite token (and can therefore share
      // it). Members see a sanitised view without the join URL.
      const isOwner = membership.role === 'owner';

      return {
        id: group.id,
        name: group.name,
        isOwner,
        inviteToken: isOwner ? group.inviteToken : null,
        createdAt: group.createdAt,
        members: memberRows.map((m) => ({
          userId: m.userId,
          displayName: m.displayName,
          role: m.role,
          joinedAt: m.joinedAt,
          isYou: m.userId === internalUserId,
        })),
        recs: {
          items: recItems,
          computedAt,
        },
      };
    }),

  // Owner-only: rotate the invite token. Invalidates the previous link.
  rotateInvite: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) throw new TRPCError({ code: 'NOT_FOUND' });

      const [group] = await ctx.db
        .select({ ownerId: groups.ownerId })
        .from(groups)
        .where(eq(groups.id, input.id))
        .limit(1);
      if (!group || group.ownerId !== internalUserId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      const newToken = generateInviteToken();
      await ctx.db
        .update(groups)
        .set({ inviteToken: newToken, updatedAt: new Date() })
        .where(eq(groups.id, input.id));
      return { inviteToken: newToken };
    }),

  // Resolve an invite token to a group preview WITHOUT joining. Used by
  // the /groups/join/[token] page to show "join {groupName}?" before
  // the user commits.
  preview: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [group] = await ctx.db
        .select({ id: groups.id, name: groups.name })
        .from(groups)
        .where(eq(groups.inviteToken, input.token))
        .limit(1);
      if (!group) throw new TRPCError({ code: 'NOT_FOUND' });
      return group;
    }),

  // Accept an invite token and add the caller as a 'member'. Idempotent —
  // re-joining via the same link is a no-op (returns the existing
  // membership). Returns the group id so the client can navigate.
  join: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'user row missing' });
      }

      const [group] = await ctx.db
        .select({ id: groups.id })
        .from(groups)
        .where(eq(groups.inviteToken, input.token))
        .limit(1);
      if (!group) throw new TRPCError({ code: 'NOT_FOUND', message: 'invite invalid' });

      // ON CONFLICT DO NOTHING — re-joining is a no-op rather than an
      // error. The PK on (groupId, userId) is the conflict target.
      await ctx.db
        .insert(groupMemberships)
        .values({
          groupId: group.id,
          userId: internalUserId,
          role: 'member',
        })
        .onConflictDoNothing();

      // Recompute group recs to include the new member's taste signal.
      await inngest.send(recommendGroupEvent.create({ groupId: group.id }));

      return { groupId: group.id };
    }),

  // Owner-only: remove a member from the group. Owner cannot remove
  // themselves (they delete the group instead).
  removeMember: protectedProcedure
    .input(z.object({ groupId: z.string().uuid(), userId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) throw new TRPCError({ code: 'NOT_FOUND' });

      const [group] = await ctx.db
        .select({ ownerId: groups.ownerId })
        .from(groups)
        .where(eq(groups.id, input.groupId))
        .limit(1);
      if (!group || group.ownerId !== internalUserId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      if (input.userId === internalUserId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'owner cannot remove self — delete the group instead',
        });
      }

      await ctx.db
        .delete(groupMemberships)
        .where(
          and(
            eq(groupMemberships.groupId, input.groupId),
            eq(groupMemberships.userId, input.userId),
          ),
        );

      // Recompute so the removed member's veto / score signal is gone.
      await inngest.send(recommendGroupEvent.create({ groupId: input.groupId }));

      return { ok: true };
    }),

  // Caller leaves a group they're a member of (not owner). Owner can't
  // leave their own group — delete it instead.
  leave: protectedProcedure
    .input(z.object({ groupId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) throw new TRPCError({ code: 'NOT_FOUND' });

      const [group] = await ctx.db
        .select({ ownerId: groups.ownerId })
        .from(groups)
        .where(eq(groups.id, input.groupId))
        .limit(1);
      if (!group) throw new TRPCError({ code: 'NOT_FOUND' });
      if (group.ownerId === internalUserId) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'owner cannot leave their own group — delete it instead',
        });
      }

      await ctx.db
        .delete(groupMemberships)
        .where(
          and(
            eq(groupMemberships.groupId, input.groupId),
            eq(groupMemberships.userId, internalUserId),
          ),
        );

      // Recompute so the leaver's veto / score signal is gone for the
      // remaining members.
      await inngest.send(recommendGroupEvent.create({ groupId: input.groupId }));

      return { ok: true };
    }),

  // Owner-only: delete the group. Cascades to memberships + recs via FK.
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) throw new TRPCError({ code: 'NOT_FOUND' });

      const [group] = await ctx.db
        .select({ ownerId: groups.ownerId })
        .from(groups)
        .where(eq(groups.id, input.id))
        .limit(1);
      if (!group || group.ownerId !== internalUserId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      await ctx.db.delete(groups).where(eq(groups.id, input.id));
      return { ok: true };
    }),
});
