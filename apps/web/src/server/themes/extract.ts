// Shared theme-extraction logic. Used by both the standalone script
// (scripts/extract-themes.ts) and the Inngest function
// (src/inngest/functions/extract-themes.ts).
//
// Why a shared module: the extraction prompt + parsing + persistence
// are non-trivial and we don't want two copies drifting. The script
// path is kept for local one-offs and smoke runs; the Inngest path is
// the durable production path.
//
// Cost shape: the system prompt embeds the full controlled vocabulary
// (~1500 tokens), reused identically for every call. We send it as a
// cacheable block so the second-onwards calls within the 5-minute
// ephemeral cache window pay 10% of normal input cost. Estimated
// full-catalog (~5800 titles) input cost drops from ~$10 to ~$2.

import Anthropic from '@anthropic-ai/sdk';
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// Concrete neon binding type. `ReturnType<typeof neon>` widens to
// `<boolean, boolean>` and conflicts with the `<false, false>` that
// callers actually produce — using the literal generic matches the
// call sites and keeps strict-mode TypeScript happy.
type SqlBinding = NeonQueryFunction<false, false>;
import { THEME_VOCABULARY, THEME_SLUGS, labelForSlug } from './vocabulary';

export const EXTRACT_MODEL = 'claude-haiku-4-5-20251001';

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

function buildSystemPrompt(): string {
  const vocabLines = THEME_VOCABULARY.map((t) => `- ${t.slug}: ${t.hint}`).join('\n');
  return `You analyse film, TV, and anime synopses to identify their core THEMES.

You must return ONLY themes drawn from this controlled vocabulary. Do not invent new slugs. Pick 3 to 7 themes per title — the ones that genuinely capture what the work is about. Skip demographic descriptors entirely (we already have those).

When a title genuinely doesn't fit any vocabulary theme, return an empty array — better empty than wrong.

Confidence values: 0.9-1.0 = central to the work; 0.7-0.89 = clearly present; 0.5-0.69 = present but secondary; below 0.5 = don't include.

Controlled vocabulary (slug: hint):
${vocabLines}

Return JSON only, no prose. Shape: {"themes":[{"slug":"...","confidence":0.0}]}`;
}

const SYSTEM_PROMPT = buildSystemPrompt();

function buildUserPrompt(title: CandidateTitle): string {
  const yearPart = title.releaseYear ? ` (${title.releaseYear})` : '';
  return `Title: ${title.title}${yearPart}
Medium: ${title.mediaType}
Synopsis: ${title.synopsis ?? '(no synopsis available)'}

Identify 3-7 core themes from the vocabulary. Return JSON.`;
}

interface AnthropicResponse {
  themes: Array<{ slug: string; confidence: number }>;
}

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');
  return new Anthropic({ apiKey });
}

// One extraction call. Throws on API error so callers can decide retry
// vs skip policy. Prompt-caches the system block so repeated calls in
// the same 5-min window pay ~10% input cost. The assistant prefill `{`
// forces JSON-only output (no preamble or markdown fence).
export async function extractForTitle(
  title: CandidateTitle,
  client: Anthropic = getAnthropicClient(),
): Promise<ExtractedTheme[]> {
  const response = await client.messages.create({
    model: EXTRACT_MODEL,
    max_tokens: 400,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      { role: 'user', content: buildUserPrompt(title) },
      { role: 'assistant', content: '{' },
    ],
  });

  const block = response.content[0];
  if (!block || block.type !== 'text') return [];
  const raw = '{' + block.text;
  let parsed: AnthropicResponse;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // The model occasionally trails with a stray comment or markdown
    // fence. Strip everything after the closing brace and retry once.
    const closeIdx = raw.lastIndexOf('}');
    if (closeIdx === -1) return [];
    try {
      parsed = JSON.parse(raw.slice(0, closeIdx + 1));
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed.themes)) return [];

  return parsed.themes
    .filter(
      (t): t is { slug: string; confidence: number } =>
        typeof t.slug === 'string' &&
        typeof t.confidence === 'number' &&
        THEME_SLUGS.has(t.slug) &&
        t.confidence >= 0.5,
    )
    .map((t) => ({ slug: t.slug, confidence: t.confidence }));
}

// Idempotent upsert: ON CONFLICT REPLACE so re-extraction with a newer
// model overwrites cleanly. Empty `themes` is a no-op (we don't write
// blank rows — absence in title_themes means "not extracted yet").
export async function persistThemes(
  titleId: string,
  themes: ExtractedTheme[],
  // Caller can pass its own sql binding (e.g. neon driver in a script
  // context, drizzle's neon-backed db in app context). Default uses the
  // process env DATABASE_URL — the common case.
  sqlBinding: SqlBinding = neon(process.env.DATABASE_URL!),
): Promise<void> {
  if (themes.length === 0) return;
  for (const t of themes) {
    const label = labelForSlug(t.slug) ?? t.slug;
    await sqlBinding`
      INSERT INTO title_themes (title_id, theme_slug, label, confidence, source)
      VALUES (${titleId}, ${t.slug}, ${label}, ${t.confidence}, ${EXTRACT_MODEL})
      ON CONFLICT (title_id, theme_slug)
      DO UPDATE SET
        label = EXCLUDED.label,
        confidence = EXCLUDED.confidence,
        source = EXCLUDED.source
    `;
  }
}

// Process one title end-to-end (extract + persist), returning whether
// it produced themes, was empty, or failed. Errors are caught so a
// single bad title doesn't take down a batch. The shape mirrors
// processTmdbTvShow's "log-and-continue" stance in tmdb-sync.ts.
export async function processCandidate(
  candidate: CandidateTitle,
  client: Anthropic = getAnthropicClient(),
  sqlBinding: SqlBinding = neon(process.env.DATABASE_URL!),
): Promise<{ ok: boolean; empty: boolean; slugs: string[]; error?: string }> {
  try {
    const themes = await extractForTitle(candidate, client);
    await persistThemes(candidate.id, themes, sqlBinding);
    return {
      ok: themes.length > 0,
      empty: themes.length === 0,
      slugs: themes.map((t) => t.slug),
    };
  } catch (e) {
    return {
      ok: false,
      empty: false,
      slugs: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
