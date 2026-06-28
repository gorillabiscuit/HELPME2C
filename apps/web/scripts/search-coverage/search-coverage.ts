// Search-coverage harness.
//
// WHAT: runs a ~1000-title corpus through the REAL `titles.search` tRPC
// procedure and reports, per title, whether the search surfaces it — turning
// "onboarding felt like it couldn't find basic shows" into hard numbers.
//
// WHY a harness and not a unit test (yet): we don't know the baseline. This is
// the "coverage report first" step — measure, read the gaps, THEN decide whether
// to widen sync thresholds, fix matching/ranking, or repair the dead fallback.
//
// HOW IT STAYS HONEST:
//   - It calls the genuine procedure via appRouter.createCaller (not a re-impl
//     of the SQL), so it tests exactly what onboarding hits.
//   - The ~800 "popularity" titles are pulled from our own catalog by
//     popularity_score. Those definitionally exist, so that slice is a pure
//     MATCHING/RANKING test ("we have it — does search surface it?").
//   - The ~180 "recognition" titles come from an independent list
//     (recognition-corpus.ts), so a miss there can be a genuine COVERAGE gap.
//   - Catalog existence is snapshotted BEFORE each search, so when the live
//     ingest fallback backfills a title mid-search we can tell "rescued by
//     fallback" apart from "catalog already had it".
//
// RUN (against a disposable Neon branch so the ingest fallback's writes don't
// pollute the dev DB — set DATABASE_URL to the branch connection string):
//   cd apps/web
//   DATABASE_URL='<branch-uri>' pnpm dlx tsx --env-file=.env.local scripts/search-coverage/search-coverage.ts
// (the inline DATABASE_URL overrides the one in .env.local)

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';
import { titlesRouter } from '@/server/routers/titles';
import { db } from '@/server/db';
import { recognitionCorpus, type ExpectedType } from './recognition-corpus';

const SQL = neon(process.env.DATABASE_URL!);
// Use the titles router directly (not appRouter) to keep the tsx import graph
// small. protectedProcedure only checks userId is non-null; search uses only
// ctx.db, so a synthetic context is a faithful stand-in for a logged-in user.
const caller = titlesRouter.createCaller({ db, userId: 'coverage-harness' });

// How many popularity-ranked titles to pull from the catalog per medium.
const POP_TV = 300;
const POP_FILM = 350;
const POP_ANIME = 200;
const SEARCH_LIMIT = 16; // matches onboarding's picker (limit: 24) order of magnitude; 16 is the procedure default
const CONCURRENCY = 8;

interface CorpusItem {
  title: string;
  expectedType: ExpectedType;
  audience: string;
  origin: 'popularity' | 'recognition';
}

type Existence = 'exact' | 'partial' | 'none';
type Outcome =
  | 'covered'
  | 'rescued_by_fallback'
  | 'franchise_collapsed' // a parent/root title was returned instead of the queried season/part — dedupeByFranchise working as designed, not a bug
  | 'matching_bug'
  | 'coverage_gap';

interface Result {
  item: CorpusItem;
  existedBefore: Existence;
  resultCount: number;
  rank: number; // 0-based index of the matching result, -1 if not found
  found: boolean;
  outcome: Outcome;
  // The dead-fallback signature: a true coverage gap the live fallback should
  // have rescued but didn't, because ≥3 junk fuzzy matches kept resultCount
  // above the `< 3` ingest guard.
  fallbackSuppressed: boolean;
  topResult: string | null;
}

