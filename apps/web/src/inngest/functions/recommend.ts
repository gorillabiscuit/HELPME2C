import { eq, inArray, notInArray } from 'drizzle-orm';
import { cron } from 'inngest';
import {
  explainRecommendation,
  extractTasteVector,
  recommendForUser,
  type AnchorPick,
  type ExplanationReason,
  type RatedTitle,
  type TagThemeMembership,
  type TitleFacetSet,
} from '@helpme2c/ml';
import { db } from '@/server/db';
import {
  type RecommendationsPayload,
  tags,
  tagThemes,
  themes,
  titleThemes,
  titles,
  titleTags,
  userRecommendations,
  users,
  watchEntries,
} from '@/server/schema';
import { aggregateByFranchise, franchiseKey } from '@/server/lib/franchise';
import { groupTagsIntoTitleSets } from '../lib/group-tags';
import { inngest, recommendAllUsersEvent, recommendUserEvent } from '../client';

// How many of the top-ranked recs get a precomputed reason hint. Top 50
// covers any dedup-induced position shifts the reader does at render
// time (display top 20, dedup reads 200 candidates → top 50 buffer is
// generous). Items past this rank still get displayed; they just lack
// a reason subtitle. Cheap to extend later if needed.
const EXPLAIN_DEPTH = 50;

// Tag info loaded per cron run — name + AniList category (null for TMDB).
interface TagInfo {
  readonly name: string;
  readonly category: string | null;
}

// Tag categories that describe cast composition / demographic targeting
// rather than thematic content. Picking one of these as the headline
// reason produces copy like "Because you like male protagonist" — true
// in the technical sense, useless and patronising as a recommendation
// rationale. Skipped when looking for the first usable reason.
//
// AniList's taxonomy puts cast-makeup tags under "Cast-*", marketing
// demographic targeting under "Demographic", and adult-content flags
// under "Sexual Content" — none of which describe what a show is *about*.
// "Technical" is animation/production metadata.
const BLOCKED_TAG_CATEGORIES = new Set([
  'Cast-Traits',
  'Cast-Main Cast',
  'Demographic',
  'Sexual Content',
  'Technical',
]);

// Specific tag names to skip regardless of category. Belt-and-braces for
// tags AniList didn't categorise tightly (Shounen/Seinen are marketed as
// demographic buckets) plus generic TMDB keywords ("anime") that match
// 410+ titles and convey no taste signal.
const BLOCKED_TAG_NAMES = new Set([
  'Male Protagonist',
  'Female Protagonist',
  'Heterosexual',
  'Ensemble Cast',
  'Primarily Teen Cast',
  'Primarily Adult Cast',
  'Primarily Male Cast',
  'Primarily Female Cast',
  'Shounen',
  'Shoujo',
  'Seinen',
  'Josei',
  'Kids',
  'anime',
  'animation',
]);

function isReasonUsable(reason: ExplanationReason, tagInfo: ReadonlyMap<string, TagInfo>): boolean {
  const info = tagInfo.get(reason.tagId);
  if (!info) return false;
  if (info.category && BLOCKED_TAG_CATEGORIES.has(info.category)) return false;
  if (BLOCKED_TAG_NAMES.has(info.name)) return false;
  return true;
}

