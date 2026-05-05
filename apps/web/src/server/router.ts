import { hello as mlHello } from '@helpme2c/ml';
import { toIsoUtc } from '@helpme2c/shared';
import { router, publicProcedure } from './trpc';

export const appRouter = router({
  hello: publicProcedure.query(() => ({
    serverTime: toIsoUtc(new Date()),
    mlStatus: mlHello(),
  })),
});

export type AppRouter = typeof appRouter;
