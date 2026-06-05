import { Inngest, eventType, staticSchema } from 'inngest';

export const tmdbSyncTvPageEvent = eventType('tmdb/sync.tv.page', {
  schema: staticSchema<{ page: number }>(),
});

export const tmdbSyncTvAllEvent = eventType('tmdb/sync.tv.all', {
  schema: staticSchema<Record<string, never>>(),
});

export const anilistSyncAnimePageEvent = eventType('anilist/sync.anime.page', {
  schema: staticSchema<{ page: number }>(),
});

export const anilistSyncAnimeAllEvent = eventType('anilist/sync.anime.all', {
  schema: staticSchema<Record<string, never>>(),
});

export const recommendUserEvent = eventType('recommend/user.recompute', {
  schema: staticSchema<{ userId: string }>(),
});

export const recommendAllUsersEvent = eventType('recommend/all-users.recompute', {
  schema: staticSchema<Record<string, never>>(),
});

export const applyThemesEvent = eventType('themes/apply', {
  schema: staticSchema<Record<string, never>>(),
});

export const recommendGroupEvent = eventType('recommend/group.recompute', {
  schema: staticSchema<{ groupId: string }>(),
});

export const recommendAllGroupsEvent = eventType('recommend/all-groups.recompute', {
  schema: staticSchema<Record<string, never>>(),
});

// Theme extraction (LLM pass over title synopses). Two events:
//   themes/extract.batch — process a specific set of title IDs (one
//     batch is one Inngest function invocation, ~60 titles).
//   themes/extract.all — fan-out: load all candidates from the catalog,
//     split into batches, emit one .batch event per chunk.
// See apps/web/src/server/themes/extract.ts for the underlying logic.
export const extractThemesBatchEvent = eventType('themes/extract.batch', {
  schema: staticSchema<{ titleIds: string[] }>(),
});

export const extractThemesAllEvent = eventType('themes/extract.all', {
  schema: staticSchema<{
    force?: boolean;
    mediaType?: 'tv' | 'film' | 'anime';
    limit?: number;
  }>(),
});

// Catalog broadening — pulls non-English and deeper global slices from
// TMDB. Manual trigger only (no cron); run once to seed the catalog with
// a wide cross-language surface.
//   catalog/broaden.all — orchestrator: builds the slice list, fans out
//     one .slice event per language/medium combination.
//   catalog/broaden.slice — worker: paginates one TMDB discover slice
//     to exhaustion (no business cap; stops at TMDB's total_pages).
export const catalogBroadenAllEvent = eventType('catalog/broaden.all', {
  schema: staticSchema<Record<string, never>>(),
});

export const catalogBroadenSliceEvent = eventType('catalog/broaden.slice', {
  schema: staticSchema<{
    label: string;
    mediaType: 'tv' | 'movie';
    params: Record<string, string>;
  }>(),
});

export const inngest = new Inngest({ id: 'helpme2c' });