// Build a one-line "Why this rec?" string from the engine's top
// ExplanationReason for a single rec. Returns null when no reason
// crosses a meaningful contribution floor (avoids surfacing noise).
//
// Walks the reason list in contribution order and skips cast/demographic
// reasons (see BLOCKED_TAG_CATEGORIES / BLOCKED_TAG_NAMES) — those are
// technically-correct-but-insulting headlines like "Because you like
// male protagonist". If every reason is blocked, returns null and the UI
// hides the subtitle rather than surfacing noise.
function formatReasonHint(
  reasons: ReadonlyArray<ExplanationReason>,
  tagInfo: ReadonlyMap<string, TagInfo>,
  themeNames: ReadonlyMap<string, string>,
): string | null {
  for (const reason of reasons) {
    if (reason.kind === 'direct-tag') {
      if (!isReasonUsable(reason, tagInfo)) continue;
      const info = tagInfo.get(reason.tagId);
      if (!info) continue;
      return `Because you like ${info.name.toLowerCase()}`;
    }
    // theme-bridge — surface the theme name + (optionally) what the
    // user's interest is that bridges into it. Theme bridges go through
    // editorial mappings (tagThemes) so they're already curated; just
    // surface the theme name.
    if (reason.themeId) {
      const themeName = themeNames.get(reason.themeId);
      if (!themeName) continue;
      return `Matches your ${themeName.toLowerCase()} interest`;
    }
  }
  return null;
}

// Top-N cap matches the M4 plan agreed 2026-05-08.
const REC_LIMIT = 200;

// Small score multipliers applied post-scoring for demographic priors.
// Applied only when the user opted in to the relevant signal (affinities)
// or provided birth year. These are discovery nudges, not overrides —
// taste-vector signal still dominates.
const AFFINITY_SCORE_BOOST = 0.15;
const ERA_SCORE_BOOST = 0.1;

// Formative viewing window: the years between ages 13 and 25. Titles
// from this era carry nostalgic familiarity that correlates with higher
// ratings; a mild boost surfaces them over equivalent-scored alternatives.
const ERA_START_OFFSET = 13;
const ERA_END_OFFSET = 25;

// Content affinity slug → tag name substrings to match against.
// Substring match on lower-cased tag names is intentionally broad: both
// TMDB keyword "korean drama" and AniList tag "Korean" should match k_drama.
// V1 — upgrade to a proper affinity→tagId mapping table if false-positive
// rate proves problematic.
const AFFINITY_TAG_SUBSTRINGS: Record<string, string[]> = {
  anime: ['anime', 'manga'],
  k_drama: ['korean', 'south korea', 'k-drama'],
  j_drama: ['japanese', 'japan', 'jdrama'],
  c_drama: ['chinese', 'china', 'mandarin', 'wuxia'],
  bollywood: ['bollywood', 'hindi', 'indian cinema'],
  nollywood: ['nollywood', 'nigerian', 'african cinema'],
  latin_american: ['latin american', 'telenovela', 'mexican', 'colombian', 'brazilian'],
  french_cinema: ['french cinema', 'french film'],
  nordic_noir: ['nordic', 'scandinavian', 'danish', 'swedish', 'norwegian', 'icelandic'],
  british_drama: ['british', 'bbc', 'british drama'],
  turkish_drama: ['turkish', 'ottoman'],
  middle_eastern: ['arabic', 'israeli', 'persian cinema', 'iranian'],
  southeast_asian: ['thai', 'filipino', 'vietnamese', 'indonesian', 'malaysian'],
};

// Fetches a user's anchor picks + rated tracking entries from watch_entries,
// loads tag data for every title in their history, builds the taste vector
// via packages/ml, scores all candidate titles (excluding library), and
// upserts the resulting top-200 ranked list into user_recommendations.
//
// Pure-ish: this is the side-effecting orchestration around the pure ML
// functions in packages/ml. The package boundary stays clean — packages/ml
// has no DB awareness; this function is the bridge.
//
// Cold-start short-circuit: if the user has zero anchors AND zero ratings,
// there's no taste signal, so we write an empty rec list rather than running
// the ML. The reader (M4 commit 5) detects empty items and renders the
// "pick anchors to get personal recs" empty state.
// Elo influence on the rating passed to the engine. Default Elo (1500)
// adds 0; +200 Elo adds +2; -200 Elo subtracts 2. Clamped 1..10 so the
// rated-title contract stays valid. Keeps the packages/ml engine
// signature stable (it doesn't know about Elo) — the caller massages
// the rating before passing.
const ELO_BASELINE = 1500;
const ELO_RATING_INFLUENCE_PER_POINT = 1 / 100;

