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
    const existing = await db.query.tags.findFirst({ where: eq(tags.name, kw.name) });
    if (existing) {
      tagIdMap.set(kw.id, existing.id);
    } else {
      const [inserted] = await db
        .insert(tags)
        .values({ name: kw.name, source: 'tmdb' })
        .onConflictDoNothing()
        .returning({ id: tags.id });
      if (inserted) tagIdMap.set(kw.id, inserted.id);
    }
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

// Syncs one page of popular TV shows. Triggered per-page by tmdbSyncTvAll.
export const tmdbSyncTvPage = inngest.createFunction(
  {
    id: 'tmdb-sync-tv-page',
    name: 'TMDB: sync TV page',
    retries: 3,
    triggers: [tmdbSyncTvPageEvent],
  },
  async ({ event, step }) => {
    const page: number = event.data.page ?? 1;

    const discoverPage = await step.run('fetch-discover-page', () =>
      tmdbGet<TmdbDiscoverPage>(`/discover/tv?sort_by=popularity.desc&page=${page}&language=en-US`),
    );

    for (const show of discoverPage.results) {
      await step.run(`process-tv-${show.id}`, async () => {
        const [detail, providers] = await Promise.all([
          tmdbGet<TmdbTvDetail>(`/tv/${show.id}?append_to_response=keywords&language=en-US`),
          tmdbGet<TmdbWatchProviders>(`/tv/${show.id}/watch/providers`),
        ]);

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
          })
          .onConflictDoUpdate({
            target: [titles.externalId, titles.source],
            set: {
              title: detail.name,
              synopsis: detail.overview || null,
              status: tmdbStatusToEnum(detail.status),
              episodeCount: detail.number_of_episodes || null,
              popularityScore: detail.popularity,
              updatedAt: new Date(),
            },
          })
          .returning({ id: titles.id });

        if (!upserted) return;

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
      });
    }

    return { page, processed: discoverPage.results.length, totalPages: discoverPage.total_pages };
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
