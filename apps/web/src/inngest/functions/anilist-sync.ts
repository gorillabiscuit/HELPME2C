import { cron } from 'inngest';
import { anilistSyncAnimeAllEvent, anilistSyncAnimePageEvent, inngest } from '../client';
import { db } from '@/server/db';
import { tags, titles, titleTags } from '@/server/schema';

const ANILIST_API = 'https://graphql.anilist.co';
// AniList rate limit: 90 req/min. Per-page is one GraphQL call (the page +
// all its media + tags in one shot — much more efficient than TMDB's
// per-show fetches), so 50 pages × 1 = 50 calls per cron run, well under
// the limit. perPage of 50 matches AniList's own pagination default.
const ANILIST_PER_PAGE = 50;
// Cap at 50 pages (~2500 anime). AniList has ~30k anime in their database;
// the long tail is unfilmed manga adaptations and obscure shorts that
// don't add useful taste signal. Top-2500 by popularity covers the
// recognisable canon plus the current season's airing shows.
const ANILIST_MAX_PAGES = 50;

interface AniListPageInfo {
  hasNextPage: boolean;
  currentPage: number;
  total: number;
  lastPage: number;
}

interface AniListMedia {
  id: number;
  title: {
    romaji: string | null;
    english: string | null;
    native: string | null;
  };
  description: string | null;
  status: 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS' | null;
  startDate: { year: number | null };
  endDate: { year: number | null };
  episodes: number | null;
  duration: number | null;
  coverImage: {
    extraLarge: string | null;
    large: string | null;
  };
  bannerImage: string | null;
  popularity: number;
  tags: Array<{
    id: number;
    name: string;
    category: string | null;
    rank: number;
    isMediaSpoiler: boolean;
    description: string | null;
  }>;
}

interface AniListPageResponse {
  Page: {
    pageInfo: AniListPageInfo;
    media: AniListMedia[];
  };
}

const PAGE_QUERY = /* GraphQL */ `
  query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        hasNextPage
        currentPage
        total
        lastPage
      }
      media(type: ANIME, sort: POPULARITY_DESC) {
        id
        title {
          romaji
          english
          native
        }
        description
        status
        startDate {
          year
        }
        endDate {
          year
        }
        episodes
        duration
        coverImage {
          extraLarge
          large
        }
        bannerImage
        popularity
        tags {
          id
          name
          category
          rank
          isMediaSpoiler
          description
        }
      }
    }
  }
`;

async function anilistGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList GraphQL → ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors && json.errors.length > 0) {
    throw new Error(`AniList errors: ${json.errors.map((e) => e.message).join('; ')}`);
  }
  if (!json.data) throw new Error('AniList response missing data field');
  return json.data;
}

function anilistStatusToEnum(
  status: AniListMedia['status'],
): 'ongoing' | 'completed' | 'cancelled' | 'upcoming' | null {
  if (!status) return null;
  switch (status) {
    case 'RELEASING':
      return 'ongoing';
    // HIATUS is its own state in AniList (e.g. Hunter x Hunter, Berserk
    // post-Miura) — pragmatically we treat it as ongoing because the
    // show isn't finished. Could add a dedicated 'hiatus' enum value
    // later if it matters for ranking.
    case 'HIATUS':
      return 'ongoing';
    case 'FINISHED':
      return 'completed';
    case 'CANCELLED':
      return 'cancelled';
    case 'NOT_YET_RELEASED':
      return 'upcoming';
    default:
      return null;
  }
}

// AniList descriptions contain HTML — <br>, <i>, <b>, sometimes <a> —
// because their public site renders them. We store plain text in our
// titles.synopsis and let the UI handle line breaks via whitespace-pre-line
// or similar. Defensive minimal stripper; not a full HTML parser.
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

async function upsertAnilistTags(anilistTags: AniListMedia['tags']): Promise<Map<number, string>> {
  const tagIdMap = new Map<number, string>();
  for (const tag of anilistTags) {
    // Same single-statement upsert pattern as the TMDB sync's
    // upsertTmdbKeywords (commit cd07a68). ON CONFLICT DO UPDATE always
    // returns the row, so concurrent syncs of the same tag name don't
    // lose a join (the find-then-insert pattern lost rows under
    // concurrency).
    //
    // Tag names are UNIQUE across all sources today — if AniList ships a
    // tag whose name already exists from TMDB (e.g. "Drama"), the
    // existing row is reused and source / category / description on the
    // existing row stay as-is. The cross-medium taxonomy work in M2
    // (per ROADMAP) will revisit this if explicit per-source tags
    // become necessary.
    const [row] = await db
      .insert(tags)
      .values({
        name: tag.name,
        source: 'anilist',
        category: tag.category,
        description: tag.description,
      })
      .onConflictDoUpdate({
        target: tags.name,
        set: { name: tag.name },
      })
      .returning({ id: tags.id });
    if (row) tagIdMap.set(tag.id, row.id);
  }
  return tagIdMap;
}

