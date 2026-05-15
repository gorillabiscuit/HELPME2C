// Stage 0 follow-up: viewer_pleasures field test.
//
// Hypothesis: the V3 prompt's "what is this work about" framing is causing
// every model to miss surface pleasures (e.g. OPM's action/spectacle). The
// recommendation engine needs "why people watch" signals, not just literary
// theme analysis.
//
// This script tests a revised V3 prompt that:
//   1. Leads with "WHY a viewer would enjoy this" instead of "what it's about"
//   2. Adds a "viewer_pleasures" field — 4-6 phrases naming surface pleasures
//   3. Demotes "subtextual_themes" to optional (not every work has subtext)
//
// Runs across 8 titles spanning action-central to action-irrelevant, on all
// three models. Output saved to test-pleasures-<timestamp>.txt next to script.

import Anthropic from '@anthropic-ai/sdk';
import { neon } from '@neondatabase/serverless';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { THEME_VOCABULARY, THEME_SLUGS } from '../src/server/themes/vocabulary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TITLES = [
  'One-Punch Man', // action is the headline pleasure for many fans
  'Mob Psycho 100', // action present, but emotional growth dominates
  'Neon Genesis Evangelion', // mecha spectacle + psychological
  'Chainsaw Man', // visceral action
  'Attack on Titan Final Season', // war spectacle
  'Death Note', // no physical action; mental chess as pleasure
  'Better Call Saul', // slow-burn, no action
  'The Good Place', // ideas comedy, no action
];

const MODELS = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-7',
} as const;
type ModelKey = keyof typeof MODELS;
const MODEL_ORDER: readonly ModelKey[] = ['haiku', 'sonnet', 'opus'];

const sql = neon(process.env.DATABASE_URL!);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const VOCAB_LINES = THEME_VOCABULARY.map((t) => `- ${t.slug}: ${t.hint}`).join('\n');

function buildSystemPrompt(): string {
  return `You analyse film, TV, and anime for a cross-medium recommendation engine.

Your goal is to capture WHY a viewer would enjoy this work — what makes someone press play, what makes them recommend it to a friend, what makes them rewatch it. This is NOT a literary critique of what the work "is really about." It is a practical inventory of the work's appeal to actual viewers.

Some works are watched primarily for surface pleasures: spectacular action, lush visuals, mystery puzzles, comfort, romance payoffs, world-building immersion. Others for emotional or thematic depth. Many for both. Capture both layers honestly, in proportion to how the work is actually enjoyed by its audience — including how it's discussed in fan communities, not only by critics.

For WELL-KNOWN works, draw on your knowledge of how viewers actually talk about the work. For LESSER-KNOWN works, rely on the synopsis but be conservative — fewer high-confidence items beats guessing.

Return JSON with the following EIGHT fields. No prose, JSON only.

1. "themes": 3-7 closed-vocab themes from the vocabulary at the end of this prompt. {slug, confidence} where confidence is 0.5-1.0 (0.9+ = central; 0.7-0.89 = clearly present; 0.5-0.69 = secondary). Skip demographic descriptors. If nothing fits, return [].

2. "viewer_pleasures": 4-6 short phrases (3-10 words each) describing the CONCRETE textures of enjoyment that make someone press play and recommend the show. Surface pleasures, named directly. NOT abstractions about meaning. NOT subtext. NOT what the show is about.
   - For action shows: name the action quality and specific fight/spectacle highlights.
   - For mysteries: name the puzzle satisfaction.
   - For comedies: name the joke register and ensemble chemistry.
   - For prestige drama: name the craft elements (writing, performances, direction).
   - For comfort shows: name the comfort.
   - For world-building heavy works: name the world depth.
   Example for One Punch Man: ["spectacular one-shot fight finishers", "S1 Madhouse animation widely cited as a high-water mark of the medium", "deadpan reaction shots to absurd power gaps", "satisfying power fantasy played as anti-power-fantasy", "iconic Saitama vs Boros fight"].
   Example for The Good Place: ["sharp ethics jokes that respect the audience", "lovable ensemble chemistry", "high-concept twists per season", "unusually warm tone for an afterlife premise"].
   Example for Better Call Saul: ["meticulous Bob Odenkirk performance", "patient, slow-burn tension", "morally complex con sequences", "shared universe payoffs for Breaking Bad fans", "Kim Wexler as one of TV's great characters"].
   Avoid anything that sounds like a film-studies paper.

3. "tone": 2-4 short tonal descriptors (one or two words each) describing how the work FEELS. Examples: "deadpan", "melancholic", "operatic", "frenetic", "wistful", "sardonic".

4. "narrative_mode": exactly one of "plays-straight" | "deconstructs" | "parodies" | "reinvents" | "hybrid".

5. "subtextual_themes": 2-4 free-form phrases (5-12 words each) — for VIEWERS WHO WANT IT, what depth is there beneath the surface? Not every work has subtext worth naming. If a work is genuinely surface-only (a popcorn action film, a comfort sitcom), return []. Don't manufacture subtext that isn't load-bearing.

6. "comparable_titles": 3-5 other works (any medium — film, TV, anime, novel) that share core APPEAL with this one. Match on the SHARED WHY-YOU-ENJOY-IT, not just shared subject matter. For OPM, Watchmen is a thematic match but Mob Psycho 100 (action + comedy + heart), Demon Slayer (action spectacle) or even Galaxy Quest (loving genre subversion) may be closer to what fans actually want next. Each: {"title": "...", "reason": "one short phrase explaining the SHARED APPEAL"}. Cross-medium comparisons especially valued. Only list works you genuinely know.

7. "engagement_level": one of "low" | "medium" | "high". How much active attention the work demands. Low = good background watch; high = demands full focus.

8. "stakes_scale": exactly one of "interpersonal" | "community" | "national" | "civilizational" | "cosmic". The PRIMARY DRAMATIC stakes — where the work invests emotional weight, NOT where its plot action takes place. The Good Place is interpersonal even though it's set in the cosmos. OPM is interpersonal even though Boros is shattering a city.

Controlled vocabulary for "themes" only:
${VOCAB_LINES}

Output shape (exactly):
{
  "themes": [{"slug": "...", "confidence": 0.0}],
  "viewer_pleasures": ["...", "..."],
  "tone": ["...", "..."],
  "narrative_mode": "...",
  "subtextual_themes": ["...", "..."],
  "comparable_titles": [{"title": "...", "reason": "..."}],
  "engagement_level": "...",
  "stakes_scale": "..."
}`;
}

