// One-off research script — Stage 0 of the theme-extraction redesign.
//
// Compares 3 prompt variants × 3 models on a deliberately varied set of titles.
//   V1 — current production prompt (synopsis-only, closed-vocab themes).
//   V2 — same schema, system prompt nudges the model to draw on prior knowledge
//        of well-known works rather than grounding strictly in the synopsis.
//   V3 — V2 prompt + six new output fields: tone, narrative_mode,
//        subtextual_themes, comparable_titles, engagement_level, stakes_scale.
//
// Output is printed to stdout and saved to compare-output-<timestamp>.txt next
// to this script. Nothing is persisted to the database.
//
// Run: pnpm dlx tsx --env-file=.env.local scripts/compare-models.ts

import Anthropic from '@anthropic-ai/sdk';
import { neon } from '@neondatabase/serverless';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { THEME_VOCABULARY, THEME_SLUGS } from '../src/server/themes/vocabulary';

// Deliberately varied set: famous-complex (priors matter), famous-straight,
// comedy-variants (does the current vocab distinguish them?), and a couple
// of critically-loved-obscure (priors thin).
const TITLES_TO_COMPARE = [
  // Famous + complex — where prior knowledge should pay off
  'One-Punch Man',
  'Mob Psycho 100',
  'Neon Genesis Evangelion',
  'BoJack Horseman',
  'Watchmen',
  'Better Call Saul',
  // Famous + plays-straight — sanity baseline
  'Death Note',
  'Breaking Bad',
  'Chainsaw Man',
  // Comedy variants — does the system tell them apart?
  'The Good Place',
  'Rick and Morty',
  'What We Do in the Shadows',
  // Critically loved + obscure — priors thin
  'A Silent Voice',
  'Mushishi',
  // Existing baseline title
  'Attack on Titan Final Season',
];

const MODELS = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-7',
} as const;
type ModelKey = keyof typeof MODELS;
const MODEL_ORDER: readonly ModelKey[] = ['haiku', 'sonnet', 'opus'];

const VARIANTS = ['v1', 'v2', 'v3'] as const;
type Variant = (typeof VARIANTS)[number];

const VARIANT_LABEL: Record<Variant, string> = {
  v1: 'V1 — current production prompt (synopsis-only, closed-vocab themes)',
  v2: 'V2 — V1 + prior-knowledge nudge for well-known works',
  v3: 'V3 — V2 + six new fields (tone, mode, subtextual, comparable, engagement, stakes)',
};

const sql = neon(process.env.DATABASE_URL!);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const VOCAB_LINES = THEME_VOCABULARY.map((t) => `- ${t.slug}: ${t.hint}`).join('\n');

function buildSystemPromptV1(): string {
  return `You analyse film, TV, and anime synopses to identify their core THEMES.

You must return ONLY themes drawn from this controlled vocabulary. Do not invent new slugs. Pick 3 to 7 themes per title — the ones that genuinely capture what the work is about. Skip demographic descriptors entirely (we already have those).

When a title genuinely doesn't fit any vocabulary theme, return an empty array — better empty than wrong.

Confidence values: 0.9-1.0 = central to the work; 0.7-0.89 = clearly present; 0.5-0.69 = present but secondary; below 0.5 = don't include.

Controlled vocabulary (slug: hint):
${VOCAB_LINES}

Return JSON only, no prose. Shape: {"themes":[{"slug":"...","confidence":0.0}]}`;
}

function buildSystemPromptV2(): string {
  return `You analyse film, TV, and anime to identify their core THEMES for a recommendation engine.

For WELL-KNOWN works (popular shows/films with significant critical or fan discussion), draw on your knowledge of how the work is actually discussed and understood — its themes, its subtext, what makes it distinctive — not just the surface plot in the synopsis. The synopsis is one signal; your wider knowledge of the work is another.

For LESSER-KNOWN works where you don't have meaningful prior knowledge, rely on the synopsis but be conservative — better to return fewer high-confidence themes than to guess.

You must return ONLY themes drawn from this controlled vocabulary. Do not invent new slugs. Pick 3 to 7 themes per title — the ones that genuinely capture what the work is about. Skip demographic descriptors entirely (we already have those).

When a title genuinely doesn't fit any vocabulary theme, return an empty array — better empty than wrong.

Confidence values: 0.9-1.0 = central to the work; 0.7-0.89 = clearly present; 0.5-0.69 = present but secondary; below 0.5 = don't include.

Controlled vocabulary (slug: hint):
${VOCAB_LINES}

Return JSON only, no prose. Shape: {"themes":[{"slug":"...","confidence":0.0}]}`;
}