function norm(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normEq(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = norm(a);
  const nb = norm(b);
  return na.length > 0 && na === nb;
}

// Snapshot whether the catalog contains the title BEFORE we run search (so a
// fallback ingest during search doesn't masquerade as pre-existing coverage).
async function existenceInCatalog(title: string): Promise<Existence> {
  const like = `%${title.replace(/[%_\\]/g, (c) => '\\' + c)}%`;
  // neon's tagged template returns untyped rows; assert the shape we selected.
  const rows = (await SQL`
    SELECT title, original_title
    FROM titles
    WHERE title ILIKE ${like} OR original_title ILIKE ${like}
    LIMIT 20
  `) as { title: string; original_title: string | null }[];
  if (rows.some((r) => normEq(r.title, title) || normEq(r.original_title, title))) return 'exact';
  if (rows.length > 0) return 'partial';
  return 'none';
}

async function evaluate(item: CorpusItem): Promise<Result> {
  const existedBefore = await existenceInCatalog(item.title);
  const results = await caller.search({ q: item.title, limit: SEARCH_LIMIT });
  const q = norm(item.title);
  // A result counts as a hit if its title (or original title) equals the query
  // OR begins with the query at a word boundary — so "Demon Slayer" is found in
  // "Demon Slayer: Kimetsu no Yaiba" (the catalog's canonical name). The
  // word-boundary ' ' guards against "Cars" matching "Carson".
  const isHit = (r: { title: string; originalTitle: string | null }): boolean => {
    const t = norm(r.title);
    const o = norm(r.originalTitle);
    return t === q || o === q || t.startsWith(q + ' ') || (o.length > 0 && o.startsWith(q + ' '));
  };
  const rank = results.findIndex(isHit);
  const found = rank >= 0;
  // Franchise collapse: not a hit, but a returned title is an ANCESTOR of the
  // query (query starts with the result title), e.g. querying "Attack on Titan
  // Season 2" and getting "Attack on Titan". That's dedupeByFranchise working.
  const collapsed =
    !found &&
    results.some((r) => {
      const t = norm(r.title);
      return t.length > 0 && q.startsWith(t + ' ');
    });

  let outcome: Outcome;
  if (found && existedBefore !== 'none') outcome = 'covered';
  else if (found && existedBefore === 'none') outcome = 'rescued_by_fallback';
  else if (collapsed) outcome = 'franchise_collapsed';
  else if (existedBefore !== 'none') outcome = 'matching_bug';
  else outcome = 'coverage_gap';

  const fallbackSuppressed =
    outcome === 'coverage_gap' && results.length >= 3 && item.title.length >= 5;

  return {
    item,
    existedBefore,
    resultCount: results.length,
    rank,
    found,
    outcome,
    fallbackSuppressed,
    topResult: results[0]?.title ?? null,
  };
}

// Minimal async pool — no p-limit dep needed.
async function mapPool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker(): Promise<void> {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
  return out;
}

async function buildPopularityCorpus(): Promise<CorpusItem[]> {
  async function top(mediaType: ExpectedType, limit: number): Promise<CorpusItem[]> {
    const rows = (await SQL`
      SELECT title FROM titles
      WHERE media_type = ${mediaType} AND popularity_score IS NOT NULL
      ORDER BY popularity_score DESC NULLS LAST
      LIMIT ${limit}
    `) as { title: string }[];
    return rows.map((r) => ({
      title: r.title,
      expectedType: mediaType,
      audience: `popularity-${mediaType}`,
      origin: 'popularity' as const,
    }));
  }
  const [tv, film, anime] = await Promise.all([
    top('tv', POP_TV),
    top('film', POP_FILM),
    top('anime', POP_ANIME),
  ]);
  return [...tv, ...film, ...anime];
}

function pct(n: number, total: number): string {
  return total === 0 ? '0%' : `${((100 * n) / total).toFixed(1)}%`;
}

function summarise(label: string, results: Result[]): string {
  const total = results.length;
  const by = (o: Outcome) => results.filter((r) => r.outcome === o).length;
  const foundCount = results.filter((r) => r.found).length;
  const lines = [
    `### ${label} (n=${total})`,
    '',
    `- **Found in search:** ${foundCount} (${pct(foundCount, total)})`,
    `- covered (catalog had it, search surfaced it): ${by('covered')}`,
    `- rescued_by_fallback (ingested live mid-search): ${by('rescued_by_fallback')}`,
    `- franchise_collapsed (parent title returned for a season/part — not a bug): ${by('franchise_collapsed')}`,
    `- **matching_bug** (in catalog, search MISSED it): ${by('matching_bug')}`,
    `- **coverage_gap** (not in catalog at all): ${by('coverage_gap')}`,
    `- of which fallback_suppressed (dead-fallback bug): ${results.filter((r) => r.fallbackSuppressed).length}`,
    '',
  ];
  return lines.join('\n');
}

function listMisses(label: string, results: Result[]): string {
  // Real misses only — franchise_collapsed is expected behaviour, not a miss.
  const misses = results.filter(
    (r) => r.outcome === 'matching_bug' || r.outcome === 'coverage_gap',
  );
  if (misses.length === 0) return `### ${label} — no real misses 🎉\n`;
  const rows = misses
    .sort((a, b) => a.outcome.localeCompare(b.outcome) || a.item.title.localeCompare(b.item.title))
    .map(
      (r) =>
        `| ${r.item.title} | ${r.item.expectedType} | ${r.item.audience} | ${r.outcome} | ${r.resultCount} | ${r.topResult ?? '—'} |`,
    );
  return [
    `### ${label} — ${misses.length} misses`,
    '',
    '| Query | Expected | Audience | Outcome | #results | Top result returned |',
    '|---|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const dbHost = process.env.DATABASE_URL?.match(/@([^/]+)/)?.[1] ?? 'unknown';
  console.log(`[coverage] DB host: ${dbHost}`);
  if (!/coverage|test|branch|young-art|flat-waterfall/.test(dbHost)) {
    console.warn(
      '[coverage] WARNING: DATABASE_URL does not look like a disposable branch. ' +
        'The live ingest fallback WRITES to this DB. Ctrl-C now if this is the real dev/prod DB.',
    );
  }

  console.log('[coverage] building popularity corpus from catalog...');
  const popularity = await buildPopularityCorpus();
  const recognition: CorpusItem[] = recognitionCorpus.map((e) => ({ ...e, origin: 'recognition' }));
  // The search input caps `q` at 100 chars; a handful of catalog titles exceed
  // that and aren't realistic search queries. Drop them (logged, not silent).
  const raw = [...popularity, ...recognition];
  const corpus = raw.filter((c) => c.title.length <= 100);
  const dropped = raw.length - corpus.length;
  if (dropped > 0)
    console.log(`[coverage] dropped ${dropped} titles >100 chars (search input cap)`);
  console.log(
    `[coverage] corpus: ${popularity.length} popularity + ${recognition.length} recognition = ${corpus.length} titles`,
  );

  console.log(`[coverage] running searches (concurrency ${CONCURRENCY})...`);
  let done = 0;
  const results = await mapPool(corpus, CONCURRENCY, async (item) => {
    const r = await evaluate(item);
    done++;
    if (done % 100 === 0) console.log(`[coverage]   ${done}/${corpus.length}`);
    return r;
  });

  const popResults = results.filter((r) => r.item.origin === 'popularity');
  const recResults = results.filter((r) => r.item.origin === 'recognition');

  // Per-audience breakdown for the recognition half (where audiences matter).
  const audiences = [...new Set(recResults.map((r) => r.item.audience))].sort();
  const audienceSummary = audiences
    .map((a) => {
      const rs = recResults.filter((r) => r.item.audience === a);
      const found = rs.filter((r) => r.found).length;
      return `| ${a} | ${rs.length} | ${found} | ${pct(found, rs.length)} |`;
    })
    .join('\n');

  const report = [
    '# Search-coverage report',
    '',
    `DB host: \`${dbHost}\`  |  corpus: ${corpus.length} titles  |  search limit: ${SEARCH_LIMIT}`,
    '',
    '> Generated by `scripts/search-coverage/search-coverage.ts`. See that file for outcome definitions.',
    '',
    '## Summary',
    '',
    summarise('All', results),
    summarise('Popularity half (matching/ranking test)', popResults),
    summarise('Recognition half (coverage test)', recResults),
    '## Recognition coverage by audience',
    '',
    '| Audience | n | Found | Hit rate |',
    '|---|---|---|---|',
    audienceSummary,
    '',
    '## Misses',
    '',
    listMisses('Popularity half', popResults),
    listMisses('Recognition half', recResults),
  ].join('\n');

  const outPath = join(import.meta.dirname, 'coverage-report.md');
  writeFileSync(outPath, report);
  const jsonPath = join(import.meta.dirname, 'coverage-results.json');
  writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  // Console headline.
  const overallFound = results.filter((r) => r.found).length;
  console.log('\n========== HEADLINE ==========');
  console.log(
    `Overall found: ${overallFound}/${results.length} (${pct(overallFound, results.length)})`,
  );
  console.log(
    `Matching bugs (in catalog, missed): ${results.filter((r) => r.outcome === 'matching_bug').length}`,
  );
  console.log(
    `Coverage gaps (not in catalog):     ${results.filter((r) => r.outcome === 'coverage_gap').length}`,
  );
  console.log(
    `Fallback-suppressed (dead fallback): ${results.filter((r) => r.fallbackSuppressed).length}`,
  );
  console.log(`\nReport:  ${outPath}`);
  console.log(`Results: ${jsonPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
