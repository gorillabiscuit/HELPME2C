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
//   Quality pass (22 slices): global 2 + 10 langs × 2 media = 22 slices.
//   Completeness pass (22 slices): same shape, vote_count.desc with high floor.
//   Total: 44 slices fanned out.
//   Quality global films: ~250 pages / 5 per step = ~50 steps.
//   Quality language slices: ~50 pages avg / 5 = ~10 steps × 20 = ~200 steps.
//   Completeness global: vote_count.desc is dense at the top; ~20–30 pages
//     above the 50k/100k threshold, so ~6 steps × 2 global slices = ~12 steps.
//   Completeness language: ~10 pages avg / 5 = ~2 steps × 20 = ~40 steps.
//   Fan-out overhead: ~44 steps.
//   Total: ~350 steps — still well inside the 1k/day free tier for a one-off.
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

// Max parallel slice workers. With 44 total slices and SLICE_CONCURRENCY=3,
// at most 3 run at once: 3 × TITLE_CONCURRENCY × 2 req/title = 30 req/s peak
// — stays under TMDB's 50 req/s limit even with the expanded slice count.
const SLICE_CONCURRENCY = 3;

// Guard against TMDB returning unexpectedly large page counts (e.g. if
// a future API change inflates total_pages). Not a business cap — genuine
// content is expected to be well under this for any single slice.
const MAX_PAGES_SAFETY_CAP = 1_000;

// Two-pass catalog strategy:
//
// Pass 1 — QUALITY: sort by vote_average.desc, floor at 200 votes. Surfaces
//   critically acclaimed titles across all time periods. Stable ranking that
//   doesn't decay. Catches The Wire, Fleabag, Parasite.
//
// Pass 2 — COMPLETENESS: sort by vote_count.desc, floor at 50k (TV) or 100k
//   (film). Captures the cultural canon — shows and films that millions of
//   people have actually watched and rated. vote_count is cumulative and never
//   decays, so Modern Family (100k+ votes), Friends (200k+), etc. always rank
//   near the top regardless of when they aired. These are the shows users
//   pick during onboarding that must be in the catalog.
//
// The passes are complementary: quality catches acclaimed-but-niche titles
// the completeness pass would miss (too few voters despite critical praise);
// completeness catches popular-but-not-top-rated titles the quality pass
// would deprioritize. Together they cover both "what critics love" and
// "what everyone has seen."
const QUALITY_SORT = 'vote_average.desc';
const QUALITY_MIN_VOTES = '200';

// Completeness thresholds calibrated against TMDB data:
//   TV 50k+ votes ≈ top ~3,000-5,000 shows globally (Modern Family: ~100k)
//   Film 100k+ votes ≈ top ~3,000-4,000 films globally
// These are high enough to exclude noise while capturing everything a user
// is likely to recognise from a decade of watching TV and film.
const COMPLETENESS_SORT = 'vote_count.desc';
const COMPLETENESS_MIN_VOTES_TV = '50000';
const COMPLETENESS_MIN_VOTES_FILM = '100000';

const LANGUAGES = ['ko', 'ja', 'fr', 'de', 'es', 'it', 'zh', 'pt', 'hi', 'ar'] as const;

interface SliceSpec {
  label: string;
  mediaType: 'tv' | 'movie';
  params: Record<string, string>;
}

// Quality base params: vote_average.desc, 200+ votes.
const QUALITY_BASE: Record<string, string> = {
  sort_by: QUALITY_SORT,
  'vote_count.gte': QUALITY_MIN_VOTES,
};

// Completeness base params per media type.
const COMPLETENESS_TV: Record<string, string> = {
  sort_by: COMPLETENESS_SORT,
  'vote_count.gte': COMPLETENESS_MIN_VOTES_TV,
};
const COMPLETENESS_FILM: Record<string, string> = {
  sort_by: COMPLETENESS_SORT,
  'vote_count.gte': COMPLETENESS_MIN_VOTES_FILM,
};

function buildSlices(): SliceSpec[] {
  const slices: SliceSpec[] = [];

  // --- Pass 1: Quality slices (vote_average.desc) ---
  slices.push({ label: 'quality:films global', mediaType: 'movie', params: { ...QUALITY_BASE } });
  slices.push({ label: 'quality:tv global', mediaType: 'tv', params: { ...QUALITY_BASE } });
  for (const lang of LANGUAGES) {
    slices.push({
      label: `quality:films ${lang}`,
      mediaType: 'movie',
      params: { ...QUALITY_BASE, with_original_language: lang },
    });
    slices.push({
      label: `quality:tv ${lang}`,
      mediaType: 'tv',
      params: { ...QUALITY_BASE, with_original_language: lang },
    });
  }

  // --- Pass 2: Completeness slices (vote_count.desc) ---
  // Global completeness — captures the universal cultural canon regardless of
  // language. Modern Family, Friends, The Simpsons, Breaking Bad, etc.
  slices.push({
    label: 'completeness:films global',
    mediaType: 'movie',
    params: { ...COMPLETENESS_FILM },
  });
  slices.push({
    label: 'completeness:tv global',
    mediaType: 'tv',
    params: { ...COMPLETENESS_TV },
  });
  // Language-specific completeness — captures the canon within each language
  // community (Korean dramas everyone has seen, French cinema classics, etc.).
  // Uses the same vote_count thresholds since the cross-language canon is
  // already covered by the global slice.
  for (const lang of LANGUAGES) {
    slices.push({
      label: `completeness:films ${lang}`,
      mediaType: 'movie',
      params: { ...COMPLETENESS_FILM, with_original_language: lang },
    });
    slices.push({
      label: `completeness:tv ${lang}`,
      mediaType: 'tv',
      params: { ...COMPLETENESS_TV, with_original_language: lang },
    });
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
