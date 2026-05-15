// Cross-medium theme bridges — find candidates of (presumed-opposite) medium
// that share *thematic* signal with a source title via the cross-medium
// theme taxonomy.
//
// This is the read surface for the moat from PROJECT.md §moats: "cross-medium
// theme-based taxonomy." The recommendation engine already uses theme bridges
// silently during personalised ranking (see recommendation.ts §JSDoc on
// recommendForUser). This function exposes the same signal as a per-title,
// taste-agnostic query — so anyone landing on Breaking Bad gets pointed at
// the anime with the same themes, with or without a user account.
//
// The function does NOT filter candidates by mediaType. The caller passes
// in the candidate set it wants scored — typically opposite-medium-only
// (TV/film source → anime candidates; anime source → TV/film candidates),
// but the scoring logic doesn't require it. Keeping the medium-filter at
// the caller keeps packages/ml free of mediaType concepts (per
// packages/ml/CLAUDE.md — no DB schema leaks here).
//
// Scoring rule:
//   For each candidate tag NOT in source's tag set, walk its theme
//   memberships; for each theme that the source's own tags also bridge
//   into, accumulate
//      themeWeight × tag.weight × strength/100
//   where themeWeight is the source's projection onto that theme. This
//   mirrors scoreCandidate's cross-medium-only rule (a tag already in the
//   "taste" — here, the source title — scores via direct overlap, NOT via
//   theme; theme bridges only fire for tags absent from the source).
//
// Candidates with zero theme contribution are EXCLUDED. The function's
// contract is "show me things that bridge to this title" — a candidate
// with high direct tag overlap and zero theme overlap is "more of the
// same medium," not a bridge, and shouldn't appear here even if scored.
//
// Per packages/ml/CLAUDE.md §performance: ranking matters, scores don't.
// Stable tie-break on titleId so output is deterministic.

import type { TagThemeMembership, TitleTagSet, UserTasteVector } from './recommendation';
import { buildTagThemeIndex, buildTasteTheme } from './scoring';

const DEFAULT_LIMIT = 6;

/** A single cross-medium bridge result. `bridgedThemes` lists the themes
 * that connected source → candidate, so UX copy can say "shares your
 * tragedy + antihero themes" rather than just dropping a card.
 *
 * `bridgedThemes` is sorted by contribution descending so callers can pick
 * the top-1 / top-2 themes for tight copy spaces. Ties broken by themeId
 * ASC for determinism. */
export interface CrossMediumBridge {
  readonly titleId: string;
  readonly score: number;
  readonly bridgedThemes: ReadonlyArray<{
    readonly themeId: string;
    /** Contribution of this theme to the bridge score. */
    readonly contribution: number;
  }>;
}

/**
 * Return the top-N candidates whose theme membership bridges to the source
 * title. Caller is responsible for filtering candidates to the desired
 * opposite medium and for excluding the source title from the candidate
 * pool.
 *
 * Candidates with zero theme overlap are removed from the result entirely
 * (not returned with score 0) — the contract is "things that bridge to
 * this title," so a same-medium near-duplicate with no bridge themes is
 * not a valid result.
 *
 * Ranking: score DESC, then titleId ASC (mirrors recommendForUser).
 *
 * `limit <= 0` returns an empty array (mirrors recommendForUser).
 */
export function findCrossMediumBridges(
  sourceTitle: TitleTagSet,
  candidates: ReadonlyArray<TitleTagSet>,
  themeMembership: ReadonlyArray<TagThemeMembership>,
  limit: number = DEFAULT_LIMIT,
): ReadonlyArray<CrossMediumBridge> {
  const tagThemes = buildTagThemeIndex(themeMembership);

  // Treat the source title as if it were a "taste vector" — each of its
  // tags contributes its weight. Then project onto themes. Identical
  // pipeline to a real user's taste, just with one title as input.
  const sourceTaste: UserTasteVector = new Map(sourceTitle.tags.map((t) => [t.tagId, t.weight]));
  const sourceTheme = buildTasteTheme(sourceTaste, tagThemes);

  if (sourceTheme.size === 0) {
    // Source title has no theme membership at all (no bridgeable tags).
    // Nothing to score against — return empty rather than emit garbage.
    return [];
  }

  const results: CrossMediumBridge[] = [];

  for (const candidate of candidates) {
    let bridgeScore = 0;
    const themeContrib = new Map<string, number>();

    for (const tag of candidate.tags) {
      // Cross-medium-only rule: a tag already in the source's tag set
      // scores via direct overlap in the standard rec engine, NOT here.
      // Bridges only fire for tags ABSENT from the source.
      if (sourceTaste.has(tag.tagId)) continue;

      const memberships = tagThemes.get(tag.tagId);
      if (!memberships) continue;

      for (const m of memberships) {
        const themeWeight = sourceTheme.get(m.themeId);
        if (themeWeight === undefined) continue;
        const contribution = themeWeight * tag.weight * (m.strength / 100);
        bridgeScore += contribution;
        themeContrib.set(m.themeId, (themeContrib.get(m.themeId) ?? 0) + contribution);
      }
    }

    if (bridgeScore <= 0) continue;

    const bridgedThemes = Array.from(themeContrib.entries())
      .map(([themeId, contribution]) => ({ themeId, contribution }))
      .sort((a, b) => {
        if (a.contribution !== b.contribution) return b.contribution - a.contribution;
        return a.themeId.localeCompare(b.themeId);
      });

    results.push({
      titleId: candidate.titleId,
      score: bridgeScore,
      bridgedThemes,
    });
  }

  results.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.titleId.localeCompare(b.titleId);
  });

  return results.slice(0, Math.max(0, limit));
}
