import { router } from './trpc';
import { meRouter } from './routers/me';
import { recFeedbackRouter } from './routers/rec-feedback';
import { recommendationsRouter } from './routers/recommendations';
import { streamingRouter } from './routers/streaming';
import { titlesRouter } from './routers/titles';
import { watchRouter } from './routers/watch';

export const appRouter = router({
  me: meRouter,
  titles: titlesRouter,
  watch: watchRouter,
  recommendations: recommendationsRouter,
  streaming: streamingRouter,
  recFeedback: recFeedbackRouter,
});

export type AppRouter = typeof appRouter;