const SYSTEM_PROMPT = buildSystemPrompt();

interface TitleRow {
  id: string;
  title: string;
  media_type: string;
  synopsis: string | null;
  release_year: number | null;
}

interface ThemeOut {
  slug: string;
  confidence: number;
}

interface ComparableTitle {
  title: string;
  reason: string;
}

interface Output {
  themes: ThemeOut[];
  viewer_pleasures: string[];
  tone: string[];
  narrative_mode: string;
  subtextual_themes: string[];
  comparable_titles: ComparableTitle[];
  engagement_level: string;
  stakes_scale: string;
}

function buildUserPrompt(title: TitleRow): string {
  const yearPart = title.release_year ? ` (${title.release_year})` : '';
  return `Title: ${title.title}${yearPart}
Medium: ${title.media_type}
Synopsis: ${title.synopsis ?? '(no synopsis available)'}

Produce the full JSON output per the schema. Return JSON only.`;
}

async function extractRaw(model: string, title: TitleRow): Promise<string> {
  const userPrompt = buildUserPrompt(title);
  const response = await anthropic.messages.create({
    model,
    max_tokens: 1800,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });
  const block = response.content[0];
  if (!block || block.type !== 'text') return '';
  return block.text;
}

function parseJson(text: string): unknown {
  const openIdx = text.indexOf('{');
  const closeIdx = text.lastIndexOf('}');
  if (openIdx === -1 || closeIdx === -1 || closeIdx < openIdx) return null;
  try {
    return JSON.parse(text.slice(openIdx, closeIdx + 1));
  } catch {
    return null;
  }
}

function parseOutput(parsed: unknown): Output | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  const themesRaw = Array.isArray(obj.themes) ? (obj.themes as unknown[]) : [];
  const themes = themesRaw
    .filter(
      (t): t is ThemeOut =>
        typeof t === 'object' &&
        t !== null &&
        typeof (t as ThemeOut).slug === 'string' &&
        typeof (t as ThemeOut).confidence === 'number' &&
        THEME_SLUGS.has((t as ThemeOut).slug) &&
        (t as ThemeOut).confidence >= 0.5,
    )
    .map((t) => ({ slug: t.slug, confidence: t.confidence }));
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? (v as unknown[]).filter((s): s is string => typeof s === 'string') : [];
  const cmpRaw = Array.isArray(obj.comparable_titles) ? (obj.comparable_titles as unknown[]) : [];
  const comparable = cmpRaw
    .filter(
      (c): c is ComparableTitle =>
        typeof c === 'object' &&
        c !== null &&
        typeof (c as ComparableTitle).title === 'string' &&
        typeof (c as ComparableTitle).reason === 'string',
    )
    .map((c) => ({ title: c.title, reason: c.reason }));
  return {
    themes,
    viewer_pleasures: strArr(obj.viewer_pleasures),
    tone: strArr(obj.tone),
    narrative_mode: typeof obj.narrative_mode === 'string' ? obj.narrative_mode : '',
    subtextual_themes: strArr(obj.subtextual_themes),
    comparable_titles: comparable,
    engagement_level: typeof obj.engagement_level === 'string' ? obj.engagement_level : '',
    stakes_scale: typeof obj.stakes_scale === 'string' ? obj.stakes_scale : '',
  };
}

