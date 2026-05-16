// Count candidates for bulk V4 extraction — informs cost / scope decision.
// Run: pnpm dlx tsx --env-file=.env.local scripts/bulk-v4-count.ts

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function main(): Promise<void> {
  const total = (await sql`SELECT COUNT(*)::int AS n FROM titles`) as Array<{ n: number }>;
  const withSynopsis = (await sql`
    SELECT COUNT(*)::int AS n FROM titles WHERE synopsis IS NOT NULL
  `) as Array<{ n: number }>;
  const withV4 = (await sql`SELECT COUNT(*)::int AS n FROM title_descriptors`) as Array<{
    n: number;
  }>;
  const withoutV4 = (await sql`
    SELECT COUNT(*)::int AS n FROM titles
    WHERE synopsis IS NOT NULL
      AND id NOT IN (SELECT title_id FROM title_descriptors)
  `) as Array<{ n: number }>;
  const top1000 = (await sql`
    SELECT COUNT(*)::int AS n FROM (
      SELECT id FROM titles
      WHERE synopsis IS NOT NULL
        AND id NOT IN (SELECT title_id FROM title_descriptors)
      ORDER BY popularity_score DESC NULLS LAST
      LIMIT 1000
    ) AS t
  `) as Array<{ n: number }>;
  const avgLen = (await sql`
    SELECT AVG(LENGTH(synopsis))::int AS n
    FROM titles WHERE synopsis IS NOT NULL
  `) as Array<{ n: number }>;

  console.log('=== Bulk V4 extraction sizing ===');
  console.log(`Total titles in catalog:                  ${total[0]?.n ?? 0}`);
  console.log(`Titles with synopsis (extractable):       ${withSynopsis[0]?.n ?? 0}`);
  console.log(`Titles already with V4 descriptors:       ${withV4[0]?.n ?? 0}`);
  console.log(`Titles without V4 yet (full bulk size):   ${withoutV4[0]?.n ?? 0}`);
  console.log(`Of those, top 1000 by popularity:         ${top1000[0]?.n ?? 0}`);
  console.log(`Avg synopsis length:                      ${avgLen[0]?.n ?? 0} chars`);

  const n = withoutV4[0]?.n ?? 0;
  console.log(`\n=== Cost projection (Sonnet 4.6) ===`);
  console.log(`Per-call: ~$0.017 (cached system prompt) to ~$0.022 (first calls)`);
  console.log(`Full bulk (${n} titles):   ~$${Math.round(n * 0.017)} – $${Math.round(n * 0.022)}`);
  console.log(
    `Top 1000 by popularity:     ~$${Math.round(1000 * 0.017)} – $${Math.round(1000 * 0.022)}`,
  );
  console.log(
    `Top 500 by popularity:      ~$${Math.round(500 * 0.017)} – $${Math.round(500 * 0.022)}`,
  );
  console.log(`\n=== Time projection ===`);
  console.log(`At 5 parallel × ~12s/call:  ~${Math.round((n * 12) / 5 / 60)} min for full bulk`);
  console.log(`                            ~${Math.round((1000 * 12) / 5 / 60)} min for top 1000`);
  console.log(`                            ~${Math.round((500 * 12) / 5 / 60)} min for top 500`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
