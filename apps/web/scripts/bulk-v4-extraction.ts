// Bulk V4 extraction over a popularity-ranked subset of the catalog.
//
// Default scope: top 500 titles by popularity_score that don't yet have
// V4 descriptors. Override via LIMIT env var.
//
// Concurrency: 3 parallel — keeps under Anthropic Sonnet's per-minute
// rate caps (3 × ~3k tokens/call × 5 calls/min ≈ 45k tok/min, under the
// 80k input / 32k output Tier 2 limits even without prompt caching).
//
// Resume safety: skips titles that already have V4 descriptors. Re-running
// after a crash continues where it left off.
//
// Cost: ~$0.017–$0.022 per title at Sonnet 4.6 rates. Top 500 ≈ $9–11.
// Wall time: ~20 min at 3-parallel.
//
// Run: pnpm dlx tsx --env-file=.env.local scripts/bulk-v4-extraction.ts
// Override scope: LIMIT=1000 pnpm dlx tsx … scripts/bulk-v4-extraction.ts

import Anthropic from '@anthropic-ai/sdk';
import { neon } from '@neondatabase/serverless';
import { appendFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { processCandidate, type CandidateTitle } from '../src/server/themes/extract';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LIMIT = parseInt(process.env.LIMIT ?? '500', 10);
const CONCURRENCY = 3;

const sql = neon(process.env.DATABASE_URL!);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const logPath = join(__dirname, `bulk-v4-${Date.now()}.log`);
writeFileSync(logPath, '');

function log(line: string): void {
  console.log(line);
  appendFileSync(logPath, line + '\n');
}

interface TitleRow {
  id: string;
  title: string;
  media_type: 'tv' | 'film' | 'anime';
  synopsis: string | null;
  release_year: number | null;
}

function rowToCandidate(r: TitleRow): CandidateTitle {
  return {
    id: r.id,
    title: r.title,
    mediaType: r.media_type,
    synopsis: r.synopsis,
    releaseYear: r.release_year,
  };
}

async function main(): Promise<void> {
  log(`Bulk V4 extraction`);
  log(`Scope: top ${LIMIT} by popularity, missing V4 descriptors`);
  log(`Concurrency: ${CONCURRENCY} parallel`);
  log(`Started ${new Date().toISOString()}`);
  log(`Log file: ${logPath}\n`);

  const candidates = (await sql`
    SELECT id, title, media_type, synopsis, release_year
    FROM titles
    WHERE synopsis IS NOT NULL
      AND id NOT IN (SELECT title_id FROM title_descriptors)
    ORDER BY popularity_score DESC NULLS LAST
    LIMIT ${LIMIT}
  `) as TitleRow[];

  log(`Loaded ${candidates.length} candidates\n`);

  let processed = 0;
  let okCount = 0;
  let emptyCount = 0;
  let failedCount = 0;
  let comparablesTotal = 0;
  let comparablesResolved = 0;
  const errors: Array<{ id: string; title: string; error: string }> = [];
  const tStart = Date.now();

  // Process in parallel batches of CONCURRENCY. Within a batch, items run
  // concurrently; batches run sequentially. Keeps a steady rate-limit
  // footprint without bursts.
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);
    const t0 = Date.now();
    const results = await Promise.all(
      batch.map((row) => processCandidate(rowToCandidate(row), anthropic, sql)),
    );
    const batchSec = ((Date.now() - t0) / 1000).toFixed(1);

    for (let j = 0; j < results.length; j += 1) {
      const r = results[j]!;
      const row = batch[j]!;
      processed += 1;
      comparablesTotal += r.totalComparables;
      comparablesResolved += r.resolvedComparables;
      if (r.ok) okCount += 1;
      else if (r.empty) emptyCount += 1;
      else {
        failedCount += 1;
        errors.push({
          id: row.id,
          title: row.title,
          error: r.error ?? 'unknown',
        });
      }
    }

    // Progress checkpoint every batch — gives a tail-able log.
    const elapsedMin = ((Date.now() - tStart) / 60000).toFixed(1);
    const rate = processed / ((Date.now() - tStart) / 60000);
    const eta = ((candidates.length - processed) / rate).toFixed(1);
    const resolutionPct =
      comparablesTotal > 0 ? Math.round((comparablesResolved / comparablesTotal) * 100) : 0;
    log(
      `[${processed}/${candidates.length}] batch=${batchSec}s  ok=${okCount}  empty=${emptyCount}  failed=${failedCount}  FK=${resolutionPct}%  elapsed=${elapsedMin}m  eta=${eta}m`,
    );
  }

  const totalMin = ((Date.now() - tStart) / 60000).toFixed(1);
  const resolutionPct =
    comparablesTotal > 0 ? Math.round((comparablesResolved / comparablesTotal) * 100) : 0;

  log(`\n${'='.repeat(70)}`);
  log(`SUMMARY`);
  log(`  total processed:     ${processed}`);
  log(`  ok:                  ${okCount}`);
  log(`  empty:               ${emptyCount}`);
  log(`  failed:              ${failedCount}`);
  log(`  comparables total:   ${comparablesTotal}`);
  log(`  comparables resolved: ${comparablesResolved} (${resolutionPct}%)`);
  log(`  wall time:           ${totalMin} min`);
  log(`${'='.repeat(70)}`);

  if (errors.length > 0) {
    log(`\nErrors (${errors.length}):`);
    for (const e of errors.slice(0, 20)) {
      log(`  ${e.id}  ${e.title}  →  ${e.error.slice(0, 200)}`);
    }
    if (errors.length > 20) log(`  … and ${errors.length - 20} more`);
  }
}

main().catch((e) => {
  console.error(e);
  appendFileSync(logPath, `\nFATAL: ${String(e)}\n`);
  process.exit(1);
});
