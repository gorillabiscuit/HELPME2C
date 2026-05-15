// One-off DB status check before destructive operations. Not part of
// the app build — invoke via `pnpm --filter @helpme2c/web tsx scripts/db-status.ts`.
import { neon } from '@neondatabase/serverless';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const tables = await sql`
    SELECT
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM watch_entries) AS watch_entries,
      (SELECT COUNT(*)::int FROM user_recommendations) AS user_recommendations,
      (SELECT COUNT(*)::int FROM group_recommendations) AS group_recommendations,
      (SELECT COUNT(*)::int FROM groups) AS groups,
      (SELECT COUNT(*)::int FROM group_memberships) AS group_memberships,
      (SELECT COUNT(*)::int FROM rec_feedback) AS rec_feedback,
      (SELECT COUNT(*)::int FROM user_streaming_providers) AS user_streaming_providers,
      (SELECT COUNT(*)::int FROM pairwise_comparisons) AS pairwise_comparisons
  `;
  const userRows = await sql`
    SELECT id, clerk_id, display_name, created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT 10
  `;
  console.log('Row counts:');
  console.log(JSON.stringify(tables[0], null, 2));
  console.log('\nUsers (most recent 10):');
  console.log(JSON.stringify(userRows, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