function buildSystemPromptV3(): string {
  return `You analyse film, TV, and anime for a cross-medium recommendation engine.

For WELL-KNOWN works, draw on your knowledge of how the work is discussed and understood — its themes, subtext, what makes it distinctive — not just the synopsis. For LESSER-KNOWN works, rely on the synopsis but be conservative; if you don't have strong priors, return fewer items rather than guessing.

Return JSON with the following SEVEN fields. No prose, JSON only.

1. "themes": 3-7 closed-vocab themes drawn ONLY from the vocabulary at the end of this prompt. {slug, confidence} where confidence is 0.5-1.0 (0.9+ = central; 0.7-0.89 = clearly present; 0.5-0.69 = secondary). Skip demographic descriptors. If nothing in the vocab fits, return [].

2. "tone": 2-4 short tonal descriptors (one or two words each) describing how the work FEELS. Examples: "ironic", "earnest", "melancholic", "oppressive", "warm", "deadpan", "operatic", "intimate", "frenetic", "wistful", "sardonic". Pick descriptors that genuinely differentiate this work from peer works in its genre — not generic labels.

3. "narrative_mode": exactly one of "plays-straight" | "deconstructs" | "parodies" | "reinvents" | "hybrid".
   - plays-straight: executes its genre conventions sincerely (Breaking Bad as crime drama)
   - deconstructs: foregrounds and examines its genre's conventions (One Punch Man for shonen)
   - parodies: openly sends up its genre (Galaxy Quest)
   - reinvents: keeps the form but radically reshapes it (The Wire reinventing the police procedural)
   - hybrid: mixes modes meaningfully

4. "subtextual_themes": 2-4 free-form short phrases (5-12 words each) capturing what the work is REALLY about beneath the surface plot. These are NOT vocab themes — they are precise observations.
   Example for One Punch Man: ["the ennui of effortless mastery", "what does heroism mean when it costs nothing", "celebrity-as-heroism critique"].

5. "comparable_titles": 3-5 other works (any medium — film, TV, anime, novel) that share core sensibility with this one. Each: {"title": "...", "reason": "one short phrase explaining the connection"}. Cross-medium comparisons especially valued. Only list works you genuinely know; if you can't think of 3, return fewer.

6. "engagement_level": one of "low" | "medium" | "high". How much active attention the work demands. Low = good background watch; high = demands full focus.

7. "stakes_scale": exactly one of "interpersonal" | "community" | "national" | "civilizational" | "cosmic". The PRIMARY DRAMATIC stakes layer — where the work invests emotional weight, NOT necessarily where the plot's action is. A show with cosmic action stakes but interpersonal emotional stakes (One Punch Man) should be classified by the emotional layer.

Controlled vocabulary for "themes" only:
${VOCAB_LINES}

Output shape (exactly):
{
  "themes": [{"slug": "...", "confidence": 0.0}],
  "tone": ["...", "..."],
  "narrative_mode": "...",
  "subtextual_themes": ["...", "..."],
  "comparable_titles": [{"title": "...", "reason": "..."}],
  "engagement_level": "...",
  "stakes_scale": "..."
}`;
}

const SYSTEM_PROMPTS: Record<Variant, string> = {
  v1: buildSystemPromptV1(),
  v2: buildSystemPromptV2(),
  v3: buildSystemPromptV3(),
};

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

interface V3Output {
  themes: ThemeOut[];
  tone: string[];
  narrative_mode: string;
  subtextual_themes: string[];
  comparable_titles: ComparableTitle[];
  engagement_level: string;
  stakes_scale: string;
}

function buildUserPrompt(title: TitleRow, variant: Variant): string {
  const yearPart = title.release_year ? ` (${title.release_year})` : '';
  const intro = `Title: ${title.title}${yearPart}
Medium: ${title.media_type}
Synopsis: ${title.synopsis ?? '(no synopsis available)'}`;
  if (variant === 'v3') {
    return `${intro}

Produce the full JSON output per the schema above. Return JSON only.`;
  }
  return `${intro}

Identify 3-7 core themes from the vocabulary. Return JSON.`;
}

