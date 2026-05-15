// V4 content-descriptor extraction. Per ADR-0025 / ADR-0026 / ADR-0027.
//
// Reframed from "what is this work about" (V1) to "WHY a viewer would
// enjoy this" (V4). Eight output fields:
//   1. themes              — closed-vocab (V1 carryover)
//   2. viewer_pleasures    — open-vocab surface pleasures (NEW, load-bearing)
//   3. tone                — open-vocab tonal descriptors
//   4. narrative_mode      — enum
//   5. subtextual_themes   — open-vocab depth (optional, may be empty)
//   6. comparable_titles   — 3-5 cross-medium analogues with reasons
//   7. engagement_level    — enum (low | medium | high)
//   8. stakes_scale        — enum (interpersonal | community | national | civilizational | cosmic)
//
// Default model: Claude Sonnet 4.6. Haiku misses cultural-knowledge depth
// for well-known works (Stage 0 finding); the ~5x cost premium for Sonnet
// is justified given extraction quality is the moat (PROJECT.md §moats).
//
// Persistence touches three tables per ADR-0026:
//   - title_themes               (existing — DELETE-then-INSERT for the title)
//   - title_descriptors          (new, 1:1)
//   - title_comparable_titles    (new, N:1, with FK resolution at extraction)
//
// The DELETE-then-INSERT pattern (ADR-0026 Option B) is destructive of
// history but keeps the read path simple. Per the ADR: re-extraction
// always reflects the current model + prompt; we don't preserve prior
// extractions, accepting that history loss is OK because we can re-run
// V1 if needed (Stage 0 scripts saved).
//
// Cost shape: system prompt (~2000 tokens with the richer V4 instructions)
// cached as ephemeral so repeated calls within 5 min pay ~10% input cost.
// Per-call: ~$0.02 on Sonnet (1500/600 input/output). Full ~3k-title
// catalog re-extraction: $30-60 one-shot.

import Anthropic from '@anthropic-ai/sdk';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';
import { THEME_VOCABULARY, THEME_SLUGS, labelForSlug } from './vocabulary';

type SqlBinding = NeonQueryFunction<false, false>;

export const EXTRACT_MODEL = 'claude-sonnet-4-6';
export const PROMPT_VERSION = 'v4.0';

const NARRATIVE_MODES = new Set([
  'plays-straight',
  'deconstructs',
  'parodies',
  'reinvents',
  'hybrid',
]);
const ENGAGEMENT_LEVELS = new Set(['low', 'medium', 'high']);
const STAKES_SCALES = new Set([
  'interpersonal',
  'community',
  'national',
  'civilizational',
  'cosmic',
]);

export interface CandidateTitle {
  readonly id: string;
  readonly title: string;
  readonly mediaType: 'tv' | 'film' | 'anime';
  readonly synopsis: string | null;
  readonly releaseYear: number | null;
}

export interface ExtractedTheme {
  readonly slug: string;
  readonly confidence: number;
}

export interface ExtractedComparable {
  readonly title: string;
  readonly reason: string;
}

// The full V4 output for one title. Persisted across three tables.
export interface ExtractedDescriptors {
  readonly themes: ReadonlyArray<ExtractedTheme>;
  readonly viewerPleasures: ReadonlyArray<string>;
  readonly tone: ReadonlyArray<string>;
  readonly narrativeMode: string;
  readonly subtextualThemes: ReadonlyArray<string>;
  readonly comparableTitles: ReadonlyArray<ExtractedComparable>;
  readonly engagementLevel: string;
  readonly stakesScale: string;
}

function buildSystemPrompt(): string {
  const vocabLines = THEME_VOCABULARY.map((t) => `- ${t.slug}: ${t.hint}`).join('\n');
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

6. "comparable_titles": 3-5 other works (any medium — film, TV, anime, novel) that share core APPEAL with this one. Match on the SHARED WHY-YOU-ENJOY-IT, not just shared subject matter. Each: {"title": "...", "reason": "one short phrase explaining the SHARED APPEAL"}. Cross-medium comparisons especially valued. Only list works you genuinely know.

7. "engagement_level": one of "low" | "medium" | "high". How much active attention the work demands. Low = good background watch; high = demands full focus.

8. "stakes_scale": exactly one of "interpersonal" | "community" | "national" | "civilizational" | "cosmic". The PRIMARY DRAMATIC stakes — where the work invests emotional weight, NOT where its plot action takes place. The Good Place is interpersonal even though it's set in the cosmos. OPM is interpersonal even though Boros is shattering a city.

Controlled vocabulary for "themes" only:
${vocabLines}

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

function buildUserPrompt(title: CandidateTitle): string {
  const yearPart = title.releaseYear ? ` (${title.releaseYear})` : '';
  return `Title: ${title.title}${yearPart}
Medium: ${title.mediaType}
Synopsis: ${title.synopsis ?? '(no synopsis available)'}

Produce the full JSON output per the schema above. Return JSON only.`;
}

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey });
}

