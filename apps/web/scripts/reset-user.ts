// Dev-only: reset a single user's data so they re-experience cold-start
// onboarding without going through delete-account + recreate. Keeps the
// users row intact (Clerk identity, ageVerified, region, prefs) — only
// wipes user-data tables filtered by user_id.
//
// After running, the user's next visit routes /onboarding (because
// hasAnyRating becomes false in apps/web/src/app/onboarding/page.tsx).
//
// Invoke via:
//   RESET_OK=yes pnpm dlx tsx --env-file=.env.local \
//     scripts/reset-user.ts --clerk-id=user_XXXXXXXXXXXXXXXXXXXX
//
// Refuses to run without RESET_OK=yes so it can't fire by accident.
// Modelled on scripts/db-wipe.ts; same FK-cascade reasoning as
// apps/web/src/app/api/account/delete/route.ts.
import { neon } from '@neondatabase/serverless';

interface UserRow {
  id: string;
  clerk_id: string;
  age_verified: boolean;
}

async function main(): Promise<void> {
  if (process.env.RESET_OK !== 'yes') {
    console.error(
      'Refusing to run without RESET_OK=yes. This script deletes every ' +
        'user-data row for the given clerk-id. Set RESET_OK=yes in the ' +
        'invocation if you really want to reset.',
    );
    process.exit(1);
  }

  const flagIdx = process.argv.indexOf('--clerk-id');
  const clerkId = flagIdx === -1 ? undefined : process.argv[flagIdx + 1];
  if (!clerkId) {
    console.error('Usage: --clerk-id=user_XXXXXXXXXXXXXXXXXXXX');
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL!);

  const userRows = (await sql`
    SELECT id, clerk_id, age_verified
    FROM users
    WHERE clerk_id = ${clerkId}
    LIMIT 1
  `) as UserRow[];
  if (userRows.length === 0) {
    console.error(`No user found with clerk_id = ${clerkId}`);
    process.exit(1);
  }
  const userRow = userRows[0];
  const userId = userRow.id;

  console.log(
    `Resetting user_id=${userId} (clerk_id=${clerkId}, age_verified=${userRow.age_verified}). ` +
      'Users row + Clerk identity + ageVerified are preserved.',
  );

  // FK-safe deletion order. The two non-trivial bits:
  //   1. group_memberships before groups — leave any groups you're in
  //      before deleting groups you own (CASCADE on owned groups would
  //      handle this, but explicit is safer).
  //   2. groups DELETE here is for groups Wouter OWNS — that CASCADEs
  //      to memberships of OTHER users and group_recommendations for
  //      those groups. For a dev reset on your own account, this is
  //      fine; if you owned a real shared group with other testers,
  //      those memberships would also go. That's the intended scope of
  //      "reset MY data".
  await sql`DELETE FROM pairwise_comparisons WHERE user_id = ${userId}`;
  await sql`DELETE FROM rec_feedback WHERE user_id = ${userId}`;
  await sql`DELETE FROM user_recommendations WHERE user_id = ${userId}`;
  await sql`DELETE FROM group_memberships WHERE user_id = ${userId}`;
  await sql`DELETE FROM groups WHERE owner_id = ${userId}`;
  await sql`DELETE FROM user_streaming_providers WHERE user_id = ${userId}`;
  await sql`DELETE FROM watch_entries WHERE user_id = ${userId}`;

  const counts = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM watch_entries           WHERE user_id  = ${userId}) AS watch_entries,
      (SELECT COUNT(*)::int FROM rec_feedback            WHERE user_id  = ${userId}) AS rec_feedback,
      (SELECT COUNT(*)::int FROM user_recommendations    WHERE user_id  = ${userId}) AS user_recommendations,
      (SELECT COUNT(*)::int FROM user_streaming_providers WHERE user_id = ${userId}) AS user_streaming_providers,
      (SELECT COUNT(*)::int FROM group_memberships       WHERE user_id  = ${userId}) AS group_memberships,
      (SELECT COUNT(*)::int FROM groups                  WHERE owner_id = ${userId}) AS groups_owned,
      (SELECT COUNT(*)::int FROM pairwise_comparisons    WHERE user_id  = ${userId}) AS pairwise_comparisons,
      (SELECT COUNT(*)::int FROM users                   WHERE id       = ${userId}) AS user_row_kept
  `;

  console.log(
    'Post-reset row counts (all per-user tables should be 0; user_row_kept should be 1):',
  );
  console.log(JSON.stringify(counts[0], null, 2));
  console.log('Next browser visit will route through /onboarding intro screen.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
