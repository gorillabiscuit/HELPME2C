import Anthropic from '@anthropic-ai/sdk';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { titleThemes, users, userPreferences, type UserPreferencesData } from '../schema';
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

  // Generate an AI insight from the user's like or dislike picks.
  // Calls Claude Haiku with the theme slugs of picked titles and returns
  // a conversational insight + specific options for the user to validate.
  // Each option carries the vocabulary slugs it maps to so the result
  // is immediately structured — no second inference step needed.
  generateInsight: protectedProcedure
    .input(
      z.object({
        titleIds: z.array(z.string().uuid()).min(2).max(20),
        mode: z.enum(['like', 'dislike']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Load theme slugs for the picked titles.
      const themeRows = await ctx.db
        .select({
          titleId: titleThemes.titleId,
          slug: titleThemes.themeSlug,
          confidence: titleThemes.confidence,
        })
        .from(titleThemes)
        .where(inArray(titleThemes.titleId, input.titleIds));

      // Group slugs by title, keep only high-confidence ones.
      const byTitle = new Map<string, string[]>();
      for (const row of themeRows) {
        if (row.confidence < 0.7) continue;
        const slugs = byTitle.get(row.titleId) ?? [];
        slugs.push(row.slug);
        byTitle.set(row.titleId, slugs);
      }

      // Count slug frequency across all picks to surface the common threads.
      const slugFreq = new Map<string, number>();
      for (const slugs of byTitle.values()) {
        for (const slug of slugs) {
          slugFreq.set(slug, (slugFreq.get(slug) ?? 0) + 1);
        }
      }

      // Take slugs that appear in at least 2 titles — the actual shared signal.
      const sharedSlugs = [...slugFreq.entries()]
        .filter(([, count]) => count >= Math.min(2, input.titleIds.length))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([slug]) => slug);

      // Build hint descriptions for each shared slug so Claude understands
      // what each one means without hallucinating.
      const slugHints = sharedSlugs
        .map((slug) => {
          const entry = THEME_VOCABULARY.find((t) => t.slug === slug);
          return entry ? `- ${slug}: ${entry.hint}` : null;
        })
        .filter(Boolean)
        .join('\n');

      const modeContext =
        input.mode === 'like'
          ? 'these are shows the person LOVED'
          : 'these are shows the person did NOT enjoy';

      const prompt = `You are helping build a personalised recommendation engine. ${modeContext}.

The picks share these themes (slug: hint):
${slugHints || '(no strong shared themes found)'}

Your task:
1. Write a SHORT, conversational insight (1-2 sentences) identifying the most interesting pattern across these picks. Be specific — name what they have in common. Don't be generic ("great storytelling"). Sound like a smart friend, not a bot.
2. Write a short follow-up question (one sentence).
3. Generate 4-5 specific, distinct options explaining what might have ${input.mode === 'like' ? 'drawn them to' : 'put them off'} these shows. Options must be concrete emotional/thematic hooks — NOT generic ("good writing", "great characters"). Each option maps to 1-3 of the theme slugs above.
4. Include a "Something else" option with no slugs.

Return ONLY valid JSON, no markdown, no explanation:
{
  "insight": "...",
  "question": "...",
  "options": [
    { "label": "...", "slugs": ["slug1", "slug2"] },
    { "label": "Something else — tell us", "slugs": [] }
  ]
}`;

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      let raw: string;
      try {
        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          messages: [
            { role: 'user', content: prompt },
            { role: 'assistant', content: '{' },
          ],
        });
        const block = response.content[0];
        raw = '{' + (block?.type === 'text' ? block.text : '');
      } catch {
        return null; // graceful fallback — caller skips insight screen
      }

      try {
        const parsed = JSON.parse(raw) as {
          insight: string;
          question: string;
          options: Array<{ label: string; slugs: string[] }>;
        };
        // Validate shape minimally.
        if (!parsed.insight || !parsed.question || !Array.isArray(parsed.options)) return null;
        return parsed;
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