// Defensive parse — every field defended against malformed / partial output.
// Returns null only when there is genuinely nothing usable; partial outputs
// (e.g. missing comparable_titles) still produce a valid descriptor with
// empty arrays where data is missing.
function parseRaw(raw: string): ExtractedDescriptors | null {
  const openIdx = raw.indexOf('{');
  const closeIdx = raw.lastIndexOf('}');
  if (openIdx === -1 || closeIdx === -1 || closeIdx < openIdx) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(openIdx, closeIdx + 1));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;

  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? (v as unknown[]).filter((s): s is string => typeof s === 'string') : [];

  const themesRaw = Array.isArray(obj.themes) ? (obj.themes as unknown[]) : [];
  const themes = themesRaw
    .filter(
      (t): t is ExtractedTheme =>
        typeof t === 'object' &&
        t !== null &&
        typeof (t as ExtractedTheme).slug === 'string' &&
        typeof (t as ExtractedTheme).confidence === 'number' &&
        THEME_SLUGS.has((t as ExtractedTheme).slug) &&
        (t as ExtractedTheme).confidence >= 0.5,
    )
    .map((t) => ({ slug: t.slug, confidence: t.confidence }));

  const cmpRaw = Array.isArray(obj.comparable_titles) ? (obj.comparable_titles as unknown[]) : [];
  const comparableTitles = cmpRaw
    .filter(
      (c): c is ExtractedComparable =>
        typeof c === 'object' &&
        c !== null &&
        typeof (c as ExtractedComparable).title === 'string' &&
        typeof (c as ExtractedComparable).reason === 'string',
    )
    .map((c) => ({ title: c.title.trim(), reason: c.reason.trim() }));

  // Default enum values where the model produced something invalid. Keep
  // the extraction as a partial-success rather than throwing it away — the
  // closed-vocab themes alone are still useful even if the enum slipped.
  // Validation enforces only that the value is in-set when present.
  const narrativeMode =
    typeof obj.narrative_mode === 'string' && NARRATIVE_MODES.has(obj.narrative_mode)
      ? obj.narrative_mode
      : 'plays-straight';
  const engagementLevel =
    typeof obj.engagement_level === 'string' && ENGAGEMENT_LEVELS.has(obj.engagement_level)
      ? obj.engagement_level
      : 'medium';
  const stakesScale =
    typeof obj.stakes_scale === 'string' && STAKES_SCALES.has(obj.stakes_scale)
      ? obj.stakes_scale
      : 'interpersonal';

  return {
    themes,
    viewerPleasures: strArr(obj.viewer_pleasures).map((s) => s.trim()),
    tone: strArr(obj.tone).map((s) => s.trim()),
    narrativeMode,
    subtextualThemes: strArr(obj.subtextual_themes).map((s) => s.trim()),
    comparableTitles,
    engagementLevel,
    stakesScale,
  };
}

// One extraction call. Throws on API error so callers can decide retry vs
// skip policy. System prompt cached for the 5-min ephemeral window.
//
// max_tokens raised to 2000 to accommodate the richer V4 schema. Typical
// output is 800-1200 tokens; the headroom protects against truncation on
// titles with rich comparable_titles lists.
export async function extractForTitle(
  title: CandidateTitle,
  client: Anthropic = getAnthropicClient(),
): Promise<ExtractedDescriptors | null> {
  const response = await client.messages.create({
    model: EXTRACT_MODEL,
    max_tokens: 2000,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: buildUserPrompt(title) }],
  });

  const block = response.content[0];
  if (!block || block.type !== 'text') return null;
  return parseRaw(block.text);
}

