// Performance benchmark for the rec pipeline. Per PROJECT.md §55:
//   - Personal recs <500ms p95 (user-facing READ from user_recommendations)
//   - Group recs <2s p95
//
// This script measures TWO things:
// 1. Recompute time — apps/web/src/inngest/functions/recommend.ts
//    recomputeUserRecommendations. Not the user-facing target; runs async
//    via Inngest. Informative because Inngest functions have a 300s
//    Vercel timeout — we want to know how much headroom we have.
// 2. User-recommendations read time — the actual <500ms p95 target.
//    A simple SELECT against user_recommendations by user_id.
//
// Run: pnpm dlx tsx --env-file=.env.local scripts/benchmark-rec-performance.ts

import { neon } from '@neondatabase/serverless';
import { recomputeUserRecommendations } from '../src/inngest/functions/recommend';

const sql = neon(process.env.DATABASE_URL!);

const ITERATIONS = 5;
const READ_ITERATIONS = 20; // reads should be fast, more iterations = better p95 estimate

function percentile(sortedSamples: number[], p: number): number {
  if (sortedSamples.length === 0) return 0;
  const idx = Math.min(sortedSamples.length - 1, Math.ceil(p * sortedSamples.length) - 1);
  return sortedSamples[idx]!;
}

function summarise(label: string, samples: number[]): void {
  const sorted = [...samples].sort((a, b) => a - b);
  const sum = sorted.reduce((s, x) => s + x, 0);
  const mean = sum / sorted.length;
  console.log(
    `  ${label.padEnd(22)} n=${sorted.length}  min=${sorted[0]!.toFixed(0)}ms  median=${percentile(sorted, 0.5).toFixed(0)}ms  mean=${mean.toFixed(0)}ms  p95=${percentile(sorted, 0.95).toFixed(0)}ms  max=${sorted[sorted.length - 1]!.toFixed(0)}ms`,
  );
}

async function main(): Promise<void> {
  // Pick the user with the most rated entries — most realistic load
  const userRows = (await sql`
    SELECT u.id, COUNT(w.title_id)::int AS rated_count
    FROM users u
    LEFT JOIN watch_entries w ON w.user_id = u.id AND w.rating IS NOT NULL
    WHERE u.clerk_id NOT LIKE 'validation_%'
    GROUP BY u.id
    ORDER BY rated_count DESC
    LIMIT 1
  `) as Array<{ id: string; rated_count: number }>;
  if (userRows.length === 0) {
    console.log('No users found.');
    return;
  }
  const user = userRows[0]!;
  console.log(`Benchmarking user ${user.id.slice(0, 8)}… (${user.rated_count} rated entries)`);
  console.log();

  // ------------------------------------------------------------
  // 1. RECOMPUTE — full pipeline
  // ------------------------------------------------------------
  console.log(`=== recomputeUserRecommendations (n=${ITERATIONS}) ===`);
  const recomputeSamples: number[] = [];
  for (let i = 0; i < ITERATIONS; i += 1) {
    const t0 = Date.now();
    await recomputeUserRecommendations(user.id);
    const dt = Date.now() - t0;
    recomputeSamples.push(dt);
    console.log(`  iter ${i + 1}: ${dt}ms`);
  }
  console.log();
  summarise('recompute end-to-end', recomputeSamples);
  console.log();

  // ------------------------------------------------------------
  // 2. READ — user_recommendations payload lookup. This IS the
  //    user-facing target per PROJECT.md §55 (<500ms p95).
  // ------------------------------------------------------------
  console.log(`=== user_recommendations payload read (n=${READ_ITERATIONS}) ===`);
  const readSamples: number[] = [];
  for (let i = 0; i < READ_ITERATIONS; i += 1) {
    const t0 = Date.now();
    const rows = (await sql`
      SELECT payload, computed_at FROM user_recommendations WHERE user_id = ${user.id}
    `) as Array<{ payload: unknown; computed_at: Date }>;
    const dt = Date.now() - t0;
    if (rows.length === 0) {
      console.log(`  iter ${i + 1}: NO ROWS — recompute hasn't run yet?`);
      continue;
    }
    readSamples.push(dt);
  }
  if (readSamples.length > 0) summarise('read payload', readSamples);
  console.log();

  // ------------------------------------------------------------
  // 3. Verdict against PROJECT.md §55 targets
  // ------------------------------------------------------------
  console.log(`=== Verdict vs PROJECT.md §55 ===`);
  const recomputeP95 = percentile(
    [...recomputeSamples].sort((a, b) => a - b),
    0.95,
  );
  const readP95 =
    readSamples.length > 0
      ? percentile(
          [...readSamples].sort((a, b) => a - b),
          0.95,
        )
      : 0;
  console.log(
    `  Recompute p95: ${recomputeP95.toFixed(0)}ms (no formal target; Inngest function timeout 300s)`,
  );
  console.log(
    `  Read p95:      ${readP95.toFixed(0)}ms  (target: <500ms)  ${readP95 < 500 ? '✓ pass' : '✗ MISS'}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
