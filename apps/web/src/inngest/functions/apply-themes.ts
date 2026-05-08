import { and, eq } from 'drizzle-orm';
import { THEME_MAPPINGS, type ThemeMapping } from '@helpme2c/ml';
import { db } from '@/server/db';
import { tags, tagThemes, themes } from '@/server/schema';
import { applyThemesEvent, inngest } from '../client';

interface ApplyResult {
  readonly themesUpserted: number;
  readonly linksUpserted: number;
  readonly missingTags: ReadonlyArray<{ source: string; tagName: string; themeSlug: string }>;
}

// Reads THEME_MAPPINGS from packages/ml, looks up each member's tag id by
// (source, name), upserts a `themes` row per mapping, and upserts the
// `tag_themes` join rows.
//
// Idempotent: re-running with no mapping changes is a no-op (every upsert
// hits ON CONFLICT). Removing a mapping from the source file does NOT
// delete the DB row — orphans are harmless and intentional per
// schema/themes.ts §editorial-workflow.
//
// Missing tags (member references a (source, name) that isn't in the
// `tags` table yet) are collected and returned, not thrown — early in
// the project we expect coverage gaps as TMDB / AniList sync depth
// grows. The caller logs them so the editorial maintainer can decide
// whether to wait, or rewrite the mapping.
export async function applyThemeMappings(): Promise<ApplyResult> {
  let themesUpserted = 0;
  let linksUpserted = 0;
  const missingTags: Array<{ source: string; tagName: string; themeSlug: string }> = [];

  for (const mapping of THEME_MAPPINGS as readonly ThemeMapping[]) {
    const [themeRow] = await db
      .insert(themes)
      .values({
        slug: mapping.slug,
        name: mapping.name,
        description: mapping.description,
      })
      .onConflictDoUpdate({
        target: themes.slug,
        set: {
          name: mapping.name,
          description: mapping.description,
          updatedAt: new Date(),
        },
      })
      .returning({ id: themes.id });

    if (!themeRow) continue;
    themesUpserted += 1;

    for (const member of mapping.members) {
      const [tagRow] = await db
        .select({ id: tags.id })
        .from(tags)
        .where(and(eq(tags.source, member.source), eq(tags.name, member.tagName)))
        .limit(1);

      if (!tagRow) {
        missingTags.push({
          source: member.source,
          tagName: member.tagName,
          themeSlug: mapping.slug,
        });
        continue;
      }

      await db
        .insert(tagThemes)
        .values({
          tagId: tagRow.id,
          themeId: themeRow.id,
          strength: member.strength,
        })
        .onConflictDoUpdate({
          target: [tagThemes.tagId, tagThemes.themeId],
          set: { strength: member.strength },
        });
      linksUpserted += 1;
    }
  }

  return { themesUpserted, linksUpserted, missingTags };
}

// Manual-trigger Inngest function. No cron — themes change rarely (when
// a maintainer edits packages/ml/src/themes/mappings.ts) and the change
// is small enough to fire by hand from the Inngest dashboard or via an
// admin script. Each mapping is its own step.run so a partial failure
// doesn't lose progress.
export const applyThemes = inngest.createFunction(
  {
    id: 'apply-themes',
    name: 'Themes: apply mappings to DB',
    retries: 1,
    triggers: [applyThemesEvent],
  },
  async ({ step }) => {
    return await step.run('apply', () => applyThemeMappings());
  },
);