// Fetches and upserts a single AniList anime — title row, tag rows,
// title-tag joins. Pure async function, mirrors processTmdbTvShow
// (commit 3741434) so it's directly invokable for backfills, ad-hoc
// tests, or future admin tooling.
export async function processAnilistMedia(media: AniListMedia): Promise<string | null> {
  // Display-name preference: english → romaji → native → fallback. Lots
  // of anime (esp. older shows) have no English title, in which case the
  // romaji is the de-facto canonical name in Western fandom.
  const titleText =
    media.title.english || media.title.romaji || media.title.native || `AniList #${media.id}`;
  // Native (kanji/kana for Japanese works) goes to original_title only if
  // it's distinct from the display title. For shows where the English /
  // romaji and native are identical (rare but possible), we don't
  // duplicate.
  const originalTitle =
    media.title.native && media.title.native !== titleText ? media.title.native : null;
  const synopsis = media.description ? stripHtml(media.description) : null;
  const status = anilistStatusToEnum(media.status);

  const [upserted] = await db
    .insert(titles)
    .values({
      externalId: String(media.id),
      source: 'anilist',
      mediaType: 'anime',
      title: titleText,
      originalTitle,
      synopsis,
      status,
      releaseYear: media.startDate.year,
      // Only record end_year for shows that have actually finished. A
      // RELEASING show with an endDate set (which AniList sometimes does
      // for known final-season air windows) shouldn't claim to have
      // ended yet.
      endYear: media.status === 'FINISHED' ? media.endDate.year : null,
      episodeCount: media.episodes,
      episodeDurationMinutes: media.duration,
      posterUrl: media.coverImage.extraLarge || media.coverImage.large,
      backdropUrl: media.bannerImage,
      popularityScore: media.popularity,
    })
    .onConflictDoUpdate({
      target: [titles.externalId, titles.source],
      set: {
        title: titleText,
        synopsis,
        status,
        episodeCount: media.episodes,
        popularityScore: media.popularity,
        updatedAt: new Date(),
      },
    })
    .returning({ id: titles.id });

  if (!upserted) return null;

  const tagIdMap = await upsertAnilistTags(media.tags);

  // Map AniList tag rank (0-100) to our title_tags.weight column. AniList
  // ranks indicate how prominently a tag applies to the show — perfect
  // signal for tag-overlap rec scoring per ADR-0008. TMDB tags are all
  // weight=100 (no per-tag confidence); AniList's variable weights are a
  // strict upgrade.
  const tagRows = media.tags
    .map((t) => {
      const ourTagId = tagIdMap.get(t.id);
      if (!ourTagId) return null;
      return {
        titleId: upserted.id,
        tagId: ourTagId,
        weight: t.rank,
        isSpoiler: t.isMediaSpoiler,
      };
    })
    .filter(
      (r): r is { titleId: string; tagId: string; weight: number; isSpoiler: boolean } =>
        r !== null,
    );

  if (tagRows.length > 0) {
    await db.insert(titleTags).values(tagRows).onConflictDoNothing();
  }

  return upserted.id;
}

// Fetches one page of popular anime from AniList GraphQL.
export async function fetchAnilistAnimePage(
  page: number,
): Promise<{ media: AniListMedia[]; pageInfo: AniListPageInfo }> {
  const data = await anilistGraphQL<AniListPageResponse>(PAGE_QUERY, {
    page,
    perPage: ANILIST_PER_PAGE,
  });
  return { media: data.Page.media, pageInfo: data.Page.pageInfo };
}

// Anime-batch size inside a single step.run. Mirrors the TMDB sync —
// see SHOW_BATCH_SIZE in tmdb-sync.ts for the rationale (Inngest free
// tier ~1k step runs/day; per-anime step.runs would burn ~2550/cron).
// Batching 10 anime per step.run drops the budget to ~300/cron.
const ANIME_BATCH_SIZE = 10;

// Per-page sync. Triggered by the fan-out function below or manually.
// Wraps the pure helpers in step.run so Inngest can checkpoint progress
// per BATCH (10 anime each) and resume from the failed batch on retry.
// Per-anime errors are caught and surfaced in the batch return so one
// bad row doesn't gate the rest of the batch.
export const anilistSyncAnimePage = inngest.createFunction(
  {
    id: 'anilist-sync-anime-page',
    name: 'AniList: sync anime page',
    retries: 3,
    triggers: [anilistSyncAnimePageEvent],
  },
  async ({ event, step }) => {
    const page: number = event.data.page ?? 1;

    const { media, pageInfo } = await step.run('fetch-page', () => fetchAnilistAnimePage(page));

    let processed = 0;
    let failed = 0;
    for (let i = 0; i < media.length; i += ANIME_BATCH_SIZE) {
      const batch = media.slice(i, i + ANIME_BATCH_SIZE);
      const result = await step.run(`process-batch-${page}-${i}`, async () => {
        let batchOk = 0;
        let batchFail = 0;
        const errors: Array<{ id: number; message: string }> = [];
        for (const m of batch) {
          try {
            await processAnilistMedia(m);
            batchOk += 1;
          } catch (e) {
            batchFail += 1;
            errors.push({
              id: m.id,
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
      hasNextPage: pageInfo.hasNextPage,
      total: pageInfo.total,
      lastPage: pageInfo.lastPage,
    };
  },
);

// Fan-out: one anilist/sync.anime.page event per page, capped at
// ANILIST_MAX_PAGES. Cron runs at 03:30 UTC, 30 minutes after the TMDB
// nightly to spread Neon write load.
export const anilistSyncAnimeAll = inngest.createFunction(
  {
    id: 'anilist-sync-anime-all',
    name: 'AniList: sync all anime (fan-out)',
    retries: 1,
    triggers: [anilistSyncAnimeAllEvent, cron('30 3 * * *')],
  },
  async ({ step }) => {
    const firstPage = await step.run('fetch-page-1', () => fetchAnilistAnimePage(1));
    const totalPages = Math.min(firstPage.pageInfo.lastPage, ANILIST_MAX_PAGES);

    await step.sendEvent(
      'fan-out-pages',
      Array.from({ length: totalPages }, (_, i) =>
        anilistSyncAnimePageEvent.create({ page: i + 1 }),
      ),
    );

    return { totalPages, fanned: totalPages };
  },
);
