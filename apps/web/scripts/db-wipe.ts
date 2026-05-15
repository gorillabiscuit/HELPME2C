// One-off destructive script: wipes ALL user-data tables in this DB.
// Does NOT touch the catalog (titles, tags, themes, streaming_availability,
// title_tags, tag_themes) — only data that belongs to specific users.
//
// Invoke via:
//   pnpm dlx tsx --env-file=.env.local scripts/db-wipe.ts
//
// Refuses to run without WIPE_OK=yes in the env so it can't fire by
// accident.
import { neon } from '@neondatabase/serverless';

async function main() {
  if (process.env.WIPE_OK !== 'yes') {
    console.error(
      'Refusing to run without WIPE_OK=yes. This script TRUNCATEs ' +
        'every user-data table. Set WIPE_OK=yes in the invocation if ' +
        'you really want to wipe.',
    );
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL!);

  // TRUNCATE users CASCADE removes users + everything that FK-references
  // users (watch_entries, user_recommendations, groups, group_memberships,
  // user_streaming_providers, rec_feedback). Then explicit tables that
  // might not transitively reach users in the wrong order. CASCADE on
  // each handles indirect references (e.g., pairwise_comparisons ->
  // watch_entries -> users).
  //
  // Catalog tables (titles, tags, themes, streaming_availability,
  // title_tags, tag_themes) are deliberately NOT in this list — they
  // hold shared reference data, not user state.
  await sql`
    TRUNCATE TABLE
      pairwise_comparisons,
      rec_feedback,
      user_recommendations,
      group_recommendations,
      group_memberships,
      groups,
      user_streaming_providers,
      watch_entries,
      users
    CASCADE
  `;

  // Verify.
  const counts = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM watch_entries) AS watch_entries,
      (SELECT COUNT(*)::int FROM user_recommendations) AS user_recommendations,
      (SELECT COUNT(*)::int FROM group_recommendations) AS group_recommendations,
      (SELECT COUNT(*)::int FROM groups) AS groups,
      (SELECT COUNT(*)::int FROM group_memberships) AS group_memberships,
      (SELECT COUNT(*)::int FROM rec_feedback) AS rec_feedback,
      (SELECT COUNT(*)::int FROM user_streaming_providers) AS user_streaming_providers,
      (SELECT COUNT(*)::int FROM pairwise_comparisons) AS pairwise_comparisons,
      (SELECT COUNT(*)::int FROM titles) AS titles_kept
  `;

  console.log('Post-wipe row counts (titles is the catalog, kept intact):');
  console.log(JSON.stringify(counts[0], null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