function effectiveRating(rating: number, eloScore: number | null): number {
  if (eloScore === null) return rating;
  const adjustment = (eloScore - ELO_BASELINE) * ELO_RATING_INFLUENCE_PER_POINT;
  const adjusted = rating + adjustment;
  return Math.max(1, Math.min(10, adjusted));
}

export async function recomputeUserRecommendations(userId: string): Promise<{ recCount: number }> {
  // Join titles so we can compute franchiseKey on each entry's title text.
  // Per ADR-0023, the engine input is aggregated by franchise (mean rating
  // per franchise) instead of one-row-per-watch_entry, so a user with
  // multiple rated seasons of the same franchise contributes the same
  // signal weight as a user with one rated season — no triple-counting.
  const [userEntries, demographicRows] = await Promise.all([
    db
      .select({
        titleId: watchEntries.titleId,
        title: titles.title,
        kind: watchEntries.kind,
        rating: watchEntries.rating,
        eloScore: watchEntries.eloScore,
      })
      .from(watchEntries)
      .innerJoin(titles, eq(watchEntries.titleId, titles.id))
      .where(eq(watchEntries.userId, userId)),
    db
      .select({ birthYear: users.birthYear, contentAffinities: users.contentAffinities })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
  ]);
  const demographic = demographicRows[0] ?? null;

  // Rated-taste model: "your taste" is the set of rated entries. Each
  // entry's effective rating is the user's 1-10 score, adjusted by Elo
  // from pairwise comparisons (if any). High-rated FRANCHISES (≥ 9
  // mean effective rating) become anchors.
  const anchorThreshold = 9;
  const ratedEntries = userEntries.flatMap((e) =>
    e.rating !== null
      ? [
          {
            titleId: e.titleId,
            title: e.title,
            rating: effectiveRating(e.rating, e.eloScore),
          },
        ]
      : [],
  );

  // ADR-0023: collapse to one synthetic row per franchise. The
  // representative is the lowest-specificity rated entry in each group;
  // its titleId is what the engine sees, its tags are what get scored.
  const franchiseRows = aggregateByFranchise(ratedEntries);

  const ratings: RatedTitle[] = franchiseRows.map((f) => ({
    titleId: f.representativeTitleId,
    rating: f.meanRating,
  }));
  const anchors: AnchorPick[] = franchiseRows
    .filter((f) => f.meanRating >= anchorThreshold)
    .map((f) => ({ titleId: f.representativeTitleId }));

  const userTitleIds = userEntries.map((e) => e.titleId);
  const emptyPayload: RecommendationsPayload = { schemaVersion: 2, items: [] };

  // Cold-start: no signal to score on. Write empty recs, skip ML + candidate
  // fetch entirely. The empty user_titles_ids array would also break the
  // notInArray() candidate filter below (`NOT IN ()` is invalid SQL), so this
  // short-circuit is correctness, not just optimisation.
  if (anchors.length === 0 && ratings.length === 0) {
    await db
      .insert(userRecommendations)
      .values({ userId, payload: emptyPayload })
      .onConflictDoUpdate({
        target: userRecommendations.userId,
        set: { payload: emptyPayload, computedAt: new Date() },
      });
    return { recCount: 0 };
  }

  // Build TitleTagSet[] for the user's history titles.
  const userTitleTagRows = await db
    .select({
      titleId: titleTags.titleId,
      tagId: titleTags.tagId,
      weight: titleTags.weight,
    })
    .from(titleTags)
    .where(inArray(titleTags.titleId, userTitleIds));

  // Build TitleTagSet[] for candidates (everything NOT in user's library).
  // For Phase 1A scale (~2k titles, ~16k title_tags rows) this fits in memory
  // and JS-side merging is fine. Above ~50k candidates, switch to SQL-side
  // scoring or paginated streaming.
  const candidateTagRows = await db
    .select({
      titleId: titleTags.titleId,
      tagId: titleTags.tagId,
      weight: titleTags.weight,
    })
    .from(titleTags)
    .where(notInArray(titleTags.titleId, userTitleIds));

  // Franchise-level exclusion. notInArray above only catches the exact
  // titles the user has rated; OTHER seasons of the same franchise
  // (which the user implicitly "has" via the franchise-as-unit-of-taste
  // contract in ADR-0023) would still be candidates. Result: recs like
  // "Attack on Titan Final Season" appearing for a user who already has
  // "Attack on Titan" rated. Exclude them.
  //
  // Compute the set of franchise keys in the user's library, then fetch
  // candidate title texts to compute franchiseKey on each and filter.
  // Phase 1A scale (~2k titles) makes the JS filter cheap.
  const userFranchiseKeys = new Set(userEntries.map((e) => franchiseKey(e.title)));
  const candidateTitleIds = Array.from(new Set(candidateTagRows.map((r) => r.titleId)));
  const candidateTitleTexts =
    candidateTitleIds.length > 0
      ? await db
          .select({ id: titles.id, title: titles.title, releaseYear: titles.releaseYear })
          .from(titles)
          .where(inArray(titles.id, candidateTitleIds))
      : [];
  const sameFranchiseCandidateIds = new Set(
    candidateTitleTexts
      .filter((t) => userFranchiseKeys.has(franchiseKey(t.title)))
      .map((t) => t.id),
  );
  const filteredCandidateTagRows = candidateTagRows.filter(
    (r) => !sameFranchiseCandidateIds.has(r.titleId),
  );

  const userTitles = groupTagsIntoTitleSets(userTitleTagRows);
  const candidates = groupTagsIntoTitleSets(filteredCandidateTagRows);

  // Cross-medium theme bridge — see packages/ml/src/recommendation.ts §JSDoc
  // and apps/web/src/server/schema/themes.ts for the editorial substrate.
  // Pulled in full because the table is small (~86 rows for the v1 mapping
  // set) and the entire join is needed at score time. If this scales past
  // ~10k rows, narrow to themes the user's tags actually touch.
  const themeRows = await db
    .select({ tagId: tagThemes.tagId, themeId: tagThemes.themeId, strength: tagThemes.strength })
    .from(tagThemes);
  const themeMembership: TagThemeMembership[] = themeRows;

  // LLM-extracted facet slugs for user history titles — used to build the
  // facet taste vector (which slugs the user's liked/disliked titles carry).
  const userFacetRows =
    userTitleIds.length > 0
      ? await db
          .select({
            titleId: titleThemes.titleId,
            slug: titleThemes.themeSlug,
            confidence: titleThemes.confidence,
          })
          .from(titleThemes)
          .where(inArray(titleThemes.titleId, userTitleIds))
      : [];
  const userFacets: TitleFacetSet[] = Object.values(
    userFacetRows.reduce<Record<string, TitleFacetSet>>((acc, row) => {
      if (!acc[row.titleId]) acc[row.titleId] = { titleId: row.titleId, facets: [] };
      (acc[row.titleId]!.facets as Array<{ slug: string; confidence: number }>).push({
        slug: row.slug,
        confidence: row.confidence,
      });
      return acc;
    }, {}),
  );

  // LLM-extracted facet slugs for candidates. The candidate set can be
  // 10k+ titles — too large for a single inArray call (Postgres param limit)
  // and too large to load the full table (92k rows, times out). Instead batch
  // the candidate IDs into chunks of 500 and query only those titles that
  // actually have tags (i.e. are in the candidate set after tag filtering).
  // Only titles with themes contribute facet signal anyway.
  const FACET_CHUNK_SIZE = 500;
  const candidateIdsWithTags = candidates.map((c) => c.titleId);
  const candidateFacetRows: Array<{ titleId: string; slug: string; confidence: number }> = [];
  for (let i = 0; i < candidateIdsWithTags.length; i += FACET_CHUNK_SIZE) {
    const chunk = candidateIdsWithTags.slice(i, i + FACET_CHUNK_SIZE);
    const rows = await db
      .select({
        titleId: titleThemes.titleId,
        slug: titleThemes.themeSlug,
        confidence: titleThemes.confidence,
      })
      .from(titleThemes)
      .where(inArray(titleThemes.titleId, chunk));
    candidateFacetRows.push(...rows);
  }
  const candidateFacets: TitleFacetSet[] = Object.values(
    candidateFacetRows.reduce<Record<string, TitleFacetSet>>((acc, row) => {
      if (!acc[row.titleId]) acc[row.titleId] = { titleId: row.titleId, facets: [] };
      (acc[row.titleId]!.facets as Array<{ slug: string; confidence: number }>).push({
        slug: row.slug,
        confidence: row.confidence,
      });
      return acc;
    }, {}),
  );

  // Release year lookup for the era boost — keyed by titleId.
  const releaseYearById = new Map<string, number | null>(
    candidateTitleTexts.map((t) => [t.id, t.releaseYear ?? null]),
  );

  const { tasteVector: taste, facetVector } = extractTasteVector(
    { anchors, ratings },
    userTitles,
    userFacets,
  );
  const recs = recommendForUser(
    taste,
    candidates,
    REC_LIMIT,
    themeMembership,
    facetVector,
    candidateFacets,
  );

  // Resolve tag + theme names for the explain pass AND demographic
  // affinity boost (which needs names across all 200 recs, not just
  // the top-50 explain depth).
  const candidatesById = new Map(candidates.map((c) => [c.titleId, c]));
  const referencedTagIds = new Set<string>();
  for (const rec of recs) {
    const c = candidatesById.get(rec.titleId);
    if (c) for (const t of c.tags) referencedTagIds.add(t.tagId);
  }
  // Tags the user has in their taste also need names (theme-bridge
  // reasons reference them via bridgedFromTagIds, though the headline
  // currently doesn't). Add for completeness — query cost is one IN
  // list either way.
  for (const tagId of taste.keys()) referencedTagIds.add(tagId);

  // Load name + category so formatReasonHint can skip cast/demographic
  // tags. Category is null for TMDB rows; the blocklist falls back to a
  // name-based filter for those.
  const tagInfo = new Map<string, TagInfo>();
  if (referencedTagIds.size > 0) {
    const tagRows = await db
      .select({ id: tags.id, name: tags.name, category: tags.category })
      .from(tags)
      .where(inArray(tags.id, Array.from(referencedTagIds)));
    for (const t of tagRows) tagInfo.set(t.id, { name: t.name, category: t.category });
  }

  const themeNames = new Map<string, string>();
  const themeRows2 = await db.select({ id: themes.id, name: themes.name }).from(themes);
  for (const t of themeRows2) themeNames.set(t.id, t.name);

  // --- Demographic post-scoring boosts ---
  // Applied after taste-vector scoring so watch history still dominates.
  // Only fires when the user opted in (affinities set) or provided birth year.
  const activeAffinities = demographic?.contentAffinities ?? [];
  const birthYear = demographic?.birthYear ?? null;
  const eraStart = birthYear !== null ? birthYear + ERA_START_OFFSET : null;
  const eraEnd = birthYear !== null ? birthYear + ERA_END_OFFSET : null;

  // Build a set of titleIds that match at least one active affinity via tag
  // name substring. Uses the tagInfo map we just loaded (covers all 200 recs).
  const affinityTitleIds = new Set<string>();
  if (activeAffinities.length > 0) {
    for (const rec of recs) {
      const candidate = candidatesById.get(rec.titleId);
      if (!candidate) continue;
      outer: for (const tag of candidate.tags) {
        const info = tagInfo.get(tag.tagId);
        if (!info) continue;
        const lowerName = info.name.toLowerCase();
        for (const affinity of activeAffinities) {
          const keywords = AFFINITY_TAG_SUBSTRINGS[affinity] ?? [];
          if (keywords.some((kw) => lowerName.includes(kw))) {
            affinityTitleIds.add(rec.titleId);
            break outer;
          }
        }
      }
    }
  }

  // Apply boosts and re-sort. Scores are re-ranked so the explain step
  // below uses the post-boost ordering.
  const boostedRecs =
    activeAffinities.length > 0 || eraStart !== null
      ? recs
          .map((r) => {
            let score = r.score;
            if (affinityTitleIds.has(r.titleId)) score *= 1 + AFFINITY_SCORE_BOOST;
            if (eraStart !== null) {
              const ry = releaseYearById.get(r.titleId) ?? null;
              if (ry !== null && ry >= eraStart && ry <= eraEnd!) score *= 1 + ERA_SCORE_BOOST;
            }
            return score === r.score ? r : { ...r, score };
          })
          .sort((a, b) => b.score - a.score)
      : recs;

  const items = boostedRecs.map((r, i) => {
    if (i >= EXPLAIN_DEPTH) {
      return { titleId: r.titleId, score: r.score, reasonHint: null };
    }
    const candidate = candidatesById.get(r.titleId);
    if (!candidate) return { titleId: r.titleId, score: r.score, reasonHint: null };
    const reasons = explainRecommendation(taste, candidate, themeMembership);
    const reasonHint = formatReasonHint(reasons, tagInfo, themeNames);
    return { titleId: r.titleId, score: r.score, reasonHint };
  });

  const payload: RecommendationsPayload = { schemaVersion: 2, items };

  await db
    .insert(userRecommendations)
    .values({ userId, payload })
    .onConflictDoUpdate({
      target: userRecommendations.userId,
      set: { payload, computedAt: new Date() },
    });

  return { recCount: boostedRecs.length };
}

