// Internal scoring kernel — shared between recommendForUser,
// recommendForGroup, and the explanation/transparency layer. Kept as
// its own module so all three surfaces are guaranteed to compute
// scores identically (drift between scoring and explaining would
// produce contradictory UX — "explained as A but actually scored
// via B"). Single source of truth.
//
// Not exported from packages/ml's public index — these helpers are
// internal to the package, callers use recommendForUser /
// recommendForGroup / explainGroupRecommendation.

import type {
  FacetTasteVector,
  TagThemeMembership,
  TitleFacetSet,
  TitleTagSet,
  UserTasteVector,
} from './recommendation';

/** tagId → list of (themeId, strength) memberships. Built once per
 * scoring call so per-candidate iteration is O(1) per tag. */
export type TagThemeIndex = ReadonlyMap<
  string,
  ReadonlyArray<{ themeId: string; strength: number }>
>;

/** themeId → aggregate user weight (taste vector projected onto the
 * theme axis). Built per-user, used at score time to credit cross-medium
 * bridges. */
export type TasteThemeVector = ReadonlyMap<string, number>;

/**
 * Index theme membership rows for O(1) lookup at score time. Shared
 * across single-user, group, and explanation scoring so the cross-medium
 * rule stays consistent.
 */
export function buildTagThemeIndex(
  themeMembership: ReadonlyArray<TagThemeMembership>,
): TagThemeIndex {
  const index = new Map<string, Array<{ themeId: string; strength: number }>>();
  for (const m of themeMembership) {
    let memberships = index.get(m.tagId);
    if (!memberships) {
      memberships = [];
      index.set(m.tagId, memberships);
    }
    memberships.push({ themeId: m.themeId, strength: m.strength });
  }
  return index;
}

/**
 * Project a user's tag-level taste onto the theme axis. For each tag in
 * their taste, accumulate weighted credit to every theme that tag
 * belongs to. The result is the user's "theme taste" — which cross-medium
 * bridges they're likely to value.
 */
export function buildTasteTheme(
  taste: UserTasteVector,
  tagThemes: TagThemeIndex,
): TasteThemeVector {
  const tasteTheme = new Map<string, number>();
  for (const [tagId, tasteWeight] of taste) {
    const memberships = tagThemes.get(tagId);
    if (!memberships) continue;
    for (const m of memberships) {
      tasteTheme.set(
        m.themeId,
        (tasteTheme.get(m.themeId) ?? 0) + tasteWeight * (m.strength / 100),
      );
    }
  }
  return tasteTheme;
}

/**
 * Score one candidate against one user's taste. Combines:
 *
 *   1. Direct tag-overlap (AniList/TMDB tags)
 *   2. Cross-medium theme bridge (tag→theme→tag, for anime↔TV matching)
 *   3. Facet overlap (LLM-extracted vocabulary slugs × user's facet vector)
 *
 * The facet term is weighted by `facetWeight` (default 0.4) so it acts as
 * a secondary discovery signal rather than competing with direct tag overlap.
 * Tune upward for more adventurous recommendations, downward for safer ones.
 *
 * Facet scoring rule: for each slug on the candidate, if the user's facet
 * vector has a weight for that slug, accumulate `facetWeight × slugWeight ×
 * confidence`. Negative facet weights (from dislike picks) subtract, pushing
 * candidates with those facets down the ranking.
 *
 * recommendForUser calls this once per candidate; recommendForGroup
 * calls it once per (member × candidate).
 */
export function scoreCandidate(
  taste: UserTasteVector,
  candidate: TitleTagSet,
  tagThemes: TagThemeIndex,
  tasteTheme: TasteThemeVector,
  candidateFacets: TitleFacetSet | undefined = undefined,
  facetVector: FacetTasteVector = new Map(),
  facetWeight: number = 0.4,
): number {
  let score = 0;

  for (const tag of candidate.tags) {
    const tasteWeight = taste.get(tag.tagId);
    if (tasteWeight !== undefined) {
      // Direct tag match — score via tag-overlap, skip theme dimension
      // for this tag (cross-medium-only rule).
      score += tasteWeight * tag.weight;
      continue;
    }
    // No direct match — check if this tag bridges to a theme the user
    // has signal in. Sums across themes if the tag is multi-membered.
    const memberships = tagThemes.get(tag.tagId);
    if (!memberships) continue;
    for (const m of memberships) {
      const themeWeight = tasteTheme.get(m.themeId);
      if (themeWeight === undefined) continue;
      score += themeWeight * tag.weight * (m.strength / 100);
    }
  }

  // Facet term — secondary signal, weighted down relative to tag overlap.
  // An empty facetVector or missing candidateFacets produces zero contribution,
  // making this term backward-compatible with callers that don't pass facets.
  if (candidateFacets && facetVector.size > 0) {
    for (const f of candidateFacets.facets) {
      const userFacetWeight = facetVector.get(f.slug);
      if (userFacetWeight === undefined) continue;
      score += facetWeight * userFacetWeight * f.confidence;
    }
  }

  return score;
}
