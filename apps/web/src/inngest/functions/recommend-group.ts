import { eq, inArray, notInArray } from 'drizzle-orm';
import { cron } from 'inngest';
import {
  extractTasteVector,
  recommendForGroup,
  type AnchorPick,
  type GroupMember,
  type RatedTitle,
  type TagThemeMembership,
  type TitleTagSet,
} from '@helpme2c/ml';
import { db } from '@/server/db';
import {
  type GroupRecommendationsPayload,
  groupMemberships,
  groupRecommendations,
  groups,
  tagThemes,
  titleTags,
  watchEntries,
} from '@/server/schema';
import { inngest, recommendAllGroupsEvent, recommendGroupEvent } from '../client';

// Group rec params per ADR-0020 starting points (to be calibrated against
// the eval harness output). 0.5 / 0.5 are the harness's documented
// defaults — survives the compatible-couple tests, vetoes the
// incompatible-couple tests, lets bridges through for mixed-medium.
const VETO_THRESHOLD = 0.5;
const LAMBDA = 0.5;

// Top-N matches the personal-rec cap (200). Group dashboard slices to
// 20 at render time; we cache the full list so the dashboard can apply
// post-ranking filters cheaply (similar to recommendations.list).
const REC_LIMIT = 200;

// Computes group recs for one group: builds taste vectors per member,
// excludes any title in ANY member's library (group recs shouldn't
// recommend something one of you has already seen), runs recommendForGroup
// with the AWM + disagreement penalty + veto floor, writes the JSONB
// payload to group_recommendations.
//
// Pure-ish bridge between the DB and packages/ml — same shape as
// recomputeUserRecommendations but operating over a member array.
//
// Cold-start short-circuit: if the group has zero members, write empty
// recs and return. (This shouldn't happen — owners are auto-added on
// create — but defends against orphan groups during partial failures.)
export async function recomputeGroupRecommendations(
  groupId: string,
): Promise<{ recCount: number }> {
  const memberRows = await db
    .select({ userId: groupMemberships.userId })
    .from(groupMemberships)
    .where(eq(groupMemberships.groupId, groupId));
  const memberIds = memberRows.map((r) => r.userId);

  const emptyPayload: GroupRecommendationsPayload = {
    schemaVersion: 1,
    params: { vetoThreshold: VETO_THRESHOLD, lambda: LAMBDA },
    items: [],
  };

  if (memberIds.length === 0) {
    await db
      .insert(groupRecommendations)
      .values({ groupId, payload: emptyPayload })
      .onConflictDoUpdate({
        target: groupRecommendations.groupId,
        set: { payload: emptyPayload, computedAt: new Date() },
      });
    return { recCount: 0 };
  }

  // Pull every member's history in one query.
  const allEntries = await db
    .select({
      userId: watchEntries.userId,
      titleId: watchEntries.titleId,
      kind: watchEntries.kind,
      rating: watchEntries.rating,
    })
    .from(watchEntries)
    .where(inArray(watchEntries.userId, memberIds));

  // Group entries by userId so we can build per-member history blocks.
  const entriesByUser = new Map<string, typeof allEntries>();
  for (const e of allEntries) {
    let bucket = entriesByUser.get(e.userId);
    if (!bucket) {
      bucket = [];
      entriesByUser.set(e.userId, bucket);
    }
    bucket.push(e);
  }

  // All title ids touched by any member's history — needed both to build
  // taste vectors (we need tag data for these) AND to exclude them from
  // candidates (the rec engine shouldn't recommend a title ANY member
  // already has in their library).
  const allMemberTitleIds = Array.from(new Set(allEntries.map((e) => e.titleId)));

  // No history across the entire group → cold-start group. Skip the
  // candidate fetch (notInArray on empty would break anyway) and write
  // empty recs. Same defensive pattern as recomputeUserRecommendations.
  if (allMemberTitleIds.length === 0) {
    await db
      .insert(groupRecommendations)
      .values({ groupId, payload: emptyPayload })
      .onConflictDoUpdate({
        target: groupRecommendations.groupId,
        set: { payload: emptyPayload, computedAt: new Date() },
      });
    return { recCount: 0 };
  }

  // Tag data for the union of every member's history titles.
  const memberTitleTagRows = await db
    .select({
      titleId: titleTags.titleId,
      tagId: titleTags.tagId,
      weight: titleTags.weight,
    })
    .from(titleTags)
    .where(inArray(titleTags.titleId, allMemberTitleIds));

  // Candidates: every title NOT in any member's library. Same memory
  // budget as recomputeUserRecommendations — fits Phase 1A scale.
  const candidateTagRows = await db
    .select({
      titleId: titleTags.titleId,
      tagId: titleTags.tagId,
      weight: titleTags.weight,
    })
    .from(titleTags)
    .where(notInArray(titleTags.titleId, allMemberTitleIds));

  const memberTitles = groupTagsIntoTitleSets(memberTitleTagRows);
  const candidates = groupTagsIntoTitleSets(candidateTagRows);

  // Build per-member taste vectors.
  const groupMembersForML: GroupMember[] = memberIds.map((userId) => {
    const userEntries = entriesByUser.get(userId) ?? [];
    const anchors: AnchorPick[] = userEntries
      .filter((e) => e.kind === 'anchor')
      .map((e) => ({ titleId: e.titleId }));
    const ratings: RatedTitle[] = userEntries.flatMap((e) =>
      e.kind === 'tracking' && e.rating !== null ? [{ titleId: e.titleId, rating: e.rating }] : [],
    );
    const taste = extractTasteVector({ anchors, ratings }, memberTitles);
    return { userId, taste };
  });

  // Cross-medium theme bridge — same pull as recomputeUserRecommendations.
  const themeRows = await db
    .select({ tagId: tagThemes.tagId, themeId: tagThemes.themeId, strength: tagThemes.strength })
    .from(tagThemes);
  const themeMembership: TagThemeMembership[] = themeRows;

  const recs = recommendForGroup(
    groupMembersForML,
    candidates,
    { vetoThreshold: VETO_THRESHOLD, lambda: LAMBDA },
    themeMembership,
    REC_LIMIT,
  );

  // Serialise perUserScores Map → plain object for JSONB storage.
  const payload: GroupRecommendationsPayload = {
    schemaVersion: 1,
    params: { vetoThreshold: VETO_THRESHOLD, lambda: LAMBDA },
    items: recs.map((r) => ({
      titleId: r.titleId,
      groupScore: r.groupScore,
      perUserScores: Object.fromEntries(r.perUserScores),
    })),
  };

  await db
    .insert(groupRecommendations)
    .values({ groupId, payload })
    .onConflictDoUpdate({
      target: groupRecommendations.groupId,
      set: { payload, computedAt: new Date() },
    });

  return { recCount: recs.length };
}

