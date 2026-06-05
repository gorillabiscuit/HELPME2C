// Catalog broadening — Inngest-hosted equivalent of scripts/catalog-broaden.ts.
//
// Why Inngest instead of a local script: the broadening run takes 1–2 hours
// against TMDB's rate limits; running server-side means the machine can be
// closed without interrupting the job. Inngest's step checkpointing also means
// a transient TMDB 429 or Neon blip retries the failed step rather than
// restarting the whole run from scratch.
//
// Architecture:
//   catalogBroadenAll  — manual trigger only (no cron). Builds the 21-slice
//     list (1 global + 10 languages × 2 media types) and fans out one
//     catalog/broaden.slice event per slice.
//   catalogBroadenSlice — worker. Fetches page 1 to discover total_pages,
//     then paginates to exhaustion in batches of PAGES_PER_STEP, one
//     step.run per batch. No business page cap — TMDB's total_pages is the
//     natural limit.
//
// Step budget (free tier: 1k/day):
//   Global films slice: ~250 pages / 5 per step = ~50 steps.
//   20 language slices × ~50 pages avg / 5 = ~10 steps each = ~200 steps.
//   Fan-out overhead: ~21 steps.
//   Total: ~270 steps — well inside the free tier for a one-off run.
//
// TMDB rate limits: TMDB allows ~50 req/s. Each title is 2 requests
// (detail + providers). With SLICE_CONCURRENCY=3 parallel slice workers
// and TITLE_CONCURRENCY=5 concurrent titles per page, peak load is
// 3 × 5 × 2 = 30 req/s — comfortably under the cap.

import { inngest, catalogBroadenAllEvent, catalogBroadenSliceEvent } from '../client';
import { fetchTmdbDiscoverPage, processTmdbMovie, processTmdbTvShow } from './tmdb-sync';

// How many TMDB discover pages to process inside a single step.run.
// 5 pages × 20 titles × 2 TMDB req/title = 200 TMDB requests per step.
// At TITLE_CONCURRENCY=5 (~10 req/s peak) that takes ~20s — well inside
// Vercel's 300s function timeout even with DB write overhead.
const PAGES_PER_STEP = 5;

// Concurrent title fetches within a single page batch. Matches the
// existing catalog-broaden.ts script value.
const TITLE_CONCURRENCY = 5;

// Max parallel slice workers. 3 × TITLE_CONCURRENCY × 2 req/title = 30 req/s
// peak across all slices combined — stays under TMDB's 50 req/s limit.
const SLICE_CONCURRENCY = 3;

// Guard against TMDB returning unexpectedly large page counts (e.g. if
// a future API change inflates total_pages). Not a business cap — genuine
// content is expected to be well under this for any single slice.
const MAX_PAGES_SAFETY_CAP = 1_000;

const LANGUAGES = ['ko', 'ja', 'fr', 'de', 'es', 'it', 'zh', 'pt', 'hi', 'ar'] as const;

interface SliceSpec {
  label: string;
  mediaType: 'tv' | 'movie';
  params: Record<string, string>;
}

function buildSlices(): SliceSpec[] {
  const slices: SliceSpec[] = [{ label: 'films global', mediaType: 'movie', params: {} }];
  for (const lang of LANGUAGES) {
    slices.push({
      label: `films ${lang}`,
      mediaType: 'movie',
      params: { with_original_language: lang },
    });
    slices.push({ label: `tv ${lang}`, mediaType: 'tv', params: { with_original_language: lang } });
  }
  return slices;
}

async function processTitlesWithConcurrency(
  ids: number[],
  mediaType: 'tv' | 'movie',
): Promise<{ ok: number; failed: number; errors: string[] }> {
  let ok = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < ids.length; i += TITLE_CONCURRENCY) {
    const window = ids.slice(i, i + TITLE_CONCURRENCY);
    const results = await Promise.allSettled(
      window.map((id) => (mediaType === 'movie' ? processTmdbMovie(id) : processTmdbTvShow(id))),
    );
    for (const r of results) {
      if (r.status === 'fulfilled') {
        ok += 1;
      } else {
        failed += 1;
        errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
      }
    }
  }
  return { ok, failed, errors };
}

// Worker: processes one TMDB discover slice to exhaustion.
// Fetches page 1 to discover total_pages, then loops the remaining pages
// in batches of PAGES_PER_STEP — one step.run per batch so Inngest can
// checkpoint progress and retry individual batches on transient failures.
export const catalogBroadenSlice = inngest.createFunction(
  {
    id: 'catalog-broaden-slice',
    name: 'Catalog: broaden one TMDB slice',
    retries: 3,
    concurrency: { limit: SLICE_CONCURRENCY },
    triggers: [catalogBroadenSliceEvent],
  },
  async ({ event, step }) => {
    const { label, mediaType, params } = event.data;

    // Fetch page 1 to learn total_pages. Also processes page 1 titles so we
    // don't waste the response.
    const page1Result = await step.run('fetch-page-1', async () => {
      const page = await fetchTmdbDiscoverPage(mediaType, 1, params);
      const ids = page.results.map((r) => r.id);
      const { ok, failed, errors } = await processTitlesWithConcurrency(ids, mediaType);
      return { totalPages: Math.min(page.total_pages, MAX_PAGES_SAFETY_CAP), ok, failed, errors };
    });

    let totalOk = page1Result.ok;
    let totalFailed = page1Result.failed;

    // Remaining pages in PAGES_PER_STEP batches. Step names must be
    // deterministic (Inngest uses them for memoisation on re-execution).
    for (let start = 2; start <= page1Result.totalPages; start += PAGES_PER_STEP) {
      const end = Math.min(start + PAGES_PER_STEP - 1, page1Result.totalPages);

      const batchResult = await step.run(`pages-${start}-${end}`, async () => {
        let batchOk = 0;
        let batchFailed = 0;
        const batchErrors: string[] = [];

        for (let page = start; page <= end; page++) {
          let discoverPage;
          try {
            discoverPage = await fetchTmdbDiscoverPage(mediaType, page, params);
          } catch (e) {
            batchErrors.push(
              `page ${page} discover failed: ${e instanceof Error ? e.message : String(e)}`,
            );
            continue;
          }

          if (discoverPage.results.length === 0) break;

          const ids = discoverPage.results.map((r) => r.id);
          const { ok, failed, errors } = await processTitlesWithConcurrency(ids, mediaType);
          batchOk += ok;
          batchFailed += failed;
          batchErrors.push(...errors);
        }

        return { ok: batchOk, failed: batchFailed, errors: batchErrors };
      });

      totalOk += batchResult.ok;
      totalFailed += batchResult.failed;
    }

    return {
      label,
      totalPages: page1Result.totalPages,
      totalOk,
      totalFailed,
    };
  },
);

// Orchestrator: builds the full slice list and fans out one
// catalog/broaden.slice event per slice. Manual trigger only — no cron.
// Trigger via the Inngest dashboard or `inngest send catalog/broaden.all`.
export const catalogBroadenAll = inngest.createFunction(
  {
    id: 'catalog-broaden-all',
    name: 'Catalog: broaden all TMDB slices (fan-out)',
    retries: 1,
    triggers: [catalogBroadenAllEvent],
  },
  async ({ step }) => {
    const slices = buildSlices();

    await step.sendEvent(
      'fan-out-slices',
      slices.map((s) => catalogBroadenSliceEvent.create(s)),
    );

    return {
      fanned: slices.length,
      slices: slices.map((s) => s.label),
    };
  },
);
