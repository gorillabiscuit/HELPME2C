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

      // Prompt design principles (from preference-elicitation research):
      //
      // 1. RECOGNITION OVER GENERATION. Wilson & Schooler (1991): asking users
      //    to analyse why they liked something *degrades* signal quality —
      //    they confabulate plausible-sounding reasons that don't predict future
      //    taste. Options must be things a viewer would immediately tap "yes,
      //    that" without reflection. Concrete, surface-level, viewer-experience
      //    language — not narrative-structural analysis.
      //
      // 2. AFFECTIVE FRAMING, NOT ANALYTICAL. Options should describe what it
      //    FELT LIKE to watch the show: "made me laugh out loud", "felt warm
      //    and cosy", "I kept thinking about it after". NOT: "subverted genre
      //    expectations", "morally complex family dynamics", "explores identity
      //    through a collective lens". The first kind is instantly recognizable;
      //    the second requires the user to think analytically, which is exactly
      //    the Wilson & Schooler introspection-harm trap.
      //
      // 3. NO "SOMETHING ELSE" — it is a discard signal, not a preference.
      //    Replace with "None of these fit" so the user can skip cleanly.
      //
      // 4. DISLIKE MODE: include a viewer-state escape hatch ("I just wasn't
      //    in the mood for it") that maps to NO slugs. Mood Management Theory
      //    (Zillmann): mood-mismatch rejections must NOT corrupt the content
      //    profile. This option should always appear last in dislike mode.
      //
      // 5. QUESTION FRAMING: short, warm, name the show. Avoid "What did you
      //    love about…" (too analytical). Prefer "What made [Show] click for
      //    you?" / "What put you off [Show]?" — casual, low-stakes.
      const modeInstruction =
        input.mode === 'like'
          ? `The user LIKED each show. Generate a question + 4 options asking what made it click for them.

QUESTION style: casual and warm. Name the show. E.g. "What made [Show] click for you?" or "What did you get out of [Show]?"

OPTIONS rules:
- Describe what it FELT LIKE to watch: "made me laugh", "felt warm and cosy", "I couldn't stop watching", "left me thinking for days", "loved watching the characters grow", "felt exciting and tense".
- Do NOT use narrative-analysis language ("morally complex", "subverted expectations", "explores identity through…").
- Each option maps to 1–2 slugs from the theme vocabulary that best match the feeling.
- 4 content options + 1 skip: { "label": "None of these fit", "slugs": [] }`
          : `The user DISLIKED each show. Generate a question + 4 options asking what put them off.

QUESTION style: non-judgmental, brief. Name the show. E.g. "What put you off [Show]?" or "What wasn't working for you with [Show]?"

OPTIONS rules:
- Describe what it FELT LIKE in negative terms: "felt slow and hard to get into", "the tone was too dark for me", "didn't connect with any of the characters", "felt too intense / stressful to watch", "wasn't in the mood for this kind of show".
- The LAST option must ALWAYS be: { "label": "I just wasn't in the mood for it", "slugs": [] } — this is a viewer-state escape hatch, NOT a content reason; it must have no slugs so it never down-weights content.
- The other 3 content options each map to 1–2 slugs.
- 3 content options + mood escape hatch + 1 skip: { "label": "None of these fit", "slugs": [] }`;

      const prompt = `You are helping personalise a TV/film recommendation engine.

${modeInstruction}

For EACH show below, generate one entry. The "options" array must follow the rules above exactly.

${showBlocks}

Return ONLY a JSON array, one entry per show, in the same order. No markdown, no explanation:
[
  {
    "titleId": "...",
    "question": "...",
    "options": [
      { "label": "...", "slugs": ["slug1"] },
      { "label": "None of these fit", "slugs": [] }
    ]
  }
]`;

      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      let raw: string;
      try {
        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1600,
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
