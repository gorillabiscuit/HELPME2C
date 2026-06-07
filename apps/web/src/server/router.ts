import { router } from './trpc';
import { groupsRouter } from './routers/groups';
import { listImportRouter } from './routers/list-import';
import { meRouter } from './routers/me';
import { preferencesRouter } from './routers/preferences';
import { recFeedbackRouter } from './routers/rec-feedback';
import { recommendationsRouter } from './routers/recommendations';
import { streamingRouter } from './routers/streaming';
import { titlesRouter } from './routers/titles';
import { watchRouter } from './routers/watch';

export const appRouter = router({
  me: meRouter,
  titles: titlesRouter,
  watch: watchRouter,
  preferences: preferencesRouter,
  recommendations: recommendationsRouter,
  streaming: streamingRouter,
  recFeedback: recFeedbackRouter,
  groups: groupsRouter,
  listImport: listImportRouter,
});

export type AppRouter = typeof appRouter;
