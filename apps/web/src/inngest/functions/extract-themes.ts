import Anthropic from '@anthropic-ai/sdk';
import { neon } from '@neondatabase/serverless';
import { extractThemesAllEvent, extractThemesBatchEvent, inngest } from '../client';
import { processCandidate, type CandidateTitle } from '@/server/themes/extract';

// Inner step batch — how many titles one step.run processes. Tuned per
// docs/runbooks/inngest.md §step-run-budget. Sequential extraction at
// ~3s/call → 30 titles/step ≈ 90s, well under Vercel's 300s timeout.
const INNER_STEP_BATCH = 30;

// Outer batch size for the fan-out — how many titles one .batch event
// covers. ~60 titles per event keeps fan-out volume manageable: a
// 5800-title full-catalog backfill fans out ~97 batch events. Each
// event maps to one Inngest function invocation with 2 inner step.runs
// (60 / INNER_STEP_BATCH). Combined step budget for a bulk backfill:
// ~194 step.runs — fits inside the 1k/day free tier comfortably with
// the existing tmdb-sync / anilist-sync / recommend usage (~600/day).
const FAN_OUT_BATCH_SIZE = 60;

// Hard cap on the fan-out — protects against an unbounded events flood
// if the catalog grows by orders of magnitude. 200 batches × 60 titles
// = 12k titles per fan-out run. If the catalog gets bigger than that,
// re-run after the first pass (the NOT EXISTS check filters out
// already-extracted titles).
const MAX_BATCHES_PER_FAN_OUT = 200;

interface CandidateRow {
  id: string;
  title: string;
  media_type: 'tv' | 'film' | 'anime';
  synopsis: string | null;
  release_year: number | null;
}

function rowToCandidate(r: CandidateRow): CandidateTitle {
  return {
    id: r.id,
    title: r.title,
    mediaType: r.media_type,
    synopsis: r.synopsis,
    releaseYear: r.release_year,
  };
}

// Processes a fixed set of title IDs end-to-end: load → extract → persist.
// One Inngest invocation = one batch (~60 titles). concurrency: 1 caps
// total parallel batch invocations to one across the org, which keeps
// Anthropic input-TPM under the Tier 1 50K/min cap (sequential ~30 req/
// min at ~1.7k tokens each ≈ 51K/min worst-case, with prompt caching
// pulling the steady-state much lower).
//
// Per-title errors are caught inside processCandidate so one bad title
// doesn't abort the batch. Step-level retries (Inngest retries: 3) catch
// transient Anthropic / Neon failures at the step granularity.
export const extractThemesBatch = inngest.createFunction(
  {
    id: 'extract-themes-batch',
    name: 'Themes: extract for a batch of title IDs',
    retries: 3,
    concurrency: { limit: 1 },
    triggers: [extractThemesBatchEvent],
  },
  async ({ event, step }) => {
    const titleIds = event.data.titleIds;
    if (!Array.isArray(titleIds) || titleIds.length === 0) {
      return { processed: 0, empty: 0, failed: 0, skipped: 'no title IDs' };
    }

    const sql = neon(process.env.DATABASE_URL!);
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    let processed = 0;
    let empty = 0;
    let failed = 0;
    // Track FK-resolution health for the comparable_titles graph. Per
    // ADR-0027 §what-would-change-our-mind, sustained low resolution
    // (<40%) is a signal to pull forward Phase 2 embedding work.
    let comparablesResolved = 0;
    let comparablesTotal = 0;
    const errors: Array<{ id: string; message: string }> = [];

    for (let i = 0; i < titleIds.length; i += INNER_STEP_BATCH) {
      const chunkIds = titleIds.slice(i, i + INNER_STEP_BATCH);
      const result = await step.run(`extract-${i}-${i + chunkIds.length}`, async () => {
        const rows = (await sql`
          SELECT id, title, media_type, synopsis, release_year
          FROM titles
          WHERE id = ANY(${chunkIds}::uuid[]) AND synopsis IS NOT NULL
        `) as CandidateRow[];

        let chunkOk = 0;
        let chunkEmpty = 0;
        let chunkFail = 0;
        let chunkResolved = 0;
        let chunkTotal = 0;
        const chunkErrors: Array<{ id: string; message: string }> = [];

        for (const row of rows) {
          const candidate = rowToCandidate(row);
          const r = await processCandidate(candidate, anthropic, sql);
          chunkResolved += r.resolvedComparables;
          chunkTotal += r.totalComparables;
          if (r.ok) chunkOk += 1;
          else if (r.empty) chunkEmpty += 1;
          else {
            chunkFail += 1;
            if (r.error) chunkErrors.push({ id: candidate.id, message: r.error });
          }
        }
        return {
          ok: chunkOk,
          empty: chunkEmpty,
          failed: chunkFail,
          resolved: chunkResolved,
          total: chunkTotal,
          errors: chunkErrors,
        };
      });
      processed += result.ok;
      empty += result.empty;
      failed += result.failed;
      comparablesResolved += result.resolved;
      comparablesTotal += result.total;
      errors.push(...result.errors);
    }

    const comparableResolutionRate =
      comparablesTotal > 0 ? comparablesResolved / comparablesTotal : null;

    return {
      processed,
      empty,
      failed,
      comparables: {
        resolved: comparablesResolved,
        total: comparablesTotal,
        resolutionRate: comparableResolutionRate,
      },
      errors,
    };
  },
);

