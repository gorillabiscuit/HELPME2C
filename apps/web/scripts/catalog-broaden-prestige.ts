// Catalog-broadening seed for prestige TV. The Phase 1A catalog skews
// anime-heavy (per the AniList focus + catalog-broaden.ts's per-language
// slices, which were films-first and didn't bias toward TV-of-renown).
// Bulk V4 extraction surfaced ~26% of LLM-produced comparable strings
// failing FK resolution, with a meaningful fraction being prestige TV
// the LLM cites confidently (Breaking Bad, Game of Thrones, The Sopranos,
// The Wire, Mad Men, Fleabag, Succession, Rick and Morty, What We Do in
// the Shadows) that simply isn't in our titles table.
//
// This script pulls high-rated, well-voted TV shows from TMDB discover
// across English + a few other prestige-rich markets. dedup-by-tmdb-id
// happens naturally in processTmdbTvShow — re-syncs are idempotent.
//
// Strategy:
//   - English: 20 pages by popularity, with vote_average >= 7.5 AND
//     vote_count >= 500. Catches Breaking Bad / GoT / Wire / Sopranos
//     etc plus newer prestige stuff.
//   - Spanish: 5 pages (Money Heist, Narcos, etc).
//   - French + German + Korean: 5 pages each (Engrenages, Dark, Squid
//     Game, etc). Korean overlaps with the existing korean catalog-
//     broaden slice but the vote_count filter elevates the prestige
//     subset cleanly.
//
// Expected new titles: ~100-300 after dedup (most popular English TV
// is in catalog via the original sync; the missing ones are exactly the
// older prestige tier).
//
// Run: WIDEN_OK=yes pnpm dlx tsx --env-file=.env.local scripts/catalog-broaden-prestige.ts
//
// Cost: free (TMDB API). Time: ~5 minutes at 5-parallel against TMDB's
// rate cap.

import { fetchTmdbDiscoverPage, processTmdbTvShow } from '@/inngest/functions/tmdb-sync';

if (process.env.WIDEN_OK !== 'yes') {
  console.error('Refusing to run without WIDEN_OK=yes');
  console.error(
    '  WIDEN_OK=yes pnpm dlx tsx --env-file=.env.local scripts/catalog-broaden-prestige.ts',
  );
  process.exit(1);
}

const CONCURRENCY = 5;

interface SliceSpec {
  readonly label: string;
  readonly pages: number;
  readonly params: Record<string, string>;
}

const SLICES: ReadonlyArray<SliceSpec> = [
  {
    label: 'English prestige TV',
    pages: 20,
    params: {
      with_original_language: 'en',
      'vote_average.gte': '7.5',
      'vote_count.gte': '500',
      sort_by: 'popularity.desc',
    },
  },
  {
    label: 'Spanish prestige TV',
    pages: 5,
    params: {
      with_original_language: 'es',
      'vote_average.gte': '7.5',
      'vote_count.gte': '200',
      sort_by: 'popularity.desc',
    },
  },
  {
    label: 'French prestige TV',
    pages: 5,
    params: {
      with_original_language: 'fr',
      'vote_average.gte': '7.5',
      'vote_count.gte': '200',
      sort_by: 'popularity.desc',
    },
  },
  {
    label: 'German prestige TV',
    pages: 5,
    params: {
      with_original_language: 'de',
      'vote_average.gte': '7.5',
      'vote_count.gte': '200',
      sort_by: 'popularity.desc',
    },
  },
  {
    label: 'Korean prestige TV',
    pages: 5,
    params: {
      with_original_language: 'ko',
      'vote_average.gte': '7.5',
      'vote_count.gte': '200',
      sort_by: 'popularity.desc',
    },
  },
];

async function processInBatches<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
): Promise<{ ok: number; failed: number; errors: string[] }> {
  let ok = 0;
  let failed = 0;
  const errors: string[] = [];
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

async function processSlice(slice: SliceSpec): Promise<{ ok: number; failed: number }> {
  console.log(`\n=== ${slice.label} ===`);
  let totalOk = 0;
  let totalFailed = 0;
  for (let page = 1; page <= slice.pages; page++) {
    let discoverPage;
    try {
      discoverPage = await fetchTmdbDiscoverPage('tv', page, slice.params);
    } catch (e) {
      console.error(`  page ${page} discover failed:`, e instanceof Error ? e.message : e);
      continue;
    }
    if (discoverPage.results.length === 0) {
      console.log(`  page ${page}: empty (no more results)`);
      break;
    }
    if (page > discoverPage.total_pages) break;

    const worker = async (item: { id: number }) => {
      await processTmdbTvShow(item.id);
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
  return { ok: totalOk, failed: totalFailed };
}

async function main(): Promise<void> {
  console.log(
    `Prestige-TV broadening — ${SLICES.length} slices, ${SLICES.reduce(
      (s, sl) => s + sl.pages * 20,
      0,
    )} candidate titles`,
  );
  const t0 = Date.now();
  let totalOk = 0;
  let totalFailed = 0;
  for (const slice of SLICES) {
    const r = await processSlice(slice);
    totalOk += r.ok;
    totalFailed += r.failed;
  }
  const dt = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`\nDone in ${dt}s. Total processed: ${totalOk} ok, ${totalFailed} failed.`);
  console.log(
    `(Most will be dedup'd against existing rows. Run scripts/catalog-stats.ts for the new shape.)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
