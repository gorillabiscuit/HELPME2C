// Validate the v4.1 narrative_mode prompt fix on 13 representative titles.
//
// Reads current (v4.0) narrative_mode, re-extracts with v4.1, prints
// before/after side-by-side. Manual eyeball decides whether the fix
// landed.
//
// Expected behaviour per the prompt-fix commit (15b3815):
//   - One-Punch Man, Mob Psycho 100, Evangelion STAY deconstructs
//   - Better Call Saul, Death Note, Jujutsu Kaisen, Attack on Titan
//     SHIFT to plays-straight (or AoT to reinvents)
//   - Chainsaw Man borderline — accept either deconstructs or reinvents
//   - Plays-straight set stays put
//
// Cost: ~$0.30 at Sonnet 4.6 rates (13 calls).
// Run: pnpm dlx tsx --env-file=.env.local scripts/validate-prompt-v41.ts

import Anthropic from '@anthropic-ai/sdk';
import { neon } from '@neondatabase/serverless';
import { processCandidate, type CandidateTitle } from '../src/server/themes/extract';

const sql = neon(process.env.DATABASE_URL!);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const TITLES = [
  // Expected: stays deconstructs
  'One-Punch Man',
  'Mob Psycho 100',
  'Neon Genesis Evangelion',
  // Expected: shifts to plays-straight or reinvents
  'Better Call Saul',
  'Death Note',
  'JUJUTSU KAISEN',
  'Attack on Titan',
  'Chainsaw Man',
  // Expected: stays plays-straight
  'A Silent Voice',
  'Fullmetal Alchemist: Brotherhood',
  'My Hero Academia',
  'ONE PIECE',
  'Spirited Away',
];

interface BeforeRow {
  title: string;
  id: string;
  before_mode: string;
}

async function main(): Promise<void> {
  console.log('Reading current narrative_mode for each title (baseline)...');
  const before = (await sql`
    SELECT t.title, t.id, td.narrative_mode AS before_mode
    FROM titles t
    JOIN title_descriptors td ON td.title_id = t.id
    WHERE LOWER(t.title) = ANY(${TITLES.map((s) => s.toLowerCase())}::text[])
  `) as BeforeRow[];

  const beforeByTitle = new Map(before.map((r) => [r.title.toLowerCase(), r]));

  console.log(`\nRe-extracting ${before.length} titles with v4.1 prompt...\n`);

  type Result = {
    title: string;
    before: string;
    after: string;
    expectedShift: 'stay-decon' | 'shift-out-of-decon' | 'stay-straight' | 'either';
  };
  const results: Result[] = [];

  const expectStays = new Set(['one-punch man', 'mob psycho 100', 'neon genesis evangelion']);
  const expectShifts = new Set([
    'better call saul',
    'death note',
    'jujutsu kaisen',
    'attack on titan',
  ]);
  const expectStraight = new Set([
    'a silent voice',
    'fullmetal alchemist: brotherhood',
    'my hero academia',
    'one piece',
    'spirited away',
  ]);

  for (const titleName of TITLES) {
    const row = beforeByTitle.get(titleName.toLowerCase());
    if (!row) {
      console.log(`  ${titleName}: NOT FOUND`);
      continue;
    }
    const candRows = (await sql`
      SELECT id, title, media_type, synopsis, release_year FROM titles WHERE id = ${row.id}
    `) as Array<{
      id: string;
      title: string;
      media_type: 'tv' | 'film' | 'anime';
      synopsis: string | null;
      release_year: number | null;
    }>;
    const c = candRows[0];
    if (!c) continue;
    const candidate: CandidateTitle = {
      id: c.id,
      title: c.title,
      mediaType: c.media_type,
      synopsis: c.synopsis,
      releaseYear: c.release_year,
    };
    const r = await processCandidate(candidate, anthropic, sql);
    if (r.error) {
      console.log(`  ${c.title}: ERROR ${r.error.slice(0, 100)}`);
      continue;
    }
    const afterRow = (await sql`
      SELECT narrative_mode FROM title_descriptors WHERE title_id = ${c.id}
    `) as Array<{ narrative_mode: string }>;
    const after = afterRow[0]?.narrative_mode ?? '?';

    const key = c.title.toLowerCase();
    let expectedShift: Result['expectedShift'];
    if (expectStays.has(key)) expectedShift = 'stay-decon';
    else if (expectShifts.has(key)) expectedShift = 'shift-out-of-decon';
    else if (expectStraight.has(key)) expectedShift = 'stay-straight';
    else expectedShift = 'either';

    results.push({ title: c.title, before: row.before_mode, after, expectedShift });
    process.stdout.write('.');
  }
  console.log('\n');

  console.log(`${'='.repeat(86)}`);
  console.log('BEFORE → AFTER comparison');
  console.log(`${'='.repeat(86)}`);

  let passCount = 0;
  let failCount = 0;
  for (const r of results) {
    let verdict: string;
    switch (r.expectedShift) {
      case 'stay-decon':
        verdict = r.after === 'deconstructs' ? '✓ stayed' : '✗ over-corrected';
        break;
      case 'shift-out-of-decon':
        verdict = r.after !== 'deconstructs' ? '✓ shifted' : '✗ still deconstructs';
        break;
      case 'stay-straight':
        verdict = r.after === 'plays-straight' ? '✓ stayed' : '⚠ shifted';
        break;
      default:
        verdict = '';
    }
    if (verdict.startsWith('✓')) passCount += 1;
    else if (verdict.startsWith('✗')) failCount += 1;
    console.log(
      `  ${r.title.padEnd(38)}  ${r.before.padEnd(14)} → ${r.after.padEnd(14)}  ${verdict}`,
    );
  }
  console.log(`${'='.repeat(86)}`);
  console.log(
    `Pass: ${passCount}  Fail: ${failCount}  Other/borderline: ${results.length - passCount - failCount}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
