import { and, desc, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import {
  privacyLevelEnum,
  titles,
  users,
  watchEntries,
  watchEntryKindEnum,
  watchStatusEnum,
} from '../schema';
import { protectedProcedure, router } from '../trpc';

// Zod schemas auto-synced with the Drizzle pgEnum values — single source of
// truth lives in apps/web/src/server/schema/watch.ts. Drift between Drizzle
// enums and Zod schemas would be caught at typecheck thanks to z.enum's
// strict tuple typing.
const kindSchema = z.enum(watchEntryKindEnum.enumValues);
const statusSchema = z.enum(watchStatusEnum.enumValues);
const privacySchema = z.enum(privacyLevelEnum.enumValues);

const titleIdSchema = z.string().uuid();

// Resolves the Clerk session userId → users.id (internal uuid) once per
// procedure call. The watch_entries FK is on users.id, not clerk_id, so
// every procedure that touches watch_entries needs this hop. Putting it
// in the protectedProcedure middleware would shave one query per call but
// would add it for procedures that don't need it (e.g. me.get) — net wash
// at this scale, so keep it inline.
async function resolveInternalUserId(
  db: typeof import('../db').db,
  clerkId: string,
): Promise<string | null> {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);
  return user?.id ?? null;
}

export const watchRouter = router({
  // List the current user's watch entries, optionally filtered by status.
  // Joins titles to return display data (title text, year, poster, media
  // type) inline — saves a round-trip vs. fetching titles separately on
  // the client. Sorted by most-recently-updated first.
  list: protectedProcedure
    .input(
      z
        .object({
          status: statusSchema.optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) return [];

      const conditions = [eq(watchEntries.userId, internalUserId)];
      if (input?.status) {
        conditions.push(eq(watchEntries.status, input.status));
      }

      return ctx.db
        .select({
          entry: watchEntries,
          title: {
            id: titles.id,
            title: titles.title,
            mediaType: titles.mediaType,
            releaseYear: titles.releaseYear,
            posterUrl: titles.posterUrl,
          },
        })
        .from(watchEntries)
        .innerJoin(titles, eq(watchEntries.titleId, titles.id))
        .where(and(...conditions))
        .orderBy(desc(watchEntries.updatedAt));
    }),

  // Get the current user's watch entry for a single title, or null if
  // no entry exists. The "is this title in my list?" query — used by
  // title detail pages to render the right button state.
  get: protectedProcedure
    .input(z.object({ titleId: titleIdSchema }))
    .query(async ({ ctx, input }) => {
      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) return null;

      const [row] = await ctx.db
        .select()
        .from(watchEntries)
        .where(
          and(eq(watchEntries.userId, internalUserId), eq(watchEntries.titleId, input.titleId)),
        )
        .limit(1);
      return row ?? null;
    }),

  // Create-or-update a watch entry for (currentUser, titleId). Used by
  // both M3 intake paths:
  //   - Path A (onboarding anchor): { kind: 'anchor', titleId }
  //   - Path B (manual tracking):   { kind: 'tracking', titleId, status, rating?, ... }
  //
  // Partial-update semantics: only fields explicitly provided in input are
  // updated on conflict. So "user rates a title they already had on their
  // list" sends just { titleId, kind, rating } and doesn't touch status /
  // notes / etc. The kind field is the discriminator and is always
  // overwritten (an anchor pick promoting to tracking is the expected
  // graduation path).
  upsert: protectedProcedure
    .input(
      z.object({
        titleId: titleIdSchema,
        kind: kindSchema,
        status: statusSchema.optional(),
        rating: z.number().int().min(1).max(10).optional(),
        currentEpisode: z.number().int().min(0).optional(),
        notes: z.string().max(5000).optional(),
        privacy: privacySchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User row not found — was me.ensure called for this session?',
        });
      }

      // Only update fields that were explicitly provided. kind always
      // overwrites (anchor → tracking is the expected promotion path).
      const updateSet: Partial<typeof watchEntries.$inferInsert> = {
        kind: input.kind,
        updatedAt: new Date(),
      };
      if (input.status !== undefined) updateSet.status = input.status;
      if (input.rating !== undefined) updateSet.rating = input.rating;
      if (input.currentEpisode !== undefined) updateSet.currentEpisode = input.currentEpisode;
      if (input.notes !== undefined) updateSet.notes = input.notes;
      if (input.privacy !== undefined) updateSet.privacy = input.privacy;

      const [row] = await ctx.db
        .insert(watchEntries)
        .values({
          userId: internalUserId,
          titleId: input.titleId,
          kind: input.kind,
          status: input.status,
          rating: input.rating,
          currentEpisode: input.currentEpisode,
          notes: input.notes,
          privacy: input.privacy,
        })
        .onConflictDoUpdate({
          target: [watchEntries.userId, watchEntries.titleId],
          set: updateSet,
        })
        .returning();

      // ON CONFLICT DO UPDATE always returns the row (winner or loser of
      // any race), so this should be unreachable. Same invariant pattern
      // as ensure-user.ts.
      if (!row) {
        throw new Error(
          `watch.upsert: no row returned for user=${internalUserId} title=${input.titleId}`,
        );
      }
      return row;
    }),

  // Remove the current user's entry for a single title. Idempotent —
  // returns the count so callers can verify (0 means there was no entry).
  // This is "remove from my list," NOT a DSAR delete (that's at
  // /api/account/delete and removes the entire user).
  remove: protectedProcedure
    .input(z.object({ titleId: titleIdSchema }))
    .mutation(async ({ ctx, input }) => {
      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) return { removed: 0 };

      const result = await ctx.db
        .delete(watchEntries)
        .where(
          and(eq(watchEntries.userId, internalUserId), eq(watchEntries.titleId, input.titleId)),
        )
        .returning({ id: watchEntries.id });

      return { removed: result.length };
    }),
});
