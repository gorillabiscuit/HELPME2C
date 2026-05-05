import { toIsoUtc } from '@helpme2c/shared';
import { router, publicProcedure } from './trpc';

export const appRouter = router({
  hello: publicProcedure.query(() => ({
    serverTime: toIsoUtc(new Date()),
  })),
});

export type AppRouter = typeof appRouter;
