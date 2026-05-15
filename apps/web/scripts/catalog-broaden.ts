// One-off catalog-broadening seed. Pulls the films TMDB has been
// withholding from us (we previously only synced TV) plus a deeper
// non-English slice of both films and TV so the discovery surface stops
// looking like a US-network catalogue. See diagnostic in
// scripts/catalog-stats.ts for the "why".
//
// Strategy:
//   1. Popular films globally — fills the worst gap (zero films today).
//   2. Per-language slices for films AND tv — Korean, Japanese live-
//      action, French, German, Spanish, Italian, Chinese, Portuguese,
//      Hindi, Arabic. Each gets ~25 pages by popularity, which adds
//      ~500 titles per language per medium.
//
// Run with: WIDEN_OK=yes pnpm dlx tsx --env-file=.env.local scripts/catalog-broaden.ts
//
// Guarded by WIDEN_OK so it doesn't run accidentally — each invocation
// makes ~20-25k TMDB requests (2 per title) and takes 10-20 minutes
// against TMDB's rate limit.

import {
  fetchTmdbDiscoverPage,
  processTmdbMovie,
  processTmdbTvShow,
} from '@/inngest/functions/tmdb-sync';

if (process.env.WIDEN_OK !== 'yes') {
  console.error('Refusing to run without WIDEN_OK=yes');
  console.error('  WIDEN_OK=yes pnpm dlx tsx --env-file=.env.local scripts/catalog-broaden.ts');
  process.exit(1);
}

// Languages to slice. Picked to fill the catalog-stats blind spots —
// Korean drama, French/German prestige, Spanish-language (Spain +
// LatAm), Italian, Chinese (CN+HK+TW), Portuguese (BR+PT), Hindi
// (Bollywood), Arabic. Japanese is included for live action; AniList
// already covers anime so the TMDB Japanese-live slice won't drown in
// dupes.
const LANGUAGES = ['ko', 'ja', 'fr', 'de', 'es', 'it', 'zh', 'pt', 'hi', 'ar'] as const;

// Pages per slice. 25 × 20 results = 500 titles per slice. With 10
// languages × 2 mediums + the global film pull that's ~10-12k titles.
const PAGES_PER_LANGUAGE = 25;
const PAGES_GLOBAL_FILMS = 100; // top 2000 films globally

// Concurrency floor — TMDB allows ~50 req/s; staying well under avoids
// 429s on shared infra. Each title is 2 requests (detail+providers), so
// 5 concurrent titles = ~10 req/s peak.
const CONCURRENCY = 5;

interface SliceSpec {
  readonly label: string;
  readonly mediaType: 'tv' | 'movie';
  readonly pages: number;
  readonly params: Record<string, string>;
}

function buildSlices(): SliceSpec[] {
  const slices: SliceSpec[] = [
    {
      label: 'films global',
      mediaType: 'movie',
      pages: PAGES_GLOBAL_FILMS,
      params: {},
    },
  ];
  for (const lang of LANGUAGES) {
    slices.push({
      label: `films ${lang}`,
      mediaType: 'movie',
      pages: PAGES_PER_LANGUAGE,
      params: { with_original_language: lang },
    });
    slices.push({
      label: `tv ${lang}`,
      mediaType: 'tv',
      pages: PAGES_PER_LANGUAGE,
      params: { with_original_language: lang },
    });
  }
  return slices;
}

async function processInBatches<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
): Promise<{ ok: number; failed: number; errors: string[] }> {
  let ok = 0;
  let failed = 0;
  const errors: string[] = [];
  // Simple windowed-promise pool — kicks off CONCURRENCY tasks, waits
  // for the slowest to finish, then refills. Good enough for a one-off
  // batch script; no need for p-limit / similar.
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const window = items.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(window.map(worker));
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

async function processSlice(slice: SliceSpec): Promise<void> {
  console.log(`\n=== ${slice.label} ===`);
  let totalOk = 0;
  let totalFailed = 0;
  for (let page = 1; page <= slice.pages; page++) {
    let discoverPage;
    try {
      discoverPage = await fetchTmdbDiscoverPage(slice.mediaType, page, slice.params);
    } catch (e) {
      console.error(`  page ${page} discover failed:`, e instanceof Error ? e.message : e);
      continue;
    }
    if (discoverPage.results.length === 0) {
      console.log(`  page ${page}: empty (no more results)`);
      break;
    }
    // Cap at total_pages reported by TMDB — some slices have <PAGES_PER_LANGUAGE pages.
    if (page > discoverPage.total_pages) break;

    const worker = async (item: { id: number }) => {
      if (slice.mediaType === 'movie') {
        await processTmdbMovie(item.id);
      } else {
        await processTmdbTvShow(item.id);
      }
    };
    const { ok, failed, errors } = await processInBatches(discoverPage.results, worker);
    totalOk += ok;
    totalFailed += failed;
    if (failed > 0) {
      console.log(`  page ${page}: ${ok} ok, ${failed} failed (e.g. ${errors[0] ?? ''})`);
    } else {
      process.stdout.write(`  page ${page}: ${ok} ok\n`);
    }
  }
  console.log(`  ${slice.label} done: ${totalOk} ok, ${totalFailed} failed`);
}

async function main() {
  const slices = buildSlices();
  console.log(
    `Catalog broadening — ${slices.length} slices, ~${slices.reduce((s, sl) => s + sl.pages * 20, 0)} candidate titles`,
  );
  const t0 = Date.now();
  for (const slice of slices) {
    await processSlice(slice);
  }
  const dt = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\nDone in ${dt}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
