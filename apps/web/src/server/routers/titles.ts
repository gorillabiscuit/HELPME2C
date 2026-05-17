import { and, eq, ilike, notInArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { mediaTypeEnum, recFeedback, titles, users, watchEntries } from '../schema';
import { dedupeByFranchise } from '../lib/franchise';
import { protectedProcedure, router } from '../trpc';

// Auto-synced with the Drizzle pgEnum values, same single-source-of-truth
// pattern as watch.ts.
const mediaTypeSchema = z.enum(mediaTypeEnum.enumValues);

export const titlesRouter = router({
  // Search the catalog by title text. The first user-facing read of the
  // titles table. Used by M3 Path A's anchor capture (the search +
  // thumbnail autocomplete on the onboarding flow) and the future
  // "search to add" UX on the manual-tracking surface.
  //
  // Strategy: ILIKE substring on both `title` and `original_title` —
  // anime users sometimes type romanized names that only match
  // original_title. Ordered by TMDB popularity (DESC NULLS LAST) then
  // title alphabetical, so the most-likely-correct match surfaces first
  // and ordering stays stable for ties.
  //
  // Phase 1A scale (~2k titles): ILIKE substring is fine — sequential
  // scan over a small table is fast enough. Migrate to pg_trgm + GIN
  // index when title count grows past ~10k or when fuzzy matching
  // becomes a UX requirement (typo tolerance, partial word matches).
  // pg_trgm is available on Neon.
  //
  // Auth: protectedProcedure. Catalog data ultimately came from TMDB
  // (public), but gating prevents trivial scraping of our derived
  // taxonomy/popularity. Promote to public if/when a pre-signup
  // marketing-page search lands.
  // Top-N titles by popularity. Backs the M3 Path A onboarding "quick picks"
  // grid (cold-start anchor capture) and any future "popular right now"
  // surface. Eventually this is where the M3 mapping-session "70%
  // demographic-weighted + 30% wildcards, varied per visit" logic lands;
  // v1 is just `popularity_score DESC` with no personalisation. The 70/30
  // mix needs the user's region / demographic priors in the predicate,
  // which we'll add in M4 alongside the rec engine.
  popular: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(50).optional().default(16),
          mediaType: mediaTypeSchema.optional(),
          /** When true, exclude titles already in the user's watch_entries
           * (any status). Used by the /library Discover view so users don't
           * see shows they've already rated or planned. Onboarding leaves
           * this off (new users have no entries anyway). */
          excludeUserEntries: z.boolean().optional().default(false),
          /** When true, exclude titles the user has actioned via
           * recFeedback (dismissed via "Not interested" OR marked
           * unfamiliar via "Don't know it"). Distinct from the algorithm's
           * "unfamiliar is a soft signal" rule: this is purely a picker-UI
           * concern — the user has already told us "don't show me this
           * card right now", so the popular grid honours that even when
           * the engine still considers the title surface-able later. */
          excludeRecFeedback: z.boolean().optional().default(false),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 16;

      // Two cross-cutting concerns on this read path:
      //
      //   1. Franchise dedup. Without it, "Attack on Titan", "AoT Season
      //      2", "AoT: The Final Season" all surface separately in the
      //      cold-start picker, burning grid slots on one franchise.
      //      Same helper as recommendations.list — see ../lib/franchise.
      //
      //   2. Media-type balance. popularityScore scales differ across
      //      sources (AniList tends to swamp TMDB), so a single ranked
      //      SELECT returns mostly anime even when the catalog has
      //      plenty of TV/film. When no explicit mediaType is requested,
      //      stratify: pull per-type top-N, dedup each, round-robin
      //      interleave to fill the grid with all three.

      const projection = {
        id: titles.id,
        title: titles.title,
        originalTitle: titles.originalTitle,
        mediaType: titles.mediaType,
        releaseYear: titles.releaseYear,
        posterUrl: titles.posterUrl,
        popularityScore: titles.popularityScore,
        trailerProvider: titles.trailerProvider,
        trailerVideoId: titles.trailerVideoId,
      } as const;

      // Build the exclusion list of title IDs the user has already
      // touched — watch_entries (added / rated / planned) plus optionally
      // rec_feedback (Not interested / Don't know it). Only fetched when
      // the respective flag is set to keep the cold-start path cheap.
      const [watchTouchedIds, feedbackTouchedIds] = await Promise.all([
        input?.excludeUserEntries
          ? ctx.db
              .select({ titleId: watchEntries.titleId })
              .from(watchEntries)
              .innerJoin(users, eq(watchEntries.userId, users.id))
              .where(eq(users.clerkId, ctx.userId))
              .then((rows) => rows.map((r) => r.titleId))
          : Promise.resolve<string[]>([]),
        input?.excludeRecFeedback
          ? ctx.db
              .select({ titleId: recFeedback.titleId })
              .from(recFeedback)
              .innerJoin(users, eq(recFeedback.userId, users.id))
              .where(eq(users.clerkId, ctx.userId))
              .then((rows) => rows.map((r) => r.titleId))
          : Promise.resolve<string[]>([]),
      ]);
      const userTouchedIds = Array.from(new Set([...watchTouchedIds, ...feedbackTouchedIds]));
      const hasExclusion = userTouchedIds.length > 0;

      // Caller specified a single mediaType — stratification doesn't
      // apply, just dedup + cap. Overfetch 3× so dedup has room to find
      // representatives without leaving the grid short.
      if (input?.mediaType) {
        const whereClause = hasExclusion
          ? and(eq(titles.mediaType, input.mediaType), notInArray(titles.id, userTouchedIds))
          : eq(titles.mediaType, input.mediaType);
        const rows = await ctx.db
          .select(projection)
          .from(titles)
          .where(whereClause)
          .orderBy(sql`${titles.popularityScore} DESC NULLS LAST, ${titles.title} ASC`)
          .limit(limit * 3 + userTouchedIds.length);
        return dedupeByFranchise(rows).slice(0, limit);
      }

      // No filter — stratify across all three media types. Overfetch
      // 2× per type before dedup so each bucket has enough survivors to
      // contribute its share to the round-robin merge. The +touched term
      // keeps the un-actioned pool at ≥ limit*2 even after the user has
      // burned through a lot of cards — without it, a long onboarding
      // session would deplete the picker as soon as actioned count
      // outgrew the static fetch window.
      const perType = limit * 2 + userTouchedIds.length;
      const mediaTypes = ['tv', 'film', 'anime'] as const;
      const buckets = await Promise.all(
        mediaTypes.map((mt) =>
          ctx.db
            .select(projection)
            .from(titles)
            .where(
              hasExclusion
                ? and(eq(titles.mediaType, mt), notInArray(titles.id, userTouchedIds))
                : eq(titles.mediaType, mt),
            )
            .orderBy(sql`${titles.popularityScore} DESC NULLS LAST, ${titles.title} ASC`)
            .limit(perType),
        ),
      );

      // Dedup each bucket independently. Franchises don't cross media
      // types in practice (anime adaptations live as separate AniList
      // rows from their live-action versions; ignoring cross-type
      // dedup is correct AND keeps the algorithm simple).
      const dedupedBuckets = buckets.map((bucket) => dedupeByFranchise(bucket));

      // Round-robin interleave: tv[0], film[0], anime[0], tv[1], ...
      // Empty buckets are skipped naturally — if the catalog has no TV
      // titles yet, the merge falls through to film + anime.
      const merged: (typeof dedupedBuckets)[number] = [];
      const maxRows = Math.max(...dedupedBuckets.map((b) => b.length));
      for (let i = 0; i < maxRows && merged.length < limit; i++) {
        for (const bucket of dedupedBuckets) {
          if (merged.length >= limit) break;
          const row = bucket[i];
          if (row) merged.push(row);
        }
      }
      return merged;
    }),

  search: protectedProcedure
    .input(
      z.object({
        q: z.string().max(100),
        limit: z.number().int().min(1).max(50).optional().default(16),
        mediaType: mediaTypeSchema.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const trimmed = input.q.trim();
      // <2-char queries match basically everything and are too noisy to
      // be useful. Returning [] keeps the autocomplete UX clean (empty
      // state instead of a flicker of partial-match results).
      if (trimmed.length < 2) return [];

      // Escape SQL LIKE wildcards (% and _) plus the escape char itself
      // so a user searching for "100%" matches the literal string
      // "100%" rather than "100" + anything. Drizzle's parameter binding
      // handles the SQL-injection layer separately.
      const escaped = trimmed.replace(/[%_\\]/g, (c) => '\\' + c);
      const pattern = `%${escaped}%`;

      const textMatch = or(ilike(titles.title, pattern), ilike(titles.originalTitle, pattern));
      const where = input.mediaType
        ? and(textMatch, eq(titles.mediaType, input.mediaType))
        : textMatch;

      // Overfetch 3× so franchise dedup has room to find representatives
      // without leaving the grid short. Then collapse seasons/cours/parts
      // of the same franchise into the canonical entry so a user searching
      // "attack on titan" sees one card, not three. Specific-season
      // searches ("attack on titan season 3") naturally still match
      // only one row, so dedup is a no-op there.
      const rows = await ctx.db
        .select({
          id: titles.id,
          title: titles.title,
          originalTitle: titles.originalTitle,
          mediaType: titles.mediaType,
          releaseYear: titles.releaseYear,
          posterUrl: titles.posterUrl,
          popularityScore: titles.popularityScore,
          trailerProvider: titles.trailerProvider,
          trailerVideoId: titles.trailerVideoId,
        })
        .from(titles)
        .where(where)
        .orderBy(sql`${titles.popularityScore} DESC NULLS LAST, ${titles.title} ASC`)
        .limit(input.limit * 3);
      return dedupeByFranchise(rows).slice(0, input.limit);
    }),
});
