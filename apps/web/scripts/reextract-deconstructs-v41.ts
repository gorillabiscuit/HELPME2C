// Re-extract titles currently labelled 'deconstructs' at prompt_version='v4.0'.
//
// The v4.1 prompt fix sharpened the deconstructs vs plays-straight
// definition. Of 87 titles labelled 'deconstructs' under v4.0, my
// 8-title popular eyeball showed 4 were misclassified (BCS, Death Note,
// JJK, AoT). Extrapolating, ~30-50% of the v4.0 deconstructs are likely
// wrong. Re-extracting that cohort at v4.1 applies the fix cheaply.
//
// Sequential (1-parallel) to avoid clashing with any concurrent bulk
// extraction job. ~87 titles × $0.02 = ~$2. ~20-30 min wall time.
//
// Run: pnpm dlx tsx --env-file=.env.local scripts/reextract-deconstructs-v41.ts

import Anthropic from '@anthropic-ai/sdk';
import { neon } from '@neondatabase/serverless';
import { processCandidate, type CandidateTitle } from '../src/server/themes/extract';

const sql = neon(process.env.DATABASE_URL!);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface Row {
  id: string;
  title: string;
  media_type: 'tv' | 'film' | 'anime';
  synopsis: string | null;
  release_year: number | null;
  before_mode: string;
}

async function main(): Promise<void> {
  const targets = (await sql`
    SELECT t.id, t.title, t.media_type, t.synopsis, t.release_year, td.narrative_mode AS before_mode
    FROM titles t
    JOIN title_descriptors td ON td.title_id = t.id
    WHERE td.prompt_version = 'v4.0' AND td.narrative_mode = 'deconstructs'
    ORDER BY t.popularity_score DESC NULLS LAST
  `) as Row[];

  console.log(`Found ${targets.length} v4.0 deconstructs to re-extract at v4.1`);
  console.log(`Estimated cost: $${(targets.length * 0.02).toFixed(2)}\n`);

  const shifts = new Map<string, number>();
  let processed = 0;
  let stayed = 0;
  let shifted = 0;
  let failed = 0;
  const tStart = Date.now();

  for (const target of targets) {
    const candidate: CandidateTitle = {
      id: target.id,
      title: target.title,
      mediaType: target.media_type,
      synopsis: target.synopsis,
      releaseYear: target.release_year,
    };
    const result = await processCandidate(candidate, anthropic, sql);
    if (result.error) {
      failed += 1;
      console.log(`  ${target.title}: ERROR ${result.error.slice(0, 80)}`);
      continue;
    }
    const after = (await sql`
      SELECT narrative_mode FROM title_descriptors WHERE title_id = ${target.id}
    `) as Array<{ narrative_mode: string }>;
    const afterMode = after[0]?.narrative_mode ?? '?';

    if (afterMode === 'deconstructs') {
      stayed += 1;
      shifts.set('deconstructs (stayed)', (shifts.get('deconstructs (stayed)') ?? 0) + 1);
    } else {
      shifted += 1;
      shifts.set(`-> ${afterMode}`, (shifts.get(`-> ${afterMode}`) ?? 0) + 1);
    }
    processed += 1;

    if (processed % 10 === 0) {
      const elapsedMin = ((Date.now() - tStart) / 60000).toFixed(1);
      const rate = processed / ((Date.now() - tStart) / 60000);
      const eta = ((targets.length - processed) / rate).toFixed(1);
      console.log(
        `  [${processed}/${targets.length}] stayed=${stayed} shifted=${shifted} failed=${failed}  elapsed=${elapsedMin}m eta=${eta}m`,
      );
    }
  }

  const totalMin = ((Date.now() - tStart) / 60000).toFixed(1);
  console.log(`\n${'='.repeat(70)}`);
  console.log(`SUMMARY`);
  console.log(`  total:    ${targets.length}`);
  console.log(`  stayed deconstructs: ${stayed} (${Math.round((stayed / processed) * 100)}%)`);
  console.log(`  shifted:             ${shifted} (${Math.round((shifted / processed) * 100)}%)`);
  console.log(`  failed:              ${failed}`);
  console.log(`  wall time:           ${totalMin} min`);
  console.log(`\nShift breakdown:`);
  for (const [k, v] of Array.from(shifts.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(30)} ${v}`);
  }
  console.log(`${'='.repeat(70)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
