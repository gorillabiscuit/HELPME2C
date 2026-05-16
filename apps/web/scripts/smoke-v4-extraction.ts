// Smoke V4 extraction on a small set of titles end-to-end.
//
// Picks ~5 deliberately varied titles, calls processCandidate from the
// production extract module (so the prompt, model, and persistence flow
// are exactly what the Inngest function uses), then queries the three
// tables to verify rows landed correctly and surfaces FK resolution
// rate for the comparable-titles graph.
//
// Cost: ~$0.10 total at Sonnet 4.6 rates.
// Run: pnpm dlx tsx --env-file=.env.local scripts/smoke-v4-extraction.ts

import { neon } from '@neondatabase/serverless';
import Anthropic from '@anthropic-ai/sdk';
import { processCandidate, type CandidateTitle } from '../src/server/themes/extract';

// Mix of action-heavy + drama + comedy + a critically-loved-obscure to
// exercise the V4 schema across the spectrum we care about.
const TITLES = [
  'One-Punch Man',
  'Better Call Saul',
  'The Good Place',
  'Death Note',
  'A Silent Voice',
];

const sql = neon(process.env.DATABASE_URL!);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface TitleRow {
  id: string;
  title: string;
  media_type: 'tv' | 'film' | 'anime';
  synopsis: string | null;
  release_year: number | null;
}

function rowToCandidate(r: TitleRow): CandidateTitle {
  return {
    id: r.id,
    title: r.title,
    mediaType: r.media_type,
    synopsis: r.synopsis,
    releaseYear: r.release_year,
  };
}

async function main(): Promise<void> {
  console.log(`Smoke V4 extraction on ${TITLES.length} titles`);
  console.log(`Started ${new Date().toISOString()}\n`);

  let totalThemes = 0;
  let totalComparables = 0;
  let totalResolved = 0;
  let totalFailed = 0;
  let totalEmpty = 0;

  for (const titleName of TITLES) {
    const rows = (await sql`
      SELECT t.id, t.title, t.media_type, t.synopsis, t.release_year,
        (SELECT COUNT(*) FROM title_themes tt WHERE tt.title_id = t.id)::int AS theme_count
      FROM titles t
      WHERE LOWER(t.title) = LOWER(${titleName})
      ORDER BY theme_count DESC, popularity_score DESC NULLS LAST
      LIMIT 1
    `) as Array<TitleRow & { theme_count: number }>;
    const title = rows[0];
    if (!title) {
      console.log(`\n=== ${titleName}: NOT FOUND ===`);
      continue;
    }

    const t0 = Date.now();
    const result = await processCandidate(rowToCandidate(title), anthropic, sql);
    const dt = ((Date.now() - t0) / 1000).toFixed(1);

    console.log(`\n=== ${title.title} (${title.media_type}, ${title.release_year ?? '?'}) ===`);
    console.log(`  extraction took ${dt}s`);
    if (result.error) {
      console.log(`  ERROR: ${result.error}`);
      totalFailed += 1;
      continue;
    }
    if (result.empty) {
      console.log(`  empty result (extraction returned no themes or pleasures)`);
      totalEmpty += 1;
      continue;
    }

    // Read back what was persisted to verify all three tables.
    const themes = (await sql`
      SELECT theme_slug, confidence, source, prompt_version
      FROM title_themes WHERE title_id = ${title.id}
      ORDER BY confidence DESC
    `) as Array<{ theme_slug: string; confidence: number; source: string; prompt_version: string }>;

    const descriptors = (await sql`
      SELECT viewer_pleasures, tone, subtextual_themes, narrative_mode,
             engagement_level, stakes_scale, source_model, prompt_version
      FROM title_descriptors WHERE title_id = ${title.id}
    `) as Array<{
      viewer_pleasures: string[];
      tone: string[];
      subtextual_themes: string[];
      narrative_mode: string;
      engagement_level: string;
      stakes_scale: string;
      source_model: string;
      prompt_version: string;
    }>;

    const comparables = (await sql`
      SELECT position, referenced_title, referenced_title_id, reason
      FROM title_comparable_titles WHERE title_id = ${title.id}
      ORDER BY position ASC
    `) as Array<{
      position: number;
      referenced_title: string;
      referenced_title_id: string | null;
      reason: string;
    }>;

    console.log(
      `  themes (${themes.length}): ${themes.map((t) => `${t.theme_slug}(${t.confidence.toFixed(2)})`).join(', ')}`,
    );
    console.log(
      `  source: ${themes[0]?.source ?? '?'}  prompt: ${themes[0]?.prompt_version ?? '?'}`,
    );

    const d = descriptors[0];
    if (d) {
      console.log(`  viewer_pleasures (${d.viewer_pleasures.length}):`);
      for (const p of d.viewer_pleasures) console.log(`    - ${p}`);
      console.log(`  tone: [${d.tone.join(', ')}]`);
      console.log(
        `  mode: ${d.narrative_mode}  engagement: ${d.engagement_level}  stakes: ${d.stakes_scale}`,
      );
      console.log(`  subtextual (${d.subtextual_themes.length}):`);
      for (const s of d.subtextual_themes) console.log(`    - ${s}`);
    } else {
      console.log(`  WARN: no title_descriptors row`);
    }

    console.log(`  comparable_titles (${comparables.length}):`);
    const resolvedCount = comparables.filter((c) => c.referenced_title_id !== null).length;
    for (const c of comparables) {
      const resolved = c.referenced_title_id !== null ? '✓' : '✗';
      console.log(`    [${c.position}] ${resolved} ${c.referenced_title} — ${c.reason}`);
    }
    console.log(
      `  FK resolution: ${resolvedCount}/${comparables.length} (${comparables.length > 0 ? Math.round((resolvedCount / comparables.length) * 100) : 0}%)`,
    );

    totalThemes += themes.length;
    totalComparables += comparables.length;
    totalResolved += resolvedCount;
  }

  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`SUMMARY`);
  console.log(`  themes:              ${totalThemes}`);
  console.log(`  comparables:         ${totalComparables}`);
  console.log(
    `  comparables resolved: ${totalResolved} (${totalComparables > 0 ? Math.round((totalResolved / totalComparables) * 100) : 0}%)`,
  );
  console.log(`  empty/failed: ${totalEmpty} empty, ${totalFailed} failed`);
  console.log(`${'='.repeat(60)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
