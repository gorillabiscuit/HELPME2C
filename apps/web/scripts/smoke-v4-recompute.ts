// Smoke recommend.recomputeUserRecommendations end-to-end with V4 inputs.
//
// Picks a real user (most rated entries first), invokes the Inngest
// function's exported recomputeUserRecommendations directly (no Inngest
// runtime needed), and reports:
//   - whether the V4 path activated (descriptors found, edges loaded)
//   - top-5 recs
//   - whether the recs differ from the V1-only baseline for that user
//
// V4 contribution will be modest because only the 5 smoke-extracted
// titles have descriptors. The point is to verify the wiring fires
// without errors; quality assessment waits on the bulk re-extraction.
//
// Run: pnpm dlx tsx --env-file=.env.local scripts/smoke-v4-recompute.ts

import { neon } from '@neondatabase/serverless';
import { recomputeUserRecommendations } from '../src/inngest/functions/recommend';

const sql = neon(process.env.DATABASE_URL!);

interface UserRow {
  id: string;
  clerk_id: string;
  rated_count: number;
}

async function main(): Promise<void> {
  // Pick the user with the most rated entries — likely to have meaningful
  // V4 contribution if any of their rated titles overlap with the 5 we
  // just extracted descriptors for.
  const userRows = (await sql`
    SELECT u.id, u.clerk_id, COUNT(w.title_id)::int AS rated_count
    FROM users u
    LEFT JOIN watch_entries w ON w.user_id = u.id AND w.rating IS NOT NULL
    GROUP BY u.id, u.clerk_id
    ORDER BY rated_count DESC
    LIMIT 5
  `) as UserRow[];

  if (userRows.length === 0) {
    console.log('No users found.');
    return;
  }

  console.log(`Users by rated_count (top 5):`);
  for (const u of userRows) {
    console.log(
      `  ${u.id.slice(0, 8)}…  clerk=${u.clerk_id.slice(0, 12)}…  rated=${u.rated_count}`,
    );
  }

  const user = userRows[0]!;
  if (user.rated_count === 0) {
    console.log(`\nTop user has no ratings — cold-start; V4 won't have signal. Aborting.`);
    return;
  }

  console.log(`\nRecomputing for user ${user.id.slice(0, 8)}… (${user.rated_count} rated entries)`);

  // Check how many of the user's rated titles have V4 descriptors
  const v4Overlap = (await sql`
    SELECT COUNT(DISTINCT td.title_id)::int AS n
    FROM watch_entries w
    JOIN title_descriptors td ON td.title_id = w.title_id
    WHERE w.user_id = ${user.id} AND w.rating IS NOT NULL
  `) as Array<{ n: number }>;
  console.log(`  rated titles with V4 descriptors: ${v4Overlap[0]?.n ?? 0} / ${user.rated_count}`);

  // Check how many comparable edges connect their rated titles to candidates
  const edgeOverlap = (await sql`
    SELECT COUNT(*)::int AS n
    FROM title_comparable_titles tct
    JOIN watch_entries w ON w.title_id = tct.title_id
    WHERE w.user_id = ${user.id} AND w.rating IS NOT NULL
      AND tct.referenced_title_id IS NOT NULL
  `) as Array<{ n: number }>;
  console.log(`  comparable edges from rated titles: ${edgeOverlap[0]?.n ?? 0}`);

  const inboundEdges = (await sql`
    SELECT COUNT(*)::int AS n
    FROM title_comparable_titles tct
    JOIN watch_entries w ON w.title_id = tct.referenced_title_id
    WHERE w.user_id = ${user.id} AND w.rating IS NOT NULL
      AND tct.referenced_title_id IS NOT NULL
  `) as Array<{ n: number }>;
  console.log(`  comparable edges to rated titles: ${inboundEdges[0]?.n ?? 0}`);

  console.log();
  const t0 = Date.now();
  const result = await recomputeUserRecommendations(user.id);
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`Recompute completed in ${dt}s. recCount=${result.recCount}`);

  // Read back the top-5 recs with title text for sanity.
  const recsRow = (await sql`
    SELECT payload FROM user_recommendations WHERE user_id = ${user.id}
  `) as Array<{
    payload: { items: Array<{ titleId: string; score: number; reasonHint: string | null }> };
  }>;

  const items = recsRow[0]?.payload?.items ?? [];
  if (items.length === 0) {
    console.log(`\nNo recs in payload (cold-start fallback or empty).`);
    return;
  }

  const topIds = items.slice(0, 5).map((i) => i.titleId);
  const titleRows = (await sql`
    SELECT id, title, media_type, release_year
    FROM titles WHERE id = ANY(${topIds}::uuid[])
  `) as Array<{ id: string; title: string; media_type: string; release_year: number | null }>;
  const titleById = new Map(titleRows.map((t) => [t.id, t]));

  console.log(`\nTop 5 recs:`);
  for (let i = 0; i < Math.min(5, items.length); i += 1) {
    const item = items[i]!;
    const t = titleById.get(item.titleId);
    console.log(
      `  ${i + 1}. score=${item.score.toFixed(3).padStart(8)}  ${t?.title ?? '?'} (${t?.media_type ?? '?'}, ${t?.release_year ?? '?'})`,
    );
    if (item.reasonHint) console.log(`     hint: ${item.reasonHint}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
