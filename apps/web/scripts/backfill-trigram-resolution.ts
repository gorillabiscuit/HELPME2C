// Re-resolve existing unresolved title_comparable_titles rows via the
// pg_trgm fallback added by migration 0020 + extract.ts changes.
//
// Pure DB work — no Anthropic calls. Iterates all rows with
// referenced_title_id IS NULL, tries the trigram match against
// titles.title, updates the row in place if a match is found above
// TRIGRAM_THRESHOLD.
//
// Idempotent: rows that don't find a trigram match stay NULL and can
// be re-tried later (e.g. after catalog broadening adds new titles).
//
// Run: pnpm dlx tsx --env-file=.env.local scripts/backfill-trigram-resolution.ts

import { neon } from '@neondatabase/serverless';
import { stripTrailingParens, TRIGRAM_THRESHOLD } from '../src/server/themes/extract';

const sql = neon(process.env.DATABASE_URL!);

interface UnresolvedRow {
  id: string;
  referenced_title: string;
}

async function main(): Promise<void> {
  const before = (await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(referenced_title_id)::int AS resolved
    FROM title_comparable_titles
  `) as Array<{ total: number; resolved: number }>;
  const totalBefore = before[0]?.total ?? 0;
  const resolvedBefore = before[0]?.resolved ?? 0;
  console.log(
    `Before: ${resolvedBefore} / ${totalBefore} resolved (${
      totalBefore > 0 ? Math.round((resolvedBefore / totalBefore) * 100) : 0
    }%)`,
  );

  const rows = (await sql`
    SELECT id, referenced_title
    FROM title_comparable_titles
    WHERE referenced_title_id IS NULL
    ORDER BY id ASC
  `) as UnresolvedRow[];

  console.log(`\nResolving ${rows.length} rows with TRIGRAM_THRESHOLD=${TRIGRAM_THRESHOLD}...\n`);

  let newlyResolved = 0;
  let processed = 0;
  const tStart = Date.now();

  for (const row of rows) {
    const raw = row.referenced_title.toLowerCase();
    const stripped = stripTrailingParens(row.referenced_title).toLowerCase();
    const probe = stripped !== raw ? stripped : raw;

    type FuzzyRow = { id: string; title: string; sim: number };
    const matches = (await sql`
      SELECT id, title, similarity(LOWER(title), ${probe}) AS sim
      FROM titles
      WHERE LOWER(title) % ${probe}
      ORDER BY sim DESC
      LIMIT 1
    `) as FuzzyRow[];

    const top = matches[0];
    if (top && top.sim >= TRIGRAM_THRESHOLD) {
      await sql`
        UPDATE title_comparable_titles
        SET referenced_title_id = ${top.id}
        WHERE id = ${row.id}
      `;
      newlyResolved += 1;
      // Log only the first few for sanity — full set is too much.
      if (newlyResolved <= 25) {
        console.log(
          `  [${newlyResolved}] "${row.referenced_title}" → "${top.title}" (sim=${top.sim.toFixed(3)})`,
        );
      }
    }
    processed += 1;
    if (processed % 100 === 0) {
      console.log(
        `  processed ${processed}/${rows.length}, ${newlyResolved} newly resolved so far`,
      );
    }
  }

  const after = (await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(referenced_title_id)::int AS resolved
    FROM title_comparable_titles
  `) as Array<{ total: number; resolved: number }>;
  const totalAfter = after[0]?.total ?? 0;
  const resolvedAfter = after[0]?.resolved ?? 0;

  const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(70)}`);
  console.log(`SUMMARY`);
  console.log(`  processed:       ${processed}`);
  console.log(`  newly resolved:  ${newlyResolved}`);
  console.log(
    `  before:          ${resolvedBefore} / ${totalBefore} (${
      totalBefore > 0 ? Math.round((resolvedBefore / totalBefore) * 100) : 0
    }%)`,
  );
  console.log(
    `  after:           ${resolvedAfter} / ${totalAfter} (${
      totalAfter > 0 ? Math.round((resolvedAfter / totalAfter) * 100) : 0
    }%)`,
  );
  console.log(`  wall time:       ${elapsed}s`);
  console.log(`${'='.repeat(70)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
