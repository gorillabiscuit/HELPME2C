import { eq, inArray, notInArray } from 'drizzle-orm';
import { cron } from 'inngest';
import {
  extractTasteVector,
  recommendForUser,
  type AnchorPick,
  type RatedTitle,
  type TagThemeMembership,
} from '@helpme2c/ml';
import { db } from '@/server/db';
import {
  type RecommendationsPayload,
  tagThemes,
  titleTags,
  userRecommendations,
  users,
  watchEntries,
} from '@/server/schema';
import { groupTagsIntoTitleSets } from '../lib/group-tags';
import { inngest, recommendAllUsersEvent, recommendUserEvent } from '../client';

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
export async function recomputeUserRecommendations(userId: string): Promise<{ recCount: number }> {
  const userEntries = await db
    .select({
      titleId: watchEntries.titleId,
      kind: watchEntries.kind,
      rating: watchEntries.rating,
      loved: watchEntries.loved,
    })
    .from(watchEntries)
    .where(eq(watchEntries.userId, userId));

  // Unified-taste model (per docs/UX_AUDIT.md): `loved` is the single
  // source of truth for taste signal. A tracking entry (status=watching,
  // rating=8) can be loved without overwriting its kind, and the
  // historical kind='anchor' rows were backfilled to loved=true at
  // migration time so legacy data still feeds the engine.
  const anchors: AnchorPick[] = userEntries
    .filter((e) => e.loved)
    .map((e) => ({ titleId: e.titleId }));

  // .filter() doesn't narrow non-null; flatMap with explicit narrowing does.
  const ratings: RatedTitle[] = userEntries.flatMap((e) =>
    e.kind === 'tracking' && e.rating !== null ? [{ titleId: e.titleId, rating: e.rating }] : [],
  );

  const userTitleIds = userEntries.map((e) => e.titleId);
  const emptyPayload: RecommendationsPayload = { schemaVersion: 1, items: [] };

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

  const payload: RecommendationsPayload = {
    schemaVersion: 1,
    items: recs.map((r) => ({ titleId: r.titleId, score: r.score })),
  };

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
