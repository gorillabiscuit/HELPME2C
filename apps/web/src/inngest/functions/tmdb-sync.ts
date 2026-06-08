import { eq } from 'drizzle-orm';
import { cron } from 'inngest';
import { inngest, tmdbSyncTvPageEvent, tmdbSyncTvAllEvent } from '../client';
import { db } from '@/server/db';
import { titles, tags, titleTags, streamingAvailability } from '@/server/schema';

const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

function tmdbHeaders() {
  return {
    Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}`,
    accept: 'application/json',
  };
}

async function tmdbGet<T>(path: string): Promise<T> {
  const res = await fetch(`${TMDB_BASE}${path}`, { headers: tmdbHeaders() });
  if (!res.ok) throw new Error(`TMDB ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

interface TmdbDiscoverPage {
  results: { id: number }[];
  total_pages: number;
}

interface TmdbVideo {
  id: string;
  key: string; // YouTube video id when site === 'YouTube'
  site: string; // 'YouTube' | 'Vimeo' | ...
  type: string; // 'Trailer' | 'Teaser' | 'Clip' | ...
  official: boolean;
  published_at?: string;
}

interface TmdbVideosResponse {
  results: TmdbVideo[];
}

interface TmdbTvDetail {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  status: string;
  first_air_date: string;
  last_air_date: string;
  number_of_episodes: number;
  episode_run_time: number[];
  poster_path: string | null;
  backdrop_path: string | null;
  popularity: number;
  keywords: { results: { id: number; name: string }[] };
  videos?: TmdbVideosResponse;
}

// Movie detail differs from TV: `title`/`original_title` (not `name`),
// `release_date` (no `last_air_date`), `runtime` is a single int (not an
// array), and the keywords endpoint nests under `keywords` (same as TV).
interface TmdbMovieDetail {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  status: string;
  release_date: string;
  runtime: number | null;
  poster_path: string | null;
  backdrop_path: string | null;
  popularity: number;
  keywords: { keywords: { id: number; name: string }[] };
  videos?: TmdbVideosResponse;
}

// Pick a trailer (or fallback teaser) from a TMDB videos response.
// Preference order: official YouTube Trailer → unofficial YouTube
// Trailer → YouTube Teaser → null. TMDB returns videos roughly in
// release order; the type filter is the actual selector. Returns
// { provider, videoId } or null if nothing usable.
function pickTrailerFromTmdb(
  videos: TmdbVideosResponse | undefined,
): { provider: string; videoId: string } | null {
  if (!videos?.results || videos.results.length === 0) return null;
  const youTubeOnly = videos.results.filter((v) => v.site === 'YouTube' && v.key);
  if (youTubeOnly.length === 0) return null;
  const officialTrailer = youTubeOnly.find((v) => v.type === 'Trailer' && v.official);
  const anyTrailer = youTubeOnly.find((v) => v.type === 'Trailer');
  const teaser = youTubeOnly.find((v) => v.type === 'Teaser');
  const chosen = officialTrailer ?? anyTrailer ?? teaser;
  if (!chosen) return null;
  return { provider: 'youtube', videoId: chosen.key };
}

interface TmdbWatchProviders {
  results: Record<
    string,
    {
      flatrate?: { provider_id: number; provider_name: string; logo_path: string }[];
      rent?: { provider_id: number; provider_name: string; logo_path: string }[];
      buy?: { provider_id: number; provider_name: string; logo_path: string }[];
      free?: { provider_id: number; provider_name: string; logo_path: string }[];
      link?: string;
    }
  >;
}

function tmdbStatusToEnum(
  status: string,
): 'ongoing' | 'completed' | 'cancelled' | 'upcoming' | null {
  const map: Record<string, 'ongoing' | 'completed' | 'cancelled' | 'upcoming'> = {
    'Returning Series': 'ongoing',
    'In Production': 'ongoing',
    Ended: 'completed',
    Canceled: 'cancelled',
    Cancelled: 'cancelled',
    Planned: 'upcoming',
    Released: 'completed',
    'Post Production': 'upcoming',
    'Pre-production': 'upcoming',
  };
  return map[status] ?? null;
}

async function upsertTmdbKeywords(
  keywords: { id: number; name: string }[],
): Promise<Map<number, string>> {
  const tagIdMap = new Map<number, string>();
  for (const kw of keywords) {
    // Single-statement upsert: ON CONFLICT DO UPDATE always returns the row,
    // including for the loser of a concurrent insert race. The earlier
    // find-then-insert pattern lost title→tag joins under concurrency because
    // ON CONFLICT DO NOTHING returns no row to whichever inserter lost.
    // The `set` is a self-update on `name` — Drizzle requires a non-empty set
    // and tags has no updated_at column, so updating name to its own value
    // is the minimal write that still triggers RETURNING.
    const [row] = await db
      .insert(tags)
      .values({ name: kw.name, source: 'tmdb' })
      .onConflictDoUpdate({
        target: tags.name,
        set: { name: kw.name },
      })
      .returning({ id: tags.id });
    if (row) tagIdMap.set(kw.id, row.id);
  }
  return tagIdMap;
}

async function upsertStreamingProviders(
  titleId: string,
  providers: TmdbWatchProviders,
): Promise<void> {
  await db.delete(streamingAvailability).where(eq(streamingAvailability.titleId, titleId));

  const rows: (typeof streamingAvailability.$inferInsert)[] = [];
  for (const [countryCode, countryData] of Object.entries(providers.results)) {
    const countryLink = countryData.link ?? null;
    const providerTypes = [
      { key: 'flatrate', type: 'streaming' as const },
      { key: 'rent', type: 'rent' as const },
      { key: 'buy', type: 'buy' as const },
      { key: 'free', type: 'free' as const },
    ] as const;
    for (const { key, type } of providerTypes) {
      for (const p of countryData[key] ?? []) {
        rows.push({
          titleId,
          providerId: String(p.provider_id),
          providerName: p.provider_name,
          providerLogoUrl: p.logo_path ? `${TMDB_IMAGE_BASE}${p.logo_path}` : null,
          countryCode,
          type,
          sourceUrl: countryLink,
        });
      }
    }
  }
  if (rows.length > 0) await db.insert(streamingAvailability).values(rows);
}

// Fetches and upserts a single TMDB TV show — title row, keyword tags, tag joins,
// and streaming availability. Pure async function (no Inngest wrapping) so it can
// be invoked directly for backfills, ad-hoc tests, or future admin tooling.
// Returns the upserted title's UUID, or null if the upsert produced no row.
export async function processTmdbTvShow(showId: number): Promise<string | null> {
  // append_to_response keeps the videos fetch in the same HTTP call as
  // the main detail — no extra TMDB request per title.
  const [detail, providers] = await Promise.all([
    tmdbGet<TmdbTvDetail>(`/tv/${showId}?append_to_response=keywords,videos&language=en-US`),
    tmdbGet<TmdbWatchProviders>(`/tv/${showId}/watch/providers`),
  ]);
  const trailer = pickTrailerFromTmdb(detail.videos);

  const [upserted] = await db
    .insert(titles)
    .values({
      externalId: String(detail.id),
      source: 'tmdb',
      mediaType: 'tv',
      title: detail.name,
      originalTitle: detail.original_name !== detail.name ? detail.original_name : null,
      synopsis: detail.overview || null,
      status: tmdbStatusToEnum(detail.status),
      releaseYear: detail.first_air_date ? parseInt(detail.first_air_date.slice(0, 4)) : null,
      endYear:
        detail.last_air_date && detail.status === 'Ended'
          ? parseInt(detail.last_air_date.slice(0, 4))
          : null,
      episodeCount: detail.number_of_episodes || null,
      episodeDurationMinutes: detail.episode_run_time[0] ?? null,
      posterUrl: detail.poster_path ? `${TMDB_IMAGE_BASE}${detail.poster_path}` : null,
      backdropUrl: detail.backdrop_path ? `${TMDB_IMAGE_BASE}${detail.backdrop_path}` : null,
      popularityScore: detail.popularity,
      trailerProvider: trailer?.provider ?? null,
      trailerVideoId: trailer?.videoId ?? null,
    })
    .onConflictDoUpdate({
      target: [titles.externalId, titles.source, titles.mediaType],
      set: {
        title: detail.name,
        synopsis: detail.overview || null,
        status: tmdbStatusToEnum(detail.status),
        episodeCount: detail.number_of_episodes || null,
        popularityScore: detail.popularity,
        trailerProvider: trailer?.provider ?? null,
        trailerVideoId: trailer?.videoId ?? null,
        updatedAt: new Date(),
      },
    })
    .returning({ id: titles.id });

  if (!upserted) return null;

  const keywords = detail.keywords?.results ?? [];
  const tagIdMap = await upsertTmdbKeywords(keywords);

  const tagRows = keywords
    .map((kw) => ({ titleId: upserted.id, tagId: tagIdMap.get(kw.id) }))
    .filter((r): r is { titleId: string; tagId: string } => r.tagId !== undefined)
    .map((r) => ({ ...r, weight: 100, isSpoiler: false }));

  if (tagRows.length > 0) {
    await db.insert(titleTags).values(tagRows).onConflictDoNothing();
  }

  await upsertStreamingProviders(upserted.id, providers);
  return upserted.id;
}

// Fetches one page of popular TV shows from TMDB Discover.
export async function fetchTmdbTvDiscoverPage(page: number): Promise<TmdbDiscoverPage> {
  return tmdbGet<TmdbDiscoverPage>(
    `/discover/tv?sort_by=popularity.desc&page=${page}&language=en-US`,
  );
}

// Generic discover-page fetcher for the catalog-broadening script.
// `mediaType` selects /discover/tv vs /discover/movie. `params` is a flat
// record of additional TMDB query params (e.g. `with_original_language=ko`
// or `with_origin_country=JP`). Returns the standard discover shape.
//
// Kept generic — language slicing and origin-country slicing both use
// the same param interface and the same page-pagination model.
export async function fetchTmdbDiscoverPage(
  mediaType: 'tv' | 'movie',
  page: number,
  params: Record<string, string> = {},
): Promise<TmdbDiscoverPage> {
  const merged = new URLSearchParams({
    sort_by: 'popularity.desc',
    page: String(page),
    language: 'en-US',
    ...params,
  });
  return tmdbGet<TmdbDiscoverPage>(`/discover/${mediaType}?${merged.toString()}`);
}

// Films sibling of processTmdbTvShow. Shape differences flagged in the
// TmdbMovieDetail interface above; everything else mirrors the TV path
// 1:1 (same upsert pattern, same keyword + streaming flows).
//
// Movies don't have `last_air_date` — endYear stays null. `runtime` is
// stored in `episodeDurationMinutes` (the column is already-overloaded
// to mean "minutes per unit" — episode for TV, full runtime for film).
// `number_of_episodes` is null for films.
export async function processTmdbMovie(movieId: number): Promise<string | null> {
  const [detail, providers] = await Promise.all([
    tmdbGet<TmdbMovieDetail>(`/movie/${movieId}?append_to_response=keywords,videos&language=en-US`),
    tmdbGet<TmdbWatchProviders>(`/movie/${movieId}/watch/providers`),
  ]);
  const trailer = pickTrailerFromTmdb(detail.videos);

  const [upserted] = await db
    .insert(titles)
    .values({
      externalId: String(detail.id),
      source: 'tmdb',
      mediaType: 'film',
      title: detail.title,
      originalTitle: detail.original_title !== detail.title ? detail.original_title : null,
      synopsis: detail.overview || null,
      status: tmdbStatusToEnum(detail.status),
      releaseYear: detail.release_date ? parseInt(detail.release_date.slice(0, 4)) : null,
      endYear: null,
      episodeCount: null,
      episodeDurationMinutes: detail.runtime ?? null,
      posterUrl: detail.poster_path ? `${TMDB_IMAGE_BASE}${detail.poster_path}` : null,
      backdropUrl: detail.backdrop_path ? `${TMDB_IMAGE_BASE}${detail.backdrop_path}` : null,
      popularityScore: detail.popularity,
      trailerProvider: trailer?.provider ?? null,
      trailerVideoId: trailer?.videoId ?? null,
    })
    .onConflictDoUpdate({
      target: [titles.externalId, titles.source, titles.mediaType],
      set: {
        title: detail.title,
        synopsis: detail.overview || null,
        status: tmdbStatusToEnum(detail.status),
        episodeDurationMinutes: detail.runtime ?? null,
        popularityScore: detail.popularity,
        trailerProvider: trailer?.provider ?? null,
        trailerVideoId: trailer?.videoId ?? null,
        updatedAt: new Date(),
      },
    })
    .returning({ id: titles.id });

  if (!upserted) return null;

  // Movie keyword response nests under `keywords.keywords` (TV nests
  // under `keywords.results`). One of TMDB's small inconsistencies.
  const keywords = detail.keywords?.keywords ?? [];
  const tagIdMap = await upsertTmdbKeywords(keywords);

  const tagRows = keywords
    .map((kw) => ({ titleId: upserted.id, tagId: tagIdMap.get(kw.id) }))
    .filter((r): r is { titleId: string; tagId: string } => r.tagId !== undefined)
    .map((r) => ({ ...r, weight: 100, isSpoiler: false }));

  if (tagRows.length > 0) {
    await db.insert(titleTags).values(tagRows).onConflictDoNothing();
  }

  await upsertStreamingProviders(upserted.id, providers);
  return upserted.id;
}

// Show-batch size inside a single step.run. Per docs/runbooks/inngest.md
// Search TMDB for a query string and ingest the top results into our catalog.
// Used for on-demand ingest: when a user searches for a show that isn't in
// our DB yet, we fetch it from TMDB in real-time so it appears immediately.
//
// Strategy: run both /search/tv and /search/movie concurrently, take the
// top `limit` results by TMDB popularity from the combined set, then
// processTmdbTvShow / processTmdbMovie for each. Returns the internal DB IDs
// of titles that were successfully upserted (new AND existing).
//
// Caller note: this hits TMDB with 2 search requests + up to `limit * 2`
// detail requests. Keep limit ≤ 5 for search; burst is acceptable because
// on-demand ingest fires only on cache misses (zero local results).
export async function searchTmdbAndIngest(query: string, limit: number = 5): Promise<string[]> {
  interface TmdbSearchResult {
    id: number;
    popularity: number;
    media_type?: string;
  }
  interface TmdbSearchPage {
    results: TmdbSearchResult[];
  }

  const encoded = encodeURIComponent(query);
  const [tvPage, moviePage] = await Promise.allSettled([
    tmdbGet<TmdbSearchPage>(`/search/tv?query=${encoded}&language=en-US&page=1`),
    tmdbGet<TmdbSearchPage>(`/search/movie?query=${encoded}&language=en-US&page=1`),
  ]);

  const tvResults: Array<{ id: number; popularity: number; mediaType: 'tv' | 'movie' }> =
    tvPage.status === 'fulfilled'
      ? tvPage.value.results.map((r) => ({
          id: r.id,
          popularity: r.popularity,
          mediaType: 'tv' as const,
        }))
      : [];
  const movieResults: Array<{ id: number; popularity: number; mediaType: 'tv' | 'movie' }> =
    moviePage.status === 'fulfilled'
      ? moviePage.value.results.map((r) => ({
          id: r.id,
          popularity: r.popularity,
          mediaType: 'movie' as const,
        }))
      : [];

  // Merge, sort by TMDB popularity, take top `limit`.
  const merged = [...tvResults, ...movieResults]
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);

  const upserted: string[] = [];
  await Promise.allSettled(
    merged.map(async ({ id, mediaType }) => {
      try {
        const titleId =
          mediaType === 'tv' ? await processTmdbTvShow(id) : await processTmdbMovie(id);
        if (titleId) upserted.push(titleId);
      } catch (e) {
        // Best-effort: a single TMDB failure doesn't abort the rest.
        // eslint-disable-next-line no-console -- no logger abstraction yet; tracked in HM2C backlog
        console.warn('[searchTmdbAndIngest] failed to ingest title', { id, mediaType }, e);
      }
    }),
  );

  return upserted;
}

