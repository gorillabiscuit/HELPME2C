import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import * as Sentry from '@sentry/nextjs';
import {
  pairwiseComparisons,
  privacyLevelEnum,
  titles,
  users,
  watchEntries,
  watchEntryKindEnum,
  watchStatusEnum,
} from '../schema';
import { franchiseDisplayName, franchiseKey, franchiseSpecificity } from '../lib/franchise';
import { resolveInternalUserId } from '../lib/resolve-user';
import { protectedProcedure, router } from '../trpc';
import { inngest, recommendUserEvent } from '@/inngest/client';

// Elo constants. K=32 is standard for chess; same here. Starting Elo
// is 1500 — a title's first comparison initialises both sides at 1500
// if they haven't been compared yet, then runs the standard update.
const ELO_K_FACTOR = 32;
const ELO_STARTING = 1500;

function eloExpected(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

function eloUpdate(current: number, expected: number, actual: 0 | 1): number {
  return current + ELO_K_FACTOR * (actual - expected);
}

// Fire-and-forget rec recompute trigger. The nightly cron at 04:00 UTC is
// the floor; this event fires whenever a user's watch_entries change so
// fresh picks show recommendations within seconds, not up to 24 hours.
// Inngest debouncing on the recommendUser function (30s window per userId,
// see recommend.ts) coalesces bursts — onboarding pick 6 anchors in
// 10 seconds = one recompute, not six.
//
// If Inngest is unreachable we don't fail the user-facing mutation; the
// nightly cron will catch up. Failure is logged to Sentry rather than
// silently swallowed (CLAUDE.md §3 silent-catch ban).
async function triggerRecomputeSafely(internalUserId: string): Promise<void> {
  try {
    await inngest.send(recommendUserEvent.create({ userId: internalUserId }));
  } catch (err) {
    Sentry.captureException(err, {
      tags: { source: 'watch.router', op: 'trigger-recompute' },
      extra: { internalUserId },
    });
  }
}

// Zod schemas auto-synced with the Drizzle pgEnum values — single source of
// truth lives in apps/web/src/server/schema/watch.ts. Drift between Drizzle
// enums and Zod schemas would be caught at typecheck thanks to z.enum's
// strict tuple typing.
const kindSchema = z.enum(watchEntryKindEnum.enumValues);
const statusSchema = z.enum(watchStatusEnum.enumValues);
const privacySchema = z.enum(privacyLevelEnum.enumValues);

const titleIdSchema = z.string().uuid();

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
      // Inlined user lookup (rather than resolveInternalUserId) so we can
      // grab default_privacy in the same round-trip. The INSERT branch of
      // the upsert uses it as a fallback when input.privacy is undefined —
      // respects the user's chosen default for new entries. The UPDATE
      // branch never touches privacy unless explicitly provided.
      const [userRow] = await ctx.db
        .select({ id: users.id, defaultPrivacy: users.defaultPrivacy })
        .from(users)
        .where(eq(users.clerkId, ctx.userId))
        .limit(1);
      if (!userRow) {
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
          userId: userRow.id,
          titleId: input.titleId,
          kind: input.kind,
          status: input.status,
          rating: input.rating,
          currentEpisode: input.currentEpisode,
          notes: input.notes,
          // Fall back to the user's default when the client didn't pick.
          // Column-level default ('private') is still a final safety net
          // if defaultPrivacy is somehow null, but the schema NOT NULL +
          // 'private' default guarantee it isn't.
          privacy: input.privacy ?? userRow.defaultPrivacy,
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
          `watch.upsert: no row returned for user=${userRow.id} title=${input.titleId}`,
        );
      }

      // Fire even when fields the rec engine doesn't read changed
      // (status, notes, episode, privacy). Cheaper to over-fire and let
      // Inngest debounce than to track which fields are taste-relevant.
      await triggerRecomputeSafely(userRow.id);
      return row;
    }),

  // Returns the current user's "taste" — every rated entry, ordered by
  // (manual_rank if set) → (elo_score if set) → (rating). Includes title
  // metadata for inline rendering. Used by the /taste page's ranked
  // view + as the candidate pool for pairwise comparisons.
  // Returns the user's rated taste grouped by FRANCHISE per ADR-0023.
  // One row per franchise; each carries the canonical representative's
  // display data + a `seasons` array of all the user's rated entries
  // in that franchise sorted by releaseYear ASC.
  //
  // Franchises sort by representative's manual_rank ASC NULLS LAST,
  // then by mean rating DESC, then by representative titleId for
  // determinism. Seasons within a franchise sort by release year.
  taste: protectedProcedure.query(async ({ ctx }) => {
    const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
    if (!internalUserId) return [];

    const rows = await ctx.db
      .select({
        titleId: watchEntries.titleId,
        rating: watchEntries.rating,
        eloScore: watchEntries.eloScore,
        manualRank: watchEntries.manualRank,
        status: watchEntries.status,
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
      .where(and(eq(watchEntries.userId, internalUserId), isNotNull(watchEntries.rating)));

    // Group by franchise. The representative is the lowest-specificity
    // entry; the franchise's manual_rank / eloScore come from that row.
    type RowEntry = (typeof rows)[number];
    type Group = {
      franchiseKey: string;
      representative: RowEntry;
      representativeSpecificity: number;
      seasons: RowEntry[];
    };
    const groups = new Map<string, Group>();
    for (const row of rows) {
      const key = franchiseKey(row.title.title);
      const specificity = franchiseSpecificity(row.title.title, key);
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          franchiseKey: key,
          representative: row,
          representativeSpecificity: specificity,
          seasons: [row],
        });
        continue;
      }
      existing.seasons.push(row);
      if (specificity < existing.representativeSpecificity) {
        existing.representative = row;
        existing.representativeSpecificity = specificity;
      }
    }

    return Array.from(groups.values())
      .map((g) => {
        const ratings = g.seasons.flatMap((s) => (s.rating !== null ? [s.rating] : []));
        const meanRating =
          ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
        // Within-franchise: chronological (oldest first).
        const seasonsSorted = g.seasons.slice().sort((a, b) => {
          const ya = a.title.releaseYear ?? Number.MAX_SAFE_INTEGER;
          const yb = b.title.releaseYear ?? Number.MAX_SAFE_INTEGER;
          if (ya !== yb) return ya - yb;
          return a.title.title.localeCompare(b.title.title);
        });
        return {
          franchiseKey: g.franchiseKey,
          representative: g.representative,
          manualRank: g.representative.manualRank,
          eloScore: g.representative.eloScore,
          meanRating,
          seasonCount: g.seasons.length,
          seasons: seasonsSorted,
        };
      })
      .sort((a, b) => {
        // manual_rank ASC NULLS LAST
        if (a.manualRank === null && b.manualRank !== null) return 1;
        if (a.manualRank !== null && b.manualRank === null) return -1;
        if (a.manualRank !== null && b.manualRank !== null && a.manualRank !== b.manualRank) {
          return a.manualRank - b.manualRank;
        }
        // mean rating DESC
        if (a.meanRating !== b.meanRating) return b.meanRating - a.meanRating;
        // Stable tie-break on representative titleId
        return a.representative.titleId.localeCompare(b.representative.titleId);
      });
  }),

  // Bulk-set manual_rank by reading the new ordered titleId list.
  // Position in the array becomes manual_rank (1-indexed, lower=higher
  // in the list). Used by the /taste page's drag-to-reorder UI. Sends
  // the whole list rather than per-row deltas because that's robust
  // against concurrent edits and avoids gap arithmetic.
  setRankedOrder: protectedProcedure
    .input(z.object({ orderedTitleIds: z.array(z.string().uuid()).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User row not found — was me.ensure called for this session?',
        });
      }

      if (input.orderedTitleIds.length === 0) return { updated: 0 };

      // Build a single CASE expression: manual_rank = CASE title_id WHEN ... THEN n ...
      // One UPDATE statement, atomic per-row from the user's POV.
      const cases = sql.join(
        input.orderedTitleIds.map(
          (titleId, idx) => sql`WHEN ${watchEntries.titleId} = ${titleId} THEN ${idx + 1}`,
        ),
        sql` `,
      );

      const result = await ctx.db
        .update(watchEntries)
        .set({
          manualRank: sql`CASE ${cases} END`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(watchEntries.userId, internalUserId),
            inArray(watchEntries.titleId, input.orderedTitleIds),
          ),
        )
        .returning({ id: watchEntries.id });

      await triggerRecomputeSafely(internalUserId);
      return { updated: result.length };
    }),

  // Record a pairwise comparison: user said winner is preferred to
  // loser. Updates Elo on both watch_entries rows (initialising at
  // ELO_STARTING if either is null) and appends a row to
  // pairwise_comparisons for audit / re-derivation.
  //
  // Both rows must already exist (i.e. the user has rated both
  // titles); we error if not, because pairwise comparison without a
  // base rating is meaningless under the rated-taste model.
  recordPairwise: protectedProcedure
    .input(
      z
        .object({
          winnerTitleId: z.string().uuid(),
          loserTitleId: z.string().uuid(),
        })
        .refine((d) => d.winnerTitleId !== d.loserTitleId, {
          message: 'Winner and loser must be different titles',
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

      const rows = await ctx.db
        .select({
          titleId: watchEntries.titleId,
          eloScore: watchEntries.eloScore,
        })
        .from(watchEntries)
        .where(
          and(
            eq(watchEntries.userId, internalUserId),
            inArray(watchEntries.titleId, [input.winnerTitleId, input.loserTitleId]),
          ),
        );

      if (rows.length !== 2) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Both titles must already be in your taste to compare them.',
        });
      }

      const winnerRow = rows.find((r) => r.titleId === input.winnerTitleId);
      const loserRow = rows.find((r) => r.titleId === input.loserTitleId);
      if (!winnerRow || !loserRow) {
        // Belt-and-braces — the count check above implies this can't happen.
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Pair lookup failed.' });
      }

      const winnerElo = winnerRow.eloScore ?? ELO_STARTING;
      const loserElo = loserRow.eloScore ?? ELO_STARTING;
      const expectedWin = eloExpected(winnerElo, loserElo);
      const newWinnerElo = eloUpdate(winnerElo, expectedWin, 1);
      const newLoserElo = eloUpdate(loserElo, 1 - expectedWin, 0);

      // Two updates + one log insert. Run sequentially — the log
      // insert is non-critical (it's audit, not correctness), so if
      // updates land but log fails the comparison still took effect.
      await ctx.db
        .update(watchEntries)
        .set({ eloScore: newWinnerElo, updatedAt: new Date() })
        .where(
          and(
            eq(watchEntries.userId, internalUserId),
            eq(watchEntries.titleId, input.winnerTitleId),
          ),
        );
      await ctx.db
        .update(watchEntries)
        .set({ eloScore: newLoserElo, updatedAt: new Date() })
        .where(
          and(
            eq(watchEntries.userId, internalUserId),
            eq(watchEntries.titleId, input.loserTitleId),
          ),
        );
      await ctx.db.insert(pairwiseComparisons).values({
        userId: internalUserId,
        winnerTitleId: input.winnerTitleId,
        loserTitleId: input.loserTitleId,
      });

      await triggerRecomputeSafely(internalUserId);
      return {
        winnerTitleId: input.winnerTitleId,
        loserTitleId: input.loserTitleId,
        winnerElo: newWinnerElo,
        loserElo: newLoserElo,
      };
    }),

  // Returns two rated titles for the user to compare. Per ADR-0023
  // the franchise is the unit of taste, so the pair must come from
  // DIFFERENT franchises — comparing "Attack on Titan S1" vs "AoT S2"
  // is not a meaningful taste signal.
  //
  // Strategy: fetch all rated entries (Phase 1A scale = dozens, not
  // thousands), group by franchiseKey, pick two distinct franchises
  // at random, pick one representative entry from each. Returns null
  // when the user has rated entries from fewer than 2 distinct
  // franchises.
  getPairwisePair: protectedProcedure.query(async ({ ctx }) => {
    const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
    if (!internalUserId) return null;

    const rows = await ctx.db
      .select({
        titleId: watchEntries.titleId,
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
      .where(and(eq(watchEntries.userId, internalUserId), isNotNull(watchEntries.rating)));

    // Bucket rated entries by franchise.
    type Row = (typeof rows)[number];
    const byFranchise = new Map<string, Row[]>();
    for (const row of rows) {
      const key = franchiseKey(row.title.title);
      let bucket = byFranchise.get(key);
      if (!bucket) {
        bucket = [];
        byFranchise.set(key, bucket);
      }
      bucket.push(row);
    }

    if (byFranchise.size < 2) return null;

    // Pick two distinct franchises at random.
    const franchiseKeys = Array.from(byFranchise.keys());
    // Fisher-Yates partial shuffle: only need the first two slots.
    for (let i = 0; i < 2; i++) {
      const j = i + Math.floor(Math.random() * (franchiseKeys.length - i));
      const tmp = franchiseKeys[i] as string;
      franchiseKeys[i] = franchiseKeys[j] as string;
      franchiseKeys[j] = tmp;
    }

    // Within each franchise, pick the lowest-specificity rated season
    // (the most-canonical one the user has actually rated). The Elo
    // update goes to THAT entry's watch_entries row. Display uses
    // `franchiseDisplayName` so "Attack on Titan Final Season" appears
    // as "Attack on Titan" — the comparison is at the franchise level,
    // not the specific-season level (per user feedback 2026-05-14).
    const pickCanonical = (bucket: Row[]): Row => {
      let best = bucket[0] as Row;
      let bestSpec = franchiseSpecificity(best.title.title, franchiseKey(best.title.title));
      for (let i = 1; i < bucket.length; i++) {
        const row = bucket[i] as Row;
        const spec = franchiseSpecificity(row.title.title, franchiseKey(row.title.title));
        if (spec < bestSpec) {
          best = row;
          bestSpec = spec;
        }
      }
      return best;
    };
    const aBucket = byFranchise.get(franchiseKeys[0] as string) as Row[];
    const bBucket = byFranchise.get(franchiseKeys[1] as string) as Row[];
    const aRaw = pickCanonical(aBucket);
    const bRaw = pickCanonical(bBucket);
    const a = {
      ...aRaw,
      title: { ...aRaw.title, title: franchiseDisplayName(aRaw.title.title) },
    };
    const b = {
      ...bRaw,
      title: { ...bRaw.title, title: franchiseDisplayName(bRaw.title.title) },
    };
    return { a, b };
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

      // Only recompute when something actually got removed. result.length
      // can be 0 if the entry was already gone (idempotent remove path).
      if (result.length > 0) {
        await triggerRecomputeSafely(internalUserId);
      }
      return { removed: result.length };
    }),

  // Bulk-remove. Used by the franchise-row Remove button in /taste —
  // a single click should delete every season of the franchise the
  // user has rated, not require N round-trips. Idempotent like
  // remove(); zeroes through unrecognised ids without error.
  removeMany: protectedProcedure
    .input(z.object({ titleIds: z.array(titleIdSchema).min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) return { removed: 0 };

      const result = await ctx.db
        .delete(watchEntries)
        .where(
          and(
            eq(watchEntries.userId, internalUserId),
            inArray(watchEntries.titleId, input.titleIds),
          ),
        )
        .returning({ id: watchEntries.id });

      if (result.length > 0) {
        await triggerRecomputeSafely(internalUserId);
      }
      return { removed: result.length };
    }),
});