// Persist a V4 extraction across the three tables in a per-title
// transaction. DELETE-then-INSERT for title_themes and title_comparable_titles
// (ADR-0026 Option B — destructive UPSERT, no history retention); UPSERT
// for title_descriptors (1:1 — same row updated in place).
//
// FK resolution for comparable titles: case-insensitive match against
// titles.title. Single-statement bulk lookup keeps the round-trips bounded
// to one regardless of comparable count.
export async function persistDescriptors(
  titleId: string,
  d: ExtractedDescriptors,
  sqlBinding: SqlBinding = neon(process.env.DATABASE_URL!),
): Promise<void> {
  // Resolve referenced_title strings to titles.id via case-insensitive
  // exact match. Single query for all comparables on this title.
  const comparableStrings = d.comparableTitles.map((c) => c.title);
  type ResolvedRow = { title: string; id: string };
  let resolved: ResolvedRow[] = [];
  if (comparableStrings.length > 0) {
    resolved = (await sqlBinding`
      SELECT title, id
      FROM titles
      WHERE LOWER(title) = ANY(${comparableStrings.map((s) => s.toLowerCase())}::text[])
    `) as ResolvedRow[];
  }
  // Build a case-insensitive lookup. If multiple titles share the same
  // (lowercased) name — e.g. anime vs film of the same name — we pick the
  // first match and rely on the catalog-broaden script to keep duplicates
  // rare. Fuzzier resolution is Phase 2 (pgvector per ADR-0006).
  const resolvedMap = new Map<string, string>();
  for (const r of resolved) {
    const key = r.title.toLowerCase();
    if (!resolvedMap.has(key)) resolvedMap.set(key, r.id);
  }

  // Per-title transaction: themes + descriptors + comparables. Neon's
  // serverless driver supports tagged-template transactions via the
  // .transaction([...]) API. For clarity we sequence the writes; if a
  // step fails the caller's catch handler treats the title as failed.
  //
  // Note on ordering: descriptors UPSERT goes first so a partial failure
  // mid-write leaves at least a row identifiable by source_model /
  // prompt_version. Themes and comparables are DELETE-then-INSERT for
  // the title (Option B per ADR-0026), idempotent.

  // 1. UPSERT title_descriptors (1:1 with title).
  await sqlBinding`
    INSERT INTO title_descriptors (
      title_id, viewer_pleasures, tone, subtextual_themes,
      narrative_mode, engagement_level, stakes_scale,
      source_model, prompt_version, extracted_at
    ) VALUES (
      ${titleId},
      ${d.viewerPleasures}::text[],
      ${d.tone}::text[],
      ${d.subtextualThemes}::text[],
      ${d.narrativeMode},
      ${d.engagementLevel},
      ${d.stakesScale},
      ${EXTRACT_MODEL},
      ${PROMPT_VERSION},
      NOW()
    )
    ON CONFLICT (title_id) DO UPDATE SET
      viewer_pleasures = EXCLUDED.viewer_pleasures,
      tone = EXCLUDED.tone,
      subtextual_themes = EXCLUDED.subtextual_themes,
      narrative_mode = EXCLUDED.narrative_mode,
      engagement_level = EXCLUDED.engagement_level,
      stakes_scale = EXCLUDED.stakes_scale,
      source_model = EXCLUDED.source_model,
      prompt_version = EXCLUDED.prompt_version,
      extracted_at = NOW()
  `;

  // 2. DELETE existing title_themes, then INSERT new (Option B).
  //    DELETE handles the "V4 produces fewer themes than V1 left behind"
  //    case — stale rows can't linger past a re-extraction.
  await sqlBinding`DELETE FROM title_themes WHERE title_id = ${titleId}`;
  for (const t of d.themes) {
    const label = labelForSlug(t.slug) ?? t.slug;
    await sqlBinding`
      INSERT INTO title_themes (title_id, theme_slug, label, confidence, source, prompt_version, updated_at)
      VALUES (${titleId}, ${t.slug}, ${label}, ${t.confidence}, ${EXTRACT_MODEL}, ${PROMPT_VERSION}, NOW())
    `;
  }

  // 3. DELETE existing title_comparable_titles, then INSERT new.
  await sqlBinding`DELETE FROM title_comparable_titles WHERE title_id = ${titleId}`;
  for (let i = 0; i < d.comparableTitles.length; i += 1) {
    const c = d.comparableTitles[i]!;
    const refId = resolvedMap.get(c.title.toLowerCase()) ?? null;
    await sqlBinding`
      INSERT INTO title_comparable_titles (
        title_id, position, referenced_title, referenced_title_id, reason,
        source_model, prompt_version, extracted_at
      ) VALUES (
        ${titleId}, ${i}, ${c.title}, ${refId}, ${c.reason},
        ${EXTRACT_MODEL}, ${PROMPT_VERSION}, NOW()
      )
    `;
  }
}

// Process one title end-to-end: extract + persist. Per-title errors are
// caught so one bad title doesn't kill the batch. Returns a structured
// summary the Inngest function can roll up.
export async function processCandidate(
  candidate: CandidateTitle,
  client: Anthropic = getAnthropicClient(),
  sqlBinding: SqlBinding = neon(process.env.DATABASE_URL!),
): Promise<{
  ok: boolean;
  empty: boolean;
  slugs: string[];
  resolvedComparables: number;
  totalComparables: number;
  error?: string;
}> {
  try {
    const d = await extractForTitle(candidate, client);
    if (!d) {
      return { ok: false, empty: true, slugs: [], resolvedComparables: 0, totalComparables: 0 };
    }
    await persistDescriptors(candidate.id, d, sqlBinding);
    // The persist function does the FK resolution; report the count as a
    // health signal so an outlier extraction (most strings unresolved)
    // surfaces in the batch summary.
    const total = d.comparableTitles.length;
    let resolved = 0;
    if (total > 0) {
      const lookup = (await sqlBinding`
        SELECT COUNT(*)::int AS n FROM title_comparable_titles
        WHERE title_id = ${candidate.id} AND referenced_title_id IS NOT NULL
      `) as Array<{ n: number }>;
      resolved = lookup[0]?.n ?? 0;
    }
    return {
      ok: d.themes.length > 0 || d.viewerPleasures.length > 0,
      empty: d.themes.length === 0 && d.viewerPleasures.length === 0,
      slugs: d.themes.map((t) => t.slug),
      resolvedComparables: resolved,
      totalComparables: total,
    };
  } catch (e) {
    return {
      ok: false,
      empty: false,
      slugs: [],
      resolvedComparables: 0,
      totalComparables: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
