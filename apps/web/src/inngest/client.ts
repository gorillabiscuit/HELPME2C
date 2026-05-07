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

export const inngest = new Inngest({ id: 'helpme2c' });