function formatThemes(themes: ThemeOut[]): string {
  if (themes.length === 0) return '(none)';
  return themes
    .sort((a, b) => b.confidence - a.confidence)
    .map((t) => `${t.slug}(${t.confidence.toFixed(2)})`)
    .join(', ');
}

function formatOutput(o: Output | null, indent: string): string {
  if (!o) return `${indent}(parse failed)`;
  const list = (label: string, items: readonly string[]): string[] => [
    `${indent}${label}:`,
    ...(items.length > 0
      ? items.map((s) => `${indent}             - ${s}`)
      : [`${indent}             (none)`]),
  ];
  const cmp = o.comparable_titles.map((c) => `${indent}             - ${c.title} — ${c.reason}`);
  return [
    `${indent}themes:      ${formatThemes(o.themes)}`,
    ...list('PLEASURES', o.viewer_pleasures),
    `${indent}tone:        [${o.tone.join(', ')}]`,
    `${indent}mode:        ${o.narrative_mode}`,
    ...list('subtextual', o.subtextual_themes),
    `${indent}comparable:`,
    ...(cmp.length > 0 ? cmp : [`${indent}             (none)`]),
    `${indent}engagement:  ${o.engagement_level}`,
    `${indent}stakes:      ${o.stakes_scale}`,
  ].join('\n');
}

interface CallResult {
  model: ModelKey;
  raw: string;
  durationMs: number;
  error: string | null;
}

async function runOne(model: ModelKey, title: TitleRow): Promise<CallResult> {
  const t0 = Date.now();
  try {
    const raw = await extractRaw(MODELS[model], title);
    return { model, raw, durationMs: Date.now() - t0, error: null };
  } catch (e) {
    return {
      model,
      raw: '',
      durationMs: Date.now() - t0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

const output: string[] = [];

function log(line: string): void {
  console.log(line);
  output.push(line);
}

async function main(): Promise<void> {
  log(`Stage 0 follow-up — viewer_pleasures field test`);
  log(`Revised V3 prompt: viewer-experience-oriented, with new viewer_pleasures field`);
  log(`Models: Haiku 4.5, Sonnet 4.6, Opus 4.7`);
  log(`Titles: ${TITLES.length}`);
  log(`Started ${new Date().toISOString()}`);

  let totalCalls = 0;
  let totalErrors = 0;
  const tStart = Date.now();

  for (const titleName of TITLES) {
    const rows = (await sql`
      SELECT t.id, t.title, t.media_type, t.synopsis, t.release_year,
        (SELECT COUNT(*) FROM title_themes tt WHERE tt.title_id = t.id)::int AS theme_count
      FROM titles t
      WHERE LOWER(t.title) = LOWER(${titleName})
      ORDER BY theme_count DESC, popularity_score DESC NULLS LAST
      LIMIT 1
    `) as (TitleRow & { theme_count: number })[];
    const title = rows[0];
    if (!title) {
      log(`\n=== ${titleName}: NOT FOUND IN CATALOG ===`);
      continue;
    }

    log(`\n\n${'='.repeat(80)}`);
    log(`=== ${title.title} (${title.media_type}, ${title.release_year ?? '?'}) ===`);
    const synopsis = title.synopsis ?? '(none)';
    log(`Synopsis: ${synopsis.slice(0, 320)}${synopsis.length > 320 ? '…' : ''}`);
    log(`${'='.repeat(80)}`);

    const t0 = Date.now();
    const results = await Promise.all(MODEL_ORDER.map((m) => runOne(m, title)));
    const titleSec = ((Date.now() - t0) / 1000).toFixed(1);
    totalCalls += results.length;
    totalErrors += results.filter((r) => r.error).length;

    for (const r of results) {
      const modelLabel = r.model.padEnd(7);
      if (r.error) {
        log(`\n${modelLabel}: ERROR — ${r.error}`);
        continue;
      }
      log(`\n${modelLabel}:`);
      log(formatOutput(parseOutput(parseJson(r.raw)), '         '));
    }
    log(`\n(${titleSec}s for 3 parallel calls)`);
  }

  const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);
  log(`\n\n${'='.repeat(80)}`);
  log(`Run summary: ${totalCalls} total calls, ${totalErrors} errors, ${elapsed}s wall time`);
  log(`${'='.repeat(80)}`);

  const outPath = join(__dirname, `test-pleasures-${Date.now()}.txt`);
  writeFileSync(outPath, output.join('\n'));
  console.log(`\nFull output saved to: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