// Fan-out: load the candidate set from the catalog (titles with
// synopsis and no existing extraction, unless force=true), chunk into
// FAN_OUT_BATCH_SIZE-sized batches, and emit one batch event per chunk.
// Manual trigger only (no cron) — bulk re-extractions are deliberate
// editorial decisions, not background work.
export const extractThemesAll = inngest.createFunction(
  {
    id: 'extract-themes-all',
    name: 'Themes: extract for all candidates (fan-out)',
    retries: 1,
    triggers: [extractThemesAllEvent],
  },
  async ({ event, step }) => {
    const force = event.data.force === true;
    const mediaType = event.data.mediaType ?? null;
    const requestedLimit = event.data.limit;
    const limit =
      typeof requestedLimit === 'number' && requestedLimit > 0
        ? requestedLimit
        : MAX_BATCHES_PER_FAN_OUT * FAN_OUT_BATCH_SIZE;

    const candidates = await step.run('load-candidate-ids', async () => {
      const sql = neon(process.env.DATABASE_URL!);
      // Four branches × tagged-template = one safe parameterised query
      // per case. ORDER BY popularity_score DESC NULLS LAST means the
      // most-impactful titles get extracted first if the fan-out is
      // truncated by MAX_BATCHES_PER_FAN_OUT.
      let rows: Array<{ id: string }>;
      if (force && mediaType) {
        rows = (await sql`
          SELECT id FROM titles
          WHERE synopsis IS NOT NULL AND media_type = ${mediaType}
          ORDER BY popularity_score DESC NULLS LAST
          LIMIT ${limit}
        `) as Array<{ id: string }>;
      } else if (force) {
        rows = (await sql`
          SELECT id FROM titles
          WHERE synopsis IS NOT NULL
          ORDER BY popularity_score DESC NULLS LAST
          LIMIT ${limit}
        `) as Array<{ id: string }>;
      } else if (mediaType) {
        rows = (await sql`
          SELECT id FROM titles t
          WHERE synopsis IS NOT NULL AND media_type = ${mediaType}
            AND NOT EXISTS (SELECT 1 FROM title_themes tt WHERE tt.title_id = t.id)
          ORDER BY popularity_score DESC NULLS LAST
          LIMIT ${limit}
        `) as Array<{ id: string }>;
      } else {
        rows = (await sql`
          SELECT id FROM titles t
          WHERE synopsis IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM title_themes tt WHERE tt.title_id = t.id)
          ORDER BY popularity_score DESC NULLS LAST
          LIMIT ${limit}
        `) as Array<{ id: string }>;
      }
      return rows.map((r) => r.id);
    });

    if (candidates.length === 0) {
      return { fanned: 0, totalCandidates: 0, force, mediaType };
    }

    // Chunk + emit. Capping at MAX_BATCHES_PER_FAN_OUT protects against
    // an unbounded fan-out if someone removes the LIMIT carelessly.
    const batches: string[][] = [];
    for (let i = 0; i < candidates.length; i += FAN_OUT_BATCH_SIZE) {
      batches.push(candidates.slice(i, i + FAN_OUT_BATCH_SIZE));
      if (batches.length >= MAX_BATCHES_PER_FAN_OUT) break;
    }

    await step.sendEvent(
      'fan-out-batches',
      batches.map((titleIds) => extractThemesBatchEvent.create({ titleIds })),
    );

    return {
      fanned: batches.length,
      totalCandidates: candidates.length,
      titlesQueued: batches.reduce((acc, b) => acc + b.length, 0),
      force,
      mediaType,
    };
  },
);