// Group flat (titleId, tagId, weight) rows into TitleTagSet[] for the ML
// functions. Same helper as recommend.ts; duplicating rather than
// extracting because the duplication is trivially small and these
// functions evolve independently.
function groupTagsIntoTitleSets(
  rows: ReadonlyArray<{ titleId: string; tagId: string; weight: number }>,
): TitleTagSet[] {
  const byTitle = new Map<
    string,
    { titleId: string; tags: Array<{ tagId: string; weight: number }> }
  >();
  for (const row of rows) {
    let entry = byTitle.get(row.titleId);
    if (!entry) {
      entry = { titleId: row.titleId, tags: [] };
      byTitle.set(row.titleId, entry);
    }
    entry.tags.push({ tagId: row.tagId, weight: row.weight });
  }
  return Array.from(byTitle.values());
}

// Per-group recompute — triggered on demand (member join/leave) or by
// the all-groups fan-out. Single step.run wraps the whole compute since
// the JSONB write is a single SQL statement.
export const recommendGroup = inngest.createFunction(
  {
    id: 'recommend-group',
    name: 'Recommend: recompute for a single group',
    retries: 3,
    triggers: [recommendGroupEvent],
  },
  async ({ event, step }) => {
    const { groupId } = event.data;
    return await step.run('recompute', () => recomputeGroupRecommendations(groupId));
  },
);

// Nightly cron: fan out one recommend-group event per group. Runs at
// 04:30 UTC, after the personal-rec cron at 04:00 (so any per-user
// taste-vector changes have settled).
//
// Step-runs budget: 1 fan-out + 1 per group. Even with 100 groups we're
// at ~100 step.runs/cron — well under the free-tier 1k/day cap (per the
// post-batching budget in docs/runbooks/inngest.md).
export const recommendAllGroups = inngest.createFunction(
  {
    id: 'recommend-all-groups',
    name: 'Recommend: nightly group fan-out',
    retries: 1,
    triggers: [recommendAllGroupsEvent, cron('30 4 * * *')],
  },
  async ({ step }) => {
    const groupIds = await step.run('fetch-group-ids', async () => {
      const rows = await db.select({ id: groups.id }).from(groups);
      return rows.map((r) => r.id);
    });

    if (groupIds.length > 0) {
      await step.sendEvent(
        'fan-out',
        groupIds.map((id) => recommendGroupEvent.create({ groupId: id })),
      );
    }

    return { groups: groupIds.length };
  },
);
