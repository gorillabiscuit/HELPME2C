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
} from '@helpme2c/ml';
import { db } from '@/server/db';
import {
  type RecommendationsPayload,
  tags,
  tagThemes,
  themes,
  titles,
  titleTags,
  userRecommendations,
  users,
  watchEntries,
} from '@/server/schema';
import { aggregateByFranchise } from '@/server/lib/franchise';
import { groupTagsIntoTitleSets } from '../lib/group-tags';
import { inngest, recommendAllUsersEvent, recommendUserEvent } from '../client';

// How many of the top-ranked recs get a precomputed reason hint. Top 50
// covers any dedup-induced position shifts the reader does at render
// time (display top 20, dedup reads 200 candidates → top 50 buffer is
// generous). Items past this rank still get displayed; they just lack
// a reason subtitle. Cheap to extend later if needed.
const EXPLAIN_DEPTH = 50;

// Build a one-line "Why this rec?" string from the engine's top
// ExplanationReason for a single rec. Returns null when no reason
// crosses a meaningful contribution floor (avoids surfacing noise).
//
// Tag names come from the `tags` table, theme names from the `themes`
// table; both Maps are passed in (built once per cron run).
function formatReasonHint(
  reasons: ReadonlyArray<ExplanationReason>,
  tagNames: ReadonlyMap<string, string>,
  themeNames: ReadonlyMap<string, string>,
): string | null {
  if (reasons.length === 0) return null;
  const top = reasons[0];
  if (!top) return null;
  if (top.kind === 'direct-tag') {
    const name = tagNames.get(top.tagId);
    if (!name) return null;
    return `Because you like ${name.toLowerCase()}`;
  }
  // theme-bridge — surface the theme name + (optionally) what the
  // user's interest is that bridges into it.
  if (top.themeId) {
    const themeName = themeNames.get(top.themeId);
    if (!themeName) return null;
    return `Matches your ${themeName.toLowerCase()} interest`;
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

  const userTitles = groupTagsIntoTitleSets(userTitleTagRows);
  const candidates = groupTagsIntoTitleSets(candidateTagRows);

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
  const recs = recommendForUser(taste, candidates, REC_LIMIT, themeMembership);

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

  const tagNames = new Map<string, string>();
  if (referencedTagIds.size > 0) {
    const tagRows = await db
      .select({ id: tags.id, name: tags.name })
      .from(tags)
      .where(inArray(tags.id, Array.from(referencedTagIds)));
    for (const t of tagRows) tagNames.set(t.id, t.name);
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
    const reasonHint = formatReasonHint(reasons, tagNames, themeNames);
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
