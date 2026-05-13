import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import {
  recFeedback,
  streamingAvailability,
  titles,
  userRecommendations,
  userStreamingProviders,
  watchEntries,
} from '../schema';
import { resolveInternalUserId } from '../lib/resolve-user';
import { protectedProcedure, router } from '../trpc';

// Franchise-dedup helper. Normalises a title to its franchise root by
// stripping common season/cour/part suffixes. Used at rec-read time so
// the same franchise (e.g. "Jujutsu Kaisen" + "Jujutsu Kaisen Season 2")
// only shows up once in the dashboard list.
//
// Multi-pass: strips are applied repeatedly until the title stops
// changing, so compound suffixes like "Attack on Titan Season 3 Part 2"
// collapse correctly ("Part 2" → "Season 3" → ""). Capped at 6 passes
// just to avoid pathological infinite loops on weird inputs.
//
// Intentionally conservative — keeps colons and bare trailing numbers
// intact, so distinct works like "Steins;Gate" vs "Steins;Gate 0" or
// "Demon Slayer: Entertainment District Arc" don't get collapsed.
// Tradeoff: under-dedups on titles that use bare numbers as season
// markers (e.g. "Konosuba 2"). Acceptable for v1; the real fix is
// a franchise_id column populated from AniList relations.
function franchiseKey(title: string): string {
  let key = title.toLowerCase().trim();
  for (let pass = 0; pass < 6; pass++) {
    const previous = key;
    key = key
      .replace(/\s*\(\d{4}\)$/, '') // " (2023)"
      .replace(/\s*[:\-–]\s*(?:the\s+)?final\s+(?:season|cour|part)$/i, '') // ": The Final Season", " - Final Cour"
      .replace(/\s+(?:the\s+)?final\s+(?:season|cour|part)$/i, '') // " The Final Season", " Final Part"
      .replace(/\s+(?:season|cour|part|s)\s*\d+$/i, '') // " Season 2", " S2", " Part 3", " Cour 1"
      .replace(/\s+\d+(?:st|nd|rd|th)\s+season$/i, '') // " 2nd Season"
      .replace(/\s+(?:ii|iii|iv|v|vi|vii|viii|ix|x)$/i, '') // " II", " III"
      .trim();
    if (key === previous) break;
  }
  return key;
}

// Within a franchise group, pick the entry-point representative — the
// title a new user should be pointed at first. Returns an integer
// where LOWER = better representative.
//
//   0  — series entry (no season suffix at all, e.g. "Attack on Titan")
//   N  — explicit season/part/cour number
//   ∞  — "Final Season" / "Final Cour" / "Final Part" (treat as last)
//
// Tiebreaker (handled by the caller): engine score.
//
// Why prefer no-suffix > S1 > S2 > … > Final: a user discovering the
// franchise should land on the canonical entry, not on Season 3. The
// franchise ranks where the engine put it (using the highest in-group
// score for position); the displayed poster is the entry point.
const ROMAN_TO_INT: Record<string, number> = {
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
};

function franchiseSpecificity(originalTitle: string, key: string): number {
  const lower = originalTitle.toLowerCase().trim();
  // Same as franchiseKey output → no suffix was stripped → series entry.
  // Strip trailing "(2023)" first so "Hunter x Hunter (2011)" still
  // counts as a series entry, just versioned.
  const lowerNoYear = lower.replace(/\s*\(\d{4}\)$/, '');
  if (lowerNoYear === key) return 0;

  if (/(?:^|\s)(?:the\s+)?final\s+(?:season|cour|part)\b/i.test(lower)) {
    return Number.MAX_SAFE_INTEGER;
  }

  // Largest explicit numeric marker wins as the specificity. "Season 3
  // Part 2" → 3. We're picking representatives across the FAMILY of
  // entries; using max-number here keeps the ordering monotonic with
  // how franchises actually number sub-entries.
  let max = 1;
  const numPatterns = [
    /season\s*(\d+)/i,
    /part\s*(\d+)/i,
    /cour\s*(\d+)/i,
    /(\d+)(?:st|nd|rd|th)\s+season/i,
  ];
  for (const pat of numPatterns) {
    const m = lower.match(pat);
    if (m && m[1]) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n)) max = Math.max(max, n);
    }
  }

  const romanMatch = lower.match(/\s+(ii|iii|iv|v|vi|vii|viii|ix|x)$/i);
  if (romanMatch && romanMatch[1]) {
    const n = ROMAN_TO_INT[romanMatch[1].toLowerCase()];
    if (n) max = Math.max(max, n);
  }

  return max;
}

