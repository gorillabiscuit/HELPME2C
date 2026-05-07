import { hello as mlHello } from '@helpme2c/ml';
import { toIsoUtc } from '@helpme2c/shared';
import { router, publicProcedure } from './trpc';
import { meRouter } from './routers/me';
import { watchRouter } from './routers/watch';

export const appRouter = router({
  hello: publicProcedure.query(() => ({
    serverTime: toIsoUtc(new Date()),
    mlStatus: mlHello(),
  })),
  me: meRouter,
  watch: watchRouter,
});

export type AppRouter = typeof appRouter;
