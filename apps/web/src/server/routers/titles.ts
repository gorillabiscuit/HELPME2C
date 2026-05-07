import { and, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { mediaTypeEnum, titles } from '../schema';
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
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = input?.mediaType ? eq(titles.mediaType, input.mediaType) : undefined;

      return ctx.db
        .select({
          id: titles.id,
          title: titles.title,
          originalTitle: titles.originalTitle,
          mediaType: titles.mediaType,
          releaseYear: titles.releaseYear,
          posterUrl: titles.posterUrl,
          popularityScore: titles.popularityScore,
        })
        .from(titles)
        .where(where)
        .orderBy(sql`${titles.popularityScore} DESC NULLS LAST, ${titles.title} ASC`)
        .limit(input?.limit ?? 16);
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

      return ctx.db
        .select({
          id: titles.id,
          title: titles.title,
          originalTitle: titles.originalTitle,
          mediaType: titles.mediaType,
          releaseYear: titles.releaseYear,
          posterUrl: titles.posterUrl,
          popularityScore: titles.popularityScore,
        })
        .from(titles)
        .where(where)
        .orderBy(sql`${titles.popularityScore} DESC NULLS LAST, ${titles.title} ASC`)
        .limit(input.limit);
    }),
});
