import { eq, inArray } from 'drizzle-orm';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/server/db';
import {
  groupMemberships,
  groupRecommendations,
  groups,
  recFeedback,
  titles,
  userRecommendations,
  userStreamingProviders,
  users,
  watchEntries,
} from '@/server/schema';

// GET /api/account/export
//
// Combined Article 15 (right of access) + Article 20 (right to data
// portability) implementation per ADR-0012 §1.
//
// Returns all data we hold on the authenticated user as machine-readable
// JSON, served with `Content-Disposition: attachment` so browsers offer
// a download dialog.
//
// Schema versioning: the response includes
// `schema: "helpme2c.account-export.v2"` — bumped from v1 in M9 when the
// post-M3 user-data tables (watch_entries, recommendations, streaming
// providers, rec feedback, group memberships, owned groups) were folded
// in. Bump again when adding/renaming top-level keys.
//
// Title metadata is denormalised in (every per-title row joins to
// titles) so the export is human-readable without having to cross-
// reference UUIDs against another file. Cost: a few extra fields per
// row; benefit: a user opening the JSON sees show names directly.
//
// Deliberately NOT included:
//   - Clerk private_metadata (server-only by design — ADR-0012 §5)
//   - Session tokens (security risk if leaked)
//   - Other users' data (obvious)
//   - Catalogue data not attributable to the user (titles table itself,
//     tag taxonomy, theme mappings — these are public reference data)
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Resolve internal UUID for FK queries below.
  const [dbRow] = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1);
  if (!dbRow) {
    // The Clerk user exists but no DB row. Edge case: signup raced with
    // export request. Return Clerk-only data with a note.
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    return jsonAttachment(
      {
        schema: 'helpme2c.account-export.v2',
        exportedAt: new Date().toISOString(),
        note: 'No HelpME2C DB row found — only Clerk identity is exported.',
        user: {
          our_database: null,
          clerk: clerkUserShape(clerkUser),
        },
      },
      'helpme2c-export',
    );
  }

  const internalUserId = dbRow.id;

  // Pull every per-user row in parallel. Each query is small (single
  // user_id filter), so the round-trip wins outweigh the marginal DB
  // load of a sequential approach.
  const [
    watchRows,
    userRecRow,
    streamingProviderRows,
    recFeedbackRows,
    membershipRows,
    ownedGroupsRows,
  ] = await Promise.all([
    db
      .select({
        titleId: watchEntries.titleId,
        kind: watchEntries.kind,
        status: watchEntries.status,
        rating: watchEntries.rating,
        currentEpisode: watchEntries.currentEpisode,
        notes: watchEntries.notes,
        privacy: watchEntries.privacy,
        createdAt: watchEntries.createdAt,
        updatedAt: watchEntries.updatedAt,
      })
      .from(watchEntries)
      .where(eq(watchEntries.userId, internalUserId)),
    db
      .select()
      .from(userRecommendations)
      .where(eq(userRecommendations.userId, internalUserId))
      .limit(1),
    db
      .select({
        providerId: userStreamingProviders.providerId,
        createdAt: userStreamingProviders.createdAt,
      })
      .from(userStreamingProviders)
      .where(eq(userStreamingProviders.userId, internalUserId)),
    db
      .select({
        titleId: recFeedback.titleId,
        rating: recFeedback.rating,
        dismissed: recFeedback.dismissed,
        createdAt: recFeedback.createdAt,
        updatedAt: recFeedback.updatedAt,
      })
      .from(recFeedback)
      .where(eq(recFeedback.userId, internalUserId)),
    db
      .select({
        groupId: groupMemberships.groupId,
        role: groupMemberships.role,
        joinedAt: groupMemberships.joinedAt,
      })
      .from(groupMemberships)
      .where(eq(groupMemberships.userId, internalUserId)),
    db.select().from(groups).where(eq(groups.ownerId, internalUserId)),
  ]);

  // Denormalise title names so the export is readable. Single IN-list
  // query for the union of all titleIds the user touches.
  const allTitleIds = Array.from(
    new Set([...watchRows.map((r) => r.titleId), ...recFeedbackRows.map((r) => r.titleId)]),
  );
  const titleMetaRows = allTitleIds.length
    ? await db
        .select({
          id: titles.id,
          title: titles.title,
          mediaType: titles.mediaType,
          source: titles.source,
        })
        .from(titles)
        .where(inArray(titles.id, allTitleIds))
    : [];
  const titleById = new Map(titleMetaRows.map((t) => [t.id, t]));
  const denormaliseTitle = (titleId: string) => {
    const t = titleById.get(titleId);
    return t
      ? { id: t.id, name: t.title, mediaType: t.mediaType, source: t.source }
      : { id: titleId };
  };

  // Group recs cache for groups the user OWNS (memberships above are the
  // user's own membership rows; group_recommendations rows belong to the
  // groups themselves but are exposed via owned-group join).
  const ownedGroupIds = ownedGroupsRows.map((g) => g.id);
  const ownedGroupRecs = ownedGroupIds.length
    ? await db
        .select()
        .from(groupRecommendations)
        .where(inArray(groupRecommendations.groupId, ownedGroupIds))
    : [];

  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);

  const exportData = {
    schema: 'helpme2c.account-export.v2',
    exportedAt: new Date().toISOString(),
    user: {
      our_database: dbRow,
      clerk: clerkUserShape(clerkUser),
    },
    watch_entries: watchRows.map((r) => ({
      title: denormaliseTitle(r.titleId),
      kind: r.kind,
      status: r.status,
      rating: r.rating,
      currentEpisode: r.currentEpisode,
      notes: r.notes,
      privacy: r.privacy,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    // The cached personal-rec payload is included verbatim — it's
    // computed from the user's data, so the user has a right to
    // portable access. Schema is versioned (RecommendationsPayload).
    personal_recommendations: userRecRow[0] ?? null,
    streaming_providers: streamingProviderRows,
    rec_feedback: recFeedbackRows.map((r) => ({
      title: denormaliseTitle(r.titleId),
      rating: r.rating,
      dismissed: r.dismissed,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    groups: {
      memberships: membershipRows,
      owned: ownedGroupsRows.map((g) => ({
        id: g.id,
        name: g.name,
        inviteToken: g.inviteToken,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt,
      })),
      owned_recommendations: ownedGroupRecs,
    },
  };

  return jsonAttachment(exportData, 'helpme2c-export');
}

function clerkUserShape(
  clerkUser: Awaited<ReturnType<Awaited<ReturnType<typeof clerkClient>>['users']['getUser']>>,
) {
  return {
    id: clerkUser.id,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    primaryEmailAddress: clerkUser.primaryEmailAddress?.emailAddress ?? null,
    publicMetadata: clerkUser.publicMetadata,
    createdAt: new Date(clerkUser.createdAt).toISOString(),
    updatedAt: new Date(clerkUser.updatedAt).toISOString(),
  };
}

function jsonAttachment(data: unknown, basename: string): Response {
  const today = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${basename}-${today}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
