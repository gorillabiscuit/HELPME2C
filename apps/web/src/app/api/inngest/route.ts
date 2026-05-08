import { serve } from 'inngest/next';
import { inngest } from '@/inngest/client';
import {
  anilistSyncAnimeAll,
  anilistSyncAnimePage,
  applyThemes,
  recommendAllGroups,
  recommendAllUsers,
  recommendGroup,
  recommendUser,
  tmdbSyncTvAll,
  tmdbSyncTvPage,
} from '@/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    tmdbSyncTvPage,
    tmdbSyncTvAll,
    anilistSyncAnimePage,
    anilistSyncAnimeAll,
    recommendUser,
    recommendAllUsers,
    applyThemes,
    recommendGroup,
    recommendAllGroups,
  ],
});