// Per-user recompute — triggered by the all-users fan-out below or by the
// per-mutation event fires from watch.upsert / watch.remove (and list-import
// fromAnilist / fromMal), so a user who just added an anchor sees fresh
// recs in seconds rather than up to 24 hours.
//
// Debounce coalesces bursts: an onboarding session that picks 6 anchors
// in 10 seconds fires 6 events but only one recompute runs — the last
// event's trigger time. 30s is long enough to cover a typical pick burst
// (multi-second think time between picks) and short enough that the user
// sees fresh recs by the time they navigate to /. Key is per-user so
// concurrent users don't interfere with each other.
export const recommendUser = inngest.createFunction(
  {
    id: 'recommend-user',
    name: 'Recommend: recompute for a single user',
    retries: 3,
    debounce: { key: 'event.data.userId', period: '30s' },
    triggers: [recommendUserEvent],
  },
  async ({ event, step }) => {
    const { userId } = event.data;
    return await step.run('recompute', () => recomputeUserRecommendations(userId));
  },
);

// Nightly cron: fan out one recommend-user event per user. 04:00 UTC, after
// the TMDB sync (03:00) and AniList sync (03:30) have refreshed the title
// catalogue.
//
// Inngest free-tier consideration (per docs/runbooks/inngest.md): N users
// × 1 daily cron = N invocations of recommendUser per day. We're 1-2 users
// today; at ~50 users this still fits comfortably in the 50k/month free
// invocation cap.
export const recommendAllUsers = inngest.createFunction(
  {
    id: 'recommend-all-users',
    name: 'Recommend: nightly fan-out',
    retries: 1,
    triggers: [recommendAllUsersEvent, cron('0 4 * * *')],
  },
  async ({ step }) => {
    const userIds = await step.run('fetch-user-ids', async () => {
      const rows = await db.select({ id: users.id }).from(users);
      return rows.map((r) => r.id);
    });

    if (userIds.length > 0) {
      await step.sendEvent(
        'fan-out',
        userIds.map((id) => recommendUserEvent.create({ userId: id })),
      );
    }

    return { users: userIds.length };
  },
);