// the Inngest free tier caps step runs at ~1k/day; 1-step-per-show would
// burn 2000 step runs per nightly cron and silently truncate. Batching
// 10 shows per step.run drops the budget to ~300 step runs/cron — well
// under cap. Tradeoff: a transient failure inside a batch retries the
// whole batch (the per-show try/catch below scopes blast radius to one
// show). 10 is the sweet spot; lower means more step.runs, higher means
// bigger retry blast radius if a batch hits a transient TMDB error.
const SHOW_BATCH_SIZE = 10;

// Syncs one page of popular TV shows. Triggered per-page by tmdbSyncTvAll.
// Wraps the pure helpers in step.run so Inngest can checkpoint progress
// per BATCH and resume from the failed batch on retry. Per-show errors
// are caught and surfaced in the batch return — Inngest still treats the
// batch as successful, so one bad show doesn't gate the rest.
export const tmdbSyncTvPage = inngest.createFunction(
  {
    id: 'tmdb-sync-tv-page',
    name: 'TMDB: sync TV page',
    retries: 3,
    triggers: [tmdbSyncTvPageEvent],
  },
  async ({ event, step }) => {
    const page: number = event.data.page ?? 1;

    const discoverPage = await step.run('fetch-discover-page', () => fetchTmdbTvDiscoverPage(page));

    let processed = 0;
    let failed = 0;
    for (let i = 0; i < discoverPage.results.length; i += SHOW_BATCH_SIZE) {
      const batch = discoverPage.results.slice(i, i + SHOW_BATCH_SIZE);
      const result = await step.run(`process-batch-${page}-${i}`, async () => {
        let batchOk = 0;
        let batchFail = 0;
        const errors: Array<{ id: number; message: string }> = [];
        for (const show of batch) {
          try {
            await processTmdbTvShow(show.id);
            batchOk += 1;
          } catch (e) {
            batchFail += 1;
            errors.push({
              id: show.id,
              message: e instanceof Error ? e.message : String(e),
            });
          }
        }
        return { processed: batchOk, failed: batchFail, errors };
      });
      processed += result.processed;
      failed += result.failed;
    }

    return {
      page,
      processed,
      failed,
      totalPages: discoverPage.total_pages,
    };
  },
);

// Fans out one tmdb/sync.tv.page event per page, up to 100 pages (2000 shows).
// Triggered manually or on a nightly cron at 03:00 UTC.
export const tmdbSyncTvAll = inngest.createFunction(
  {
    id: 'tmdb-sync-tv-all',
    name: 'TMDB: sync all TV (fan-out)',
    retries: 1,
    triggers: [tmdbSyncTvAllEvent, cron('0 3 * * *')],
  },
  async ({ step }) => {
    const firstPage = await step.run('fetch-page-count', () =>
      tmdbGet<TmdbDiscoverPage>('/discover/tv?sort_by=popularity.desc&page=1&language=en-US'),
    );

    const totalPages = Math.min(firstPage.total_pages, 100);

    await step.sendEvent(
      'fan-out-pages',
      Array.from({ length: totalPages }, (_, i) => tmdbSyncTvPageEvent.create({ page: i + 1 })),
    );

    return { totalPages, fanned: totalPages };
  },
);
