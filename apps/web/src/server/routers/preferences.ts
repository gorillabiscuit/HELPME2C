import Anthropic from '@anthropic-ai/sdk';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { titles, titleThemes, users, userPreferences, type UserPreferencesData } from '../schema';
import { protectedProcedure, router } from '../trpc';
import { THEME_VOCABULARY } from '../themes/vocabulary';

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

  // Generate per-show insights for the user's picks.
  // One Claude call returns a question + options for EACH show individually.
  // The UI steps through shows one at a time showing the poster.
  generateInsight: protectedProcedure
    .input(
      z.object({
        titleIds: z.array(z.string().uuid()).min(1).max(20),
        mode: z.enum(['like', 'dislike']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Load title metadata + theme slugs in parallel.
      const [titleRows, themeRows] = await Promise.all([
        ctx.db
          .select({ id: titles.id, title: titles.title, posterUrl: titles.posterUrl })
          .from(titles)
          .where(inArray(titles.id, input.titleIds)),
        ctx.db
          .select({
            titleId: titleThemes.titleId,
            slug: titleThemes.themeSlug,
            confidence: titleThemes.confidence,
          })
          .from(titleThemes)
          .where(inArray(titleThemes.titleId, input.titleIds)),
      ]);

      const titleMap = new Map(titleRows.map((t) => [t.id, t]));

      // Group slugs by title, high-confidence only.
      const slugsByTitle = new Map<string, string[]>();
      for (const row of themeRows) {
        if (row.confidence < 0.7) continue;
        const slugs = slugsByTitle.get(row.titleId) ?? [];
        slugs.push(row.slug);
        slugsByTitle.set(row.titleId, slugs);
      }

      // Build the prompt block for each show.
      const showBlocks = input.titleIds
        .filter((id) => titleMap.has(id))
        .map((id) => {
          const t = titleMap.get(id)!;
          const slugs = (slugsByTitle.get(id) ?? []).slice(0, 8);
          const slugHints = slugs
            .map((s) => {
              const entry = THEME_VOCABULARY.find((v) => v.slug === s);
              return entry ? `${s}: ${entry.hint}` : null;
            })
            .filter(Boolean)
            .join('; ');
          return `Title: "${t.title}"\nThemes: ${slugHints || '(none found)'}`;
        })
        .join('\n\n');

      const verb = input.mode === 'like' ? 'loved' : 'did NOT enjoy';
      const prompt = `You are helping personalise a TV/film recommendation engine. The user ${verb} each of these shows.

For EACH show, generate:
1. A short question asking what they ${input.mode === 'like' ? 'loved' : "didn't like"} about that specific show (name the show in the question, keep it conversational)
2. 4 specific options — concrete emotional/thematic reasons, anchored to that show's actual content. NOT generic ("great acting", "good story"). Each option maps to 1-2 of the theme slugs.
3. A "Something else" option with no slugs.

${showBlocks}

Return ONLY a JSON array, one entry per show, in the same order. No markdown:
[
  {
    "titleId": "...",
    "question": "What did you love about [Show]?",
    "options": [
      { "label": "...", "slugs": ["slug1"] },
      { "label": "Something else — tell us", "slugs": [] }
    ]
  }
]`;

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      let raw: string;
      try {
        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1200,
          messages: [
            { role: 'user', content: prompt },
            { role: 'assistant', content: '[' },
          ],
        });
        const block = response.content[0];
        raw = '[' + (block?.type === 'text' ? block.text : '');
      } catch {
        return null;
      }

      try {
        const parsed = JSON.parse(raw) as Array<{
          titleId: string;
          question: string;
          options: Array<{ label: string; slugs: string[] }>;
        }>;
        if (!Array.isArray(parsed)) return null;
        // Attach poster URL for display.
        return parsed
          .filter((p) => p.titleId && p.question && Array.isArray(p.options))
          .map((p) => ({
            ...p,
            titleName: titleMap.get(p.titleId)?.title ?? '',
            posterUrl: titleMap.get(p.titleId)?.posterUrl ?? null,
          }));
      } catch {
        return null;
      }
    }),

  // Save the slugs the user confirmed from the insight screen.
  saveInsight: protectedProcedure
    .input(
      z.object({
        slugs: z.array(z.string()),
        mode: z.enum(['like', 'dislike']),
        freeText: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [userRow] = await ctx.db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, ctx.userId))
        .limit(1);
      if (!userRow) return { ok: false };

      const field = input.mode === 'like' ? 'insightSlugs' : 'insightAvoidSlugs';

      // Upsert — merge with any existing preferences.
      const [existing] = await ctx.db
        .select({ preferences: userPreferences.preferences })
        .from(userPreferences)
        .where(eq(userPreferences.userId, userRow.id))
        .limit(1);

      const current: UserPreferencesData = existing?.preferences ?? {};
      const updated: UserPreferencesData = { ...current, [field]: input.slugs };

      await ctx.db
        .insert(userPreferences)
        .values({ userId: userRow.id, preferences: updated })
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: { preferences: updated, updatedAt: new Date() },
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
