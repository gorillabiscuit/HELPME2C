import { eq, inArray, isNotNull, notInArray } from 'drizzle-orm';
import { cron } from 'inngest';
import {
  buildV4TasteVector,
  explainRecommendation,
  extractTasteVector,
  recommendForUser,
  type AnchorPick,
  type ComparableEdge,
  type ExplanationReason,
  type RatedTitle,
  type TagThemeMembership,
  type V4Descriptor,
  type V4RecInputs,
} from '@helpme2c/ml';
import { db } from '@/server/db';
import {
  type RecommendationsPayload,
  tags,
  tagThemes,
  themes,
  titleComparableTitles,
  titleDescriptors,
  titles,
  titleTags,
  titleThemes,
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
  const userEntries = await db
    .select({
      titleId: watchEntries.titleId,
      title: titles.title,
      kind: watchEntries.kind,
      rating: watchEntries.rating,
      eloScore: watchEntries.eloScore,
    })
    .from(watchEntries)
    .innerJoin(titles, eq(watchEntries.titleId, titles.id))
    .where(eq(watchEntries.userId, userId));

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
          .select({ id: titles.id, title: titles.title })
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

  const taste = extractTasteVector({ anchors, ratings }, userTitles);

  // ---------------------------------------------------------------------
  // V4 content-descriptor inputs — see ADR-0027 §what-we-chose. Wired in
  // additively: if V4 data hasn't been extracted yet for a title, that
  // title contributes 0 to V4 scoring and the V1 tag-overlap path still
  // runs normally. Absence of any V4 data → recommendForUser reduces to
  // V1 behaviour exactly.
  //
  // Three fetches:
  //   1. title_descriptors for user's rated/anchor titles (for taste vec)
  //   2. title_descriptors for candidates (for per-candidate scoring)
  //   3. resolved-FK comparable edges across rated + candidate set
  //
  // Phase 1A scale (~3k titles, ~15k comparable edges total) means we
  // fetch broadly and filter client-side. At larger scale, narrow the
  // edges fetch to only edges touching the user's titles + candidates.
  // ---------------------------------------------------------------------

  const v4TitleIds = Array.from(
    new Set([...franchiseRows.map((f) => f.representativeTitleId), ...candidateTitleIds]),
  );

  // Scoring needs only the enum + theme fields; the open-vocab arrays
  // (viewer_pleasures, tone, subtextual_themes) are stored but not
  // consumed until Phase 2 embedding scoring (ADR-0027 §what-we-chose).
  const v4DescriptorRows =
    v4TitleIds.length > 0
      ? await db
          .select({
            titleId: titleDescriptors.titleId,
            narrativeMode: titleDescriptors.narrativeMode,
            engagementLevel: titleDescriptors.engagementLevel,
            stakesScale: titleDescriptors.stakesScale,
          })
          .from(titleDescriptors)
          .where(inArray(titleDescriptors.titleId, v4TitleIds))
      : [];

  // V4 themes live in the existing title_themes table (re-extracted by
  // the V4 pipeline with prompt_version='v4.0'). Fetch in the same window
  // so we can build the V4Descriptor for each title.
  const v4ThemeRows =
    v4TitleIds.length > 0
      ? await db
          .select({
            titleId: titleThemes.titleId,
            slug: titleThemes.themeSlug,
            confidence: titleThemes.confidence,
          })
          .from(titleThemes)
          .where(inArray(titleThemes.titleId, v4TitleIds))
      : [];

  const themesByTitle = new Map<string, Array<{ slug: string; confidence: number }>>();
  for (const r of v4ThemeRows) {
    let arr = themesByTitle.get(r.titleId);
    if (!arr) {
      arr = [];
      themesByTitle.set(r.titleId, arr);
    }
    arr.push({ slug: r.slug, confidence: r.confidence });
  }

  const candidateDescriptors = new Map<string, V4Descriptor>();
  const userDescriptors = new Map<string, V4Descriptor>();
  for (const d of v4DescriptorRows) {
    const descriptor: V4Descriptor = {
      themes: themesByTitle.get(d.titleId) ?? [],
      narrativeMode: d.narrativeMode,
      engagementLevel: d.engagementLevel,
      stakesScale: d.stakesScale,
    };
    candidateDescriptors.set(d.titleId, descriptor);
    userDescriptors.set(d.titleId, descriptor);
  }

  // Resolved-FK edges only — unresolved strings contribute nothing per
  // ADR-0027. Pull all; the edge index in packages/ml is O(degree) per
  // candidate so the candidate-set filter happens implicitly at scoring.
  const v4EdgeRows = await db
    .select({
      fromId: titleComparableTitles.titleId,
      toId: titleComparableTitles.referencedTitleId,
      position: titleComparableTitles.position,
    })
    .from(titleComparableTitles)
    .where(isNotNull(titleComparableTitles.referencedTitleId));

  const comparableEdges: ComparableEdge[] = v4EdgeRows
    .filter((e): e is { fromId: string; toId: string; position: number } => e.toId !== null)
    .map((e) => ({ fromTitleId: e.fromId, toTitleId: e.toId, position: e.position }));

  // Rating deltas per ADR-0024 bipolar mapping. Anchors are implicit at
  // delta=+1.0 because they appear in franchiseRows with meanRating≥9
  // → (9 - 5.5) / 4.5 ≈ 0.78, which is sub-1.0. Bump anchors explicitly
  // to +1.0 to match the V1 ANCHOR_CONTRIBUTION semantics.
  const userRatings = new Map<string, number>();
  for (const f of franchiseRows) {
    userRatings.set(f.representativeTitleId, (f.meanRating - 5.5) / 4.5);
  }
  for (const a of anchors) {
    userRatings.set(a.titleId, 1.0);
  }

  const v4Taste = buildV4TasteVector({ anchors, ratings }, userDescriptors);

  // Only pass v4 if there's meaningful signal — empty taste vector means
  // V4 extraction hasn't run yet or the user's titles all lack descriptors.
  // In that case skip the v4 path and let V1 carry the load.
  const v4Active =
    v4Taste.themesByWeight.size > 0 || v4Taste.modePref.size > 0 || candidateDescriptors.size > 0;

  const v4Inputs: V4RecInputs | undefined = v4Active
    ? {
        taste: v4Taste,
        candidateDescriptors,
        comparableEdges,
        userRatings,
      }
    : undefined;

  const recs = recommendForUser(taste, candidates, REC_LIMIT, themeMembership, v4Inputs);

  // Resolve tag + theme names for the explain pass. Both tables are
  // small (~few hundred rows each); single SELECT per cron run is
  // cheap. The maps stay in scope only for this user's compute.
  const candidatesById = new Map(candidates.map((c) => [c.titleId, c]));
  const explainTitleIds = recs.slice(0, EXPLAIN_DEPTH).map((r) => r.titleId);
  const referencedTagIds = new Set<string>();
  for (const titleId of explainTitleIds) {
    const c = candidatesById.get(titleId);
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

  const items = recs.map((r, i) => {
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

  return { recCount: recs.length };
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
