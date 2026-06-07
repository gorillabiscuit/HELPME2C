import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { users, userPreferences, type UserPreferencesData } from '../schema';
import { protectedProcedure, router } from '../trpc';

// Coarse preference axis: -1 to +1, or null (not set).
const axisSchema = z.number().min(-1).max(1).nullable().optional();

export const preferencesRouter = router({
  // Save or update the user's feature-preference vector from onboarding
  // Screen 3. Upserts on userId so re-running onboarding overwrites cleanly.
  upsert: protectedProcedure
    .input(
      z.object({
        tone: axisSchema,
        pacing: axisSchema,
        ending: axisSchema,
        intensity: axisSchema,
        complexity: axisSchema,
        moral: axisSchema,
        violenceVeto: z.boolean().nullable().optional(),
        sexualContentVeto: z.boolean().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [userRow] = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, ctx.userId))
        .limit(1);
      if (!userRow) {
        throw new Error('User not found');
      }

      const preferences: UserPreferencesData = {
        tone: input.tone ?? null,
        pacing: input.pacing ?? null,
        ending: input.ending ?? null,
        intensity: input.intensity ?? null,
        complexity: input.complexity ?? null,
        moral: input.moral ?? null,
        violenceVeto: input.violenceVeto ?? null,
        sexualContentVeto: input.sexualContentVeto ?? null,
      };

      await ctx.db
        .insert(userPreferences)
        .values({ userId: userRow.id, preferences })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: { preferences, updatedAt: new Date() },
        });

      return { ok: true };
    }),

  // Read the user's current preference vector. Returns null if not set.
  get: protectedProcedure.query(async ({ ctx }) => {
    const [userRow] = await ctx.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, ctx.userId))
      .limit(1);
    if (!userRow) return null;

    const [row] = await ctx.db
      .select({ preferences: userPreferences.preferences })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userRow.id))
      .limit(1);

    return row?.preferences ?? null;
  }),
});