// Read path for pre-computed personal recommendations. Per ADR-0008 the
// scoring runs offline (Inngest job — apps/web/src/inngest/functions/recommend.ts);
// per ADR-0013 the cache is a single Postgres row per user with a JSONB
// payload. This procedure does the read + a JOIN to titles for display data.
//
// Empty result is the same shape regardless of cause:
//   - User has no row in users (auth race after signup): []
//   - User has no row in user_recommendations (cron hasn't run yet): []
//   - User's payload has empty items (cold-start with no anchors): []
//   - Payload has unrecognised schemaVersion (forward-incompat from a
//     future writer): [] (the caller should refresh; the next nightly cron
//     will overwrite with a current-version payload)
//
// The home page distinguishes "you have no anchors yet, go pick some" from
// "your recs are still computing" by also looking at the user's anchor
// count via watch.list — this procedure stays simple and just returns
// what's cached.
export const recommendationsRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(200).optional().default(20),
          country: z
            .string()
            .regex(/^[A-Z]{2}$/i, 'expected ISO 3166-1 alpha-2')
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 20;
      const country = input?.country?.toUpperCase() ?? 'US';

      // Default filter context — populated only when the user has saved
      // 1+ providers AND payload v1 logic actually ran. The dashboard reads
      // this to render the visible "filtering by N services, X hidden" line.
      const emptyFilter = {
        active: false,
        providers: [] as Array<{
          providerId: string;
          providerName: string;
          providerLogoUrl: string | null;
        }>,
        hiddenCount: 0,
      };

      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) {
        return { items: [], computedAt: null, filtered: false, filter: emptyFilter };
      }

      const [row] = await ctx.db
        .select()
        .from(userRecommendations)
        .where(eq(userRecommendations.userId, internalUserId))
        .limit(1);

      if (!row) {
        return { items: [], computedAt: null, filtered: false, filter: emptyFilter };
      }

      const { payload } = row;
      // Schema-version guard. v1 (legacy) lacks reasonHint; v2 carries
      // it inline. Anything else means a writer from a future commit
      // ran ahead of this reader — return [] so the dashboard renders
      // the "computing" state until the next cron writes a recognised
      // payload.
      if (payload.schemaVersion !== 1 && payload.schemaVersion !== 2) {
        return { items: [], computedAt: row.computedAt, filtered: false, filter: emptyFilter };
      }

      // Connected-providers filter per ADR-0021: post-ranking, country-strict,
      // never a ranking signal. If the user has 0 providers selected,
      // skip the filter entirely (their selection is "I don't care, show
      // everything"). With 1+ selected, restrict to titles that have a
      // streaming_availability row in the request country with one of those
      // provider_ids — counts both type='streaming' and type='free' as
      // available; rent/buy don't qualify since the user pays per title.
      const connectedRows = await ctx.db
        .select({ providerId: userStreamingProviders.providerId })
        .from(userStreamingProviders)
        .where(eq(userStreamingProviders.userId, internalUserId));
      const connectedProviderIds = connectedRows.map((r) => r.providerId);
      const filterActive = connectedProviderIds.length > 0;

      // Filter the FULL 200-item payload before slicing — otherwise top-20
      // could exclude all available titles and the user would see fewer
      // recs than they should. The full-payload streaming join is a single
      // IN-list query, ~200 ids, fast.
      let allowedTitleIds: Set<string> | null = null;
      if (filterActive && payload.items.length > 0) {
        const allItemIds = payload.items.map((i) => i.titleId);
        const matchingRows = await ctx.db
          .selectDistinct({ titleId: streamingAvailability.titleId })
          .from(streamingAvailability)
          .where(
            and(
              inArray(streamingAvailability.titleId, allItemIds),
              eq(streamingAvailability.countryCode, country),
              inArray(streamingAvailability.type, ['streaming', 'free']),
              inArray(streamingAvailability.providerId, connectedProviderIds),
            ),
          );
        allowedTitleIds = new Set(matchingRows.map((r) => r.titleId));
      }

      // Read-time exclusion: titles dismissed via rec_feedback OR already
      // in the user's library since the last recompute. Both are user
      // actions that should remove the item from their dashboard
      // immediately, not wait for the nightly cron.
      const [dismissedRows, libraryRows] = await Promise.all([
        ctx.db
          .select({ titleId: recFeedback.titleId })
          .from(recFeedback)
          .where(and(eq(recFeedback.userId, internalUserId), eq(recFeedback.dismissed, true))),
        ctx.db
          .select({ titleId: watchEntries.titleId })
          .from(watchEntries)
          .where(eq(watchEntries.userId, internalUserId)),
      ]);
      const excludedTitleIds = new Set<string>([
        ...dismissedRows.map((r) => r.titleId),
        ...libraryRows.map((r) => r.titleId),
      ]);

      const streamingFiltered = allowedTitleIds
        ? payload.items.filter((i) => allowedTitleIds!.has(i.titleId))
        : payload.items;
      const filteredItems = streamingFiltered.filter((i) => !excludedTitleIds.has(i.titleId));
      // hiddenCount is intentionally scoped to the STREAMING filter only,
      // not dismissed/library exclusions. The dashboard renders this under
      // the "Filtering by [provider chips]" row — implying that this is
      // what the providers are hiding. Mixing in dismissed/library would
      // be misleading: a user with 0 providers selected but 50 library
      // items would otherwise see "50 hidden by my services" without
      // having selected any.
      const hiddenCount = allowedTitleIds ? payload.items.length - streamingFiltered.length : 0;

      // Fetch provider display metadata only when the filter is active.
      // Pulled from streaming_availability (any country, any type) since
      // the same provider_id has the same name+logo everywhere — first row
      // wins. Saves us a separate denormalised store of provider metadata.
      const providersForFilter: Array<{
        providerId: string;
        providerName: string;
        providerLogoUrl: string | null;
      }> = [];
      if (filterActive) {
        const metaRows = await ctx.db
          .selectDistinctOn([streamingAvailability.providerId], {
            providerId: streamingAvailability.providerId,
            providerName: streamingAvailability.providerName,
            providerLogoUrl: streamingAvailability.providerLogoUrl,
          })
          .from(streamingAvailability)
          .where(inArray(streamingAvailability.providerId, connectedProviderIds));
        // Preserve the user's saved order so chips stay stable across reads.
        const byId = new Map(metaRows.map((r) => [r.providerId, r]));
        for (const id of connectedProviderIds) {
          const meta = byId.get(id);
          if (meta) providersForFilter.push(meta);
        }
      }

      const filterContext = filterActive
        ? { active: true as const, providers: providersForFilter, hiddenCount }
        : emptyFilter;

      if (filteredItems.length === 0) {
        return {
          items: [],
          computedAt: row.computedAt,
          filtered: filterActive,
          filter: filterContext,
        };
      }

      // Fetch title metadata for the FULL filtered set (up to ~200 ids).
      // Necessary because franchise-dedup needs the title text to derive
      // each item's franchiseKey, and dedup must happen before the slice
      // to `limit` — otherwise we'd slice 20 raw items, dedup, and end
      // up showing fewer than 20 (or in a degenerate case 1) franchise
      // groups when several seasons of the same show cluster at the top.
      const allFilteredIds = filteredItems.map((item) => item.titleId);
      const titleRows = await ctx.db
        .select({
          id: titles.id,
          title: titles.title,
          mediaType: titles.mediaType,
          releaseYear: titles.releaseYear,
          posterUrl: titles.posterUrl,
          trailerProvider: titles.trailerProvider,
          trailerVideoId: titles.trailerVideoId,
        })
        .from(titles)
        .where(inArray(titles.id, allFilteredIds));

      // Group filteredItems by franchiseKey, picking each group's
      // entry-point representative (lowest franchiseSpecificity) but
      // ranking the group by the HIGHEST in-group engine score. Net
      // effect: the franchise sits where the engine ranked its best
      // candidate, but the poster the user sees is the canonical
      // series entry — not "Season 3 Part 2".
      const titleById = new Map(titleRows.map((t) => [t.id, t]));
      type Representative = {
        id: string;
        title: string;
        mediaType: 'tv' | 'film' | 'anime';
        releaseYear: number | null;
        posterUrl: string | null;
        trailerProvider: string | null;
        trailerVideoId: string | null;
        score: number;
        reasonHint: string | null;
      };
      type Group = {
        firstScore: number;
        bestSpecificity: number;
        representative: Representative;
      };
      const groups = new Map<string, Group>();
      for (const item of filteredItems) {
        const title = titleById.get(item.titleId);
        if (!title) continue;
        const key = franchiseKey(title.title);
        const specificity = franchiseSpecificity(title.title, key);
        // reasonHint is v2-only. v1 payloads have it undefined → coerce
        // to null so the union type stays clean for the client.
        const reasonHint = item.reasonHint ?? null;
        const existing = groups.get(key);
        if (!existing) {
          // First encounter — establishes the franchise's rank position
          // (filteredItems is in engine-rank order, so the first item
          // for a franchise is its top-scored candidate).
          groups.set(key, {
            firstScore: item.score,
            bestSpecificity: specificity,
            representative: { ...title, score: item.score, reasonHint },
          });
        } else if (specificity < existing.bestSpecificity) {
          // Less specific = better representative. Keep firstScore so
          // ranking stays anchored on the engine's top-scored member.
          // The reasonHint of the new representative wins — it's the
          // explanation for the title we're actually showing.
          existing.bestSpecificity = specificity;
          existing.representative = { ...title, score: item.score, reasonHint };
        }
      }

      const items = Array.from(groups.values())
        .sort((a, b) => b.firstScore - a.firstScore)
        .slice(0, limit)
        .map((g) => g.representative);

      return {
        items,
        computedAt: row.computedAt,
        filtered: filterActive,
        filter: filterContext,
      };
    }),
});
