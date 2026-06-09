import { and, eq, ilike, inArray, notInArray, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { mediaTypeEnum, recFeedback, titles, users, watchEntries } from '../schema';
import { dedupeByFranchise } from '../lib/franchise';
import { protectedProcedure, router } from '../trpc';
import { searchTmdbAndIngest } from '@/inngest/functions/tmdb-sync';

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
          /** Explicit title IDs to exclude — used by the onboarding
           * "Show me different ones" refresh to avoid re-showing titles
           * already seen in a previous batch. */
          excludeTitleIds: z.array(z.string().uuid()).optional().default([]),
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
      const userTouchedIds = Array.from(
        new Set([...watchTouchedIds, ...feedbackTouchedIds, ...(input?.excludeTitleIds ?? [])]),
      );
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

      // Look up user's country to set a culturally appropriate media-type
      // ratio. Equal thirds (the old approach) over-represents anime for
      // most of the world and under-represents it for East Asian users.
      //
      // Ratio = [tvSlots, filmSlots, animeSlots] out of `limit` titles.
      // High-anime markets (JP/KR/CN/TW/HK/SG + neighbours): 30/20/50
      // Mid-anime markets (US/CA — large fanbases): 45/30/25
      // Default (EU, AU, UK, rest of world): 50/35/15
      const userRow = await ctx.db
        .select({ country: users.country })
        .from(users)
        .where(eq(users.clerkId, ctx.userId))
        .limit(1)
        .then((rows) => rows[0] ?? null);
      const country = userRow?.country?.toUpperCase() ?? null;

      const HIGH_ANIME = new Set([
        'JP',
        'KR',
        'CN',
        'TW',
        'HK',
        'SG',
        'TH',
        'VN',
        'PH',
        'MY',
        'ID',
      ]);
      const MID_ANIME = new Set(['US', 'CA', 'AU', 'NZ']);

      const [tvRatio, filmRatio] =
        country && HIGH_ANIME.has(country)
          ? [0.3, 0.2, 0.5]
          : country && MID_ANIME.has(country)
            ? [0.45, 0.3, 0.25]
            : [0.5, 0.35, 0.15]; // EU and rest of world

      const tvSlots = Math.round(limit * tvRatio);
      const filmSlots = Math.round(limit * filmRatio);
      const animeSlots = limit - tvSlots - filmSlots; // remainder avoids rounding drift

      const slotsByType = { tv: tvSlots, film: filmSlots, anime: animeSlots } as const;
      const mediaTypes = ['tv', 'film', 'anime'] as const;

      // Overfetch 3× per type so franchise dedup has room to find enough
      // unique representatives to fill each type's slot allocation.
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
            .limit(slotsByType[mt] * 3 + userTouchedIds.length),
        ),
      );

      const [tvBucket, filmBucket, animeBucket] = buckets as [
        (typeof buckets)[0],
        (typeof buckets)[0],
        (typeof buckets)[0],
      ];
      const dedupedBuckets = {
        tv: dedupeByFranchise(tvBucket).slice(0, slotsByType.tv),
        film: dedupeByFranchise(filmBucket).slice(0, slotsByType.film),
        anime: dedupeByFranchise(animeBucket).slice(0, slotsByType.anime),
      };

      // Interleave by ratio rather than strict round-robin so the grid
      // feels balanced: every ~2 TV/film cards is followed by 1 anime
      // card (for the default ratio), not anime-TV-film-anime-TV-film.
      const merged: typeof dedupedBuckets.tv = [];
      const queues = {
        tv: [...dedupedBuckets.tv],
        film: [...dedupedBuckets.film],
        anime: [...dedupedBuckets.anime],
      };
      while (merged.length < limit) {
        let added = false;
        for (const mt of mediaTypes) {
          if (merged.length >= limit) break;
          const item = queues[mt].shift();
          if (item) {
            merged.push(item);
            added = true;
          }
        }
        if (!added) break; // all queues exhausted
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

      // Popularity scores are not cross-comparable between media types:
      // AniList scores (anime) can be in the millions; TMDB scores (TV/film)
      // are typically 0–500. Sorting by raw score across all types buries
      // TV and film results under anime even when the text match is equal.
      //
      // Fix: normalise each row's score by the per-type max across the
      // matching result set, then sort descending. This preserves the
      // "most popular match" intent while removing the scale bias.
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
        .orderBy(sql`${titles.title} ASC`) // stable base order; re-sorted below
        .limit(input.limit * 3);

      // Compute per-type max for normalisation.
      const maxByType: Record<string, number> = { tv: 1, film: 1, anime: 1 };
      for (const row of rows) {
        const score = row.popularityScore ?? 0;
        const mt = row.mediaType;
        if (score > (maxByType[mt] ?? 1)) maxByType[mt] = score;
      }
      const sorted = [...rows].sort((a, b) => {
        const aNorm = (a.popularityScore ?? 0) / (maxByType[a.mediaType] ?? 1);
        const bNorm = (b.popularityScore ?? 0) / (maxByType[b.mediaType] ?? 1);
        if (bNorm !== aNorm) return bNorm - aNorm;
        return a.title.localeCompare(b.title);
      });

      const deduped = dedupeByFranchise(sorted).slice(0, input.limit);

      // On-demand ingest: if our catalog has no matches for a query of ≥3
      // characters, fetch from TMDB in real-time and upsert. This handles
      // the "catalog gap" — culturally significant titles that haven't been
      // picked up by the batch broaden run yet (e.g. a show that ended
      // before we launched, or an obscure title below our vote_count floor).
      //
      // We ingest at most 5 titles, then re-query our DB so the response
      // still comes from the single source of truth (our catalog), not
      // directly from TMDB. This means the latency hit is only paid on the
      // first search; subsequent searches for the same title hit the DB.
      //
      // Guard: fire if ≥5 chars AND fewer than 3 local results. "Fewer than 3"
      // rather than "zero" because an unrelated partial match (e.g. "Modern
      // Farmer" for the query "modern f") can suppress ingest of the intended
      // title. The 5-char minimum keeps noisy short queries from hammering TMDB.
      if (deduped.length < 3 && trimmed.length >= 5) {
        try {
          const ingestedIds = await searchTmdbAndIngest(trimmed, 5);
          if (ingestedIds.length > 0) {
            // Re-query the DB for the freshly ingested titles so callers
            // get our canonical shape (not raw TMDB data).
            const fresh = await ctx.db
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
              .where(and(inArray(titles.id, ingestedIds), where))
              .limit(input.limit);
            // Merge pre-existing local matches (deduped) with newly-ingested
            // results, dedup by id, sort by normalised popularity (same
            // per-type normalisation used above), and re-apply the original
            // limit so we never drop a show that was already in DB.
            // Raw popularity scores must NOT be used here — AniList scores
            // are orders of magnitude larger than TMDB scores and would
            // always win.
            const freshIds = new Set(fresh.map((f) => f.id));
            const all = [...deduped.filter((d) => !freshIds.has(d.id)), ...fresh];
            const mergedMaxByType: Record<string, number> = { tv: 1, film: 1, anime: 1 };
            for (const row of all) {
              const score = row.popularityScore ?? 0;
              if (score > (mergedMaxByType[row.mediaType] ?? 1))
                mergedMaxByType[row.mediaType] = score;
            }
            const merged = [...all].sort((a, b) => {
              const aNorm = (a.popularityScore ?? 0) / (mergedMaxByType[a.mediaType] ?? 1);
              const bNorm = (b.popularityScore ?? 0) / (mergedMaxByType[b.mediaType] ?? 1);
              if (bNorm !== aNorm) return bNorm - aNorm;
              return a.title.localeCompare(b.title);
            });
            return merged.slice(0, input.limit);
          }
        } catch (e) {
          // Best-effort: TMDB being down should not break local search.
          // Return [] (empty) rather than surfacing a 500.
          // eslint-disable-next-line no-console -- no logger abstraction yet; tracked in HM2C backlog
          console.warn('[titles.search] on-demand ingest failed', { query: input.q }, e);
        }
      }

      return deduped;
    }),

  // Top-N titles sorted by vote count — used by the onboarding dislike
  // picker. Vote count correlates with how widely a title has been SEEN,
  // which is what matters here: a user can only meaningfully dislike
  // something they've actually watched. `popularity_score` is recency-
  // weighted (newer titles score higher) and biases toward current hits;
  // vote count rewards enduring mainstream recognition.
  //
  // Excludes titles the user has already acted on (liked in Screen 1,
  // or any existing watch entry) so the dislike grid shows fresh titles.
  mainstream: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(50).optional().default(36),
        excludeTitleIds: z.array(z.string().uuid()).optional().default([]),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Always exclude existing watch entries so the dislike grid doesn't
      // show titles already rated positively in Screen 1.
      const watchedIds = await ctx.db
        .select({ titleId: watchEntries.titleId })
        .from(watchEntries)
        .innerJoin(users, eq(watchEntries.userId, users.id))
        .where(eq(users.clerkId, ctx.userId))
        .then((rows) => rows.map((r) => r.titleId));

      const excludeIds = Array.from(new Set([...watchedIds, ...input.excludeTitleIds]));

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

      // Stratify across media types (same approach as `popular`) so the
      // dislike grid isn't all anime. Overfetch 3× for franchise dedup.
      const perType = Math.ceil((input.limit / 3) * 3);
      const mediaTypeResults = await Promise.all(
        (['tv', 'film', 'anime'] as const).map((mt) => {
          const where =
            excludeIds.length > 0
              ? and(eq(titles.mediaType, mt), notInArray(titles.id, excludeIds))
              : eq(titles.mediaType, mt);
          return ctx.db
            .select(projection)
            .from(titles)
            .where(where)
            .orderBy(sql`${titles.popularityScore} DESC NULLS LAST, ${titles.title} ASC`)
            .limit(perType * 3);
        }),
      );

      // Dedup each medium, then round-robin interleave.
      const [tvRows, filmRows, animeRows] = mediaTypeResults as [
        (typeof mediaTypeResults)[0],
        (typeof mediaTypeResults)[0],
        (typeof mediaTypeResults)[0],
      ];
      const dedupedTv = dedupeByFranchise(tvRows).slice(0, perType);
      const dedupedFilm = dedupeByFranchise(filmRows).slice(0, perType);
      const dedupedAnime = dedupeByFranchise(animeRows).slice(0, perType);
      const interleaved: typeof dedupedTv = [];
      const maxLen = Math.max(dedupedTv.length, dedupedFilm.length, dedupedAnime.length);
      for (let i = 0; i < maxLen && interleaved.length < input.limit; i++) {
        if (dedupedTv[i]) interleaved.push(dedupedTv[i]!);
        if (dedupedFilm[i] && interleaved.length < input.limit) interleaved.push(dedupedFilm[i]!);
        if (dedupedAnime[i] && interleaved.length < input.limit) interleaved.push(dedupedAnime[i]!);
      }
      return interleaved;
    }),
});