async function extractRaw(model: string, variant: Variant, title: TitleRow): Promise<string> {
  const userPrompt = buildUserPrompt(title, variant);
  const response = await anthropic.messages.create({
    model,
    max_tokens: variant === 'v3' ? 1600 : 600,
    system: SYSTEM_PROMPTS[variant],
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

function parseThemes(parsed: unknown): ThemeOut[] {
  if (!parsed || typeof parsed !== 'object') return [];
  const themes = (parsed as { themes?: unknown }).themes;
  if (!Array.isArray(themes)) return [];
  return themes
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
}

function parseV3(parsed: unknown): V3Output | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  const themes = parseThemes(parsed);
  const tone = Array.isArray(obj.tone)
    ? (obj.tone as unknown[]).filter((t): t is string => typeof t === 'string')
    : [];
  const subtextual = Array.isArray(obj.subtextual_themes)
    ? (obj.subtextual_themes as unknown[]).filter((t): t is string => typeof t === 'string')
    : [];
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
    tone,
    narrative_mode: typeof obj.narrative_mode === 'string' ? obj.narrative_mode : '',
    subtextual_themes: subtextual,
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

function formatV3(v3: V3Output | null, indent: string): string {
  if (!v3) return `${indent}(parse failed)`;
  const cmpLines = v3.comparable_titles.map(
    (c) => `${indent}             - ${c.title} — ${c.reason}`,
  );
  const subLines = v3.subtextual_themes.map((s) => `${indent}             - "${s}"`);
  return [
    `${indent}themes:      ${formatThemes(v3.themes)}`,
    `${indent}tone:        [${v3.tone.join(', ')}]`,
    `${indent}mode:        ${v3.narrative_mode}`,
    `${indent}subtextual:`,
    ...(subLines.length > 0 ? subLines : [`${indent}             (none)`]),
    `${indent}comparable:`,
    ...(cmpLines.length > 0 ? cmpLines : [`${indent}             (none)`]),
    `${indent}engagement:  ${v3.engagement_level}`,
    `${indent}stakes:      ${v3.stakes_scale}`,
  ].join('\n');
}

interface CallResult {
  model: ModelKey;
  variant: Variant;
  raw: string;
  durationMs: number;
  error: string | null;
}

async function runOne(model: ModelKey, variant: Variant, title: TitleRow): Promise<CallResult> {
  const t0 = Date.now();
  try {
    const raw = await extractRaw(MODELS[model], variant, title);
    return { model, variant, raw, durationMs: Date.now() - t0, error: null };
  } catch (e) {
    return {
      model,
      variant,
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
  log(`Stage 0 — extraction comparison`);
  log(`Models: Haiku 4.5, Sonnet 4.6, Opus 4.7`);
  log(`Variants: V1 (current prod), V2 (+prior knowledge), V3 (+6 new fields)`);
  log(`Titles: ${TITLES_TO_COMPARE.length}`);
  log(`Started ${new Date().toISOString()}`);

  let totalCalls = 0;
  let totalErrors = 0;
  const tStart = Date.now();

  for (const titleName of TITLES_TO_COMPARE) {
    // Case-insensitive exact match — accommodates "One-Punch Man" vs "One Punch Man"
    // style variation while staying deterministic. Prefer the row with the most
    // existing themes (the one prod ran against), then highest popularity.
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

    // 9 calls in parallel (3 models × 3 variants).
    const calls: Promise<CallResult>[] = [];
    for (const variant of VARIANTS) {
      for (const model of MODEL_ORDER) {
        calls.push(runOne(model, variant, title));
      }
    }
    const t0 = Date.now();
    const results = await Promise.all(calls);
    const titleSec = ((Date.now() - t0) / 1000).toFixed(1);
    totalCalls += results.length;
    totalErrors += results.filter((r) => r.error).length;

    const byVariant: Record<Variant, Partial<Record<ModelKey, CallResult>>> = {
      v1: {},
      v2: {},
      v3: {},
    };
    for (const r of results) byVariant[r.variant][r.model] = r;

    for (const variant of VARIANTS) {
      log(`\n--- ${VARIANT_LABEL[variant]} ---`);
      for (const model of MODEL_ORDER) {
        const r = byVariant[variant][model];
        const modelLabel = model.padEnd(7);
        if (!r) {
          log(`${modelLabel}: (no result)`);
          continue;
        }
        if (r.error) {
          log(`${modelLabel}: ERROR — ${r.error}`);
          continue;
        }
        const parsed = parseJson(r.raw);
        if (variant === 'v3') {
          const v3 = parseV3(parsed);
          log(`${modelLabel}:`);
          log(formatV3(v3, '         '));
        } else {
          const themes = parseThemes(parsed);
          log(`${modelLabel}: ${formatThemes(themes)}`);
        }
      }
    }
    log(`\n(title took ${titleSec}s for 9 parallel calls)`);
  }

  const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);
  log(`\n\n${'='.repeat(80)}`);
  log(`Run summary: ${totalCalls} total calls, ${totalErrors} errors, ${elapsed}s wall time`);
  log(`${'='.repeat(80)}`);

  const outPath = join(__dirname, `compare-output-${Date.now()}.txt`);
  writeFileSync(outPath, output.join('\n'));
  console.log(`\nFull output saved to: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
