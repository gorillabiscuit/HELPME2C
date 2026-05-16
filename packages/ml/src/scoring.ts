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

import type { ExplanationReason } from './explain';
import type {
  ComparableEdge,
  TagThemeMembership,
  TitleTagSet,
  UserTasteVector,
  V4Descriptor,
  V4TasteVector,
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
 * Score one candidate against one user's taste. Combines direct
 * tag-overlap with the cross-medium-only theme bridge (a tag the user
 * has direct signal in scores via tag-overlap ONLY; the theme dimension
 * fires only for tags absent from taste — see the JSDoc on
 * recommendForUser for the full rule).
 *
 * recommendForUser calls this once per candidate; recommendForGroup
 * calls it once per (member × candidate); explainGroupRecommendation
 * calls a parallel breakdown variant for the same candidate.
 */
export function scoreCandidate(
  taste: UserTasteVector,
  candidate: TitleTagSet,
  tagThemes: TagThemeIndex,
  tasteTheme: TasteThemeVector,
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
  return score;
}

// ---------------------------------------------------------------------------
// V4 scoring components — per ADR-0027.
//
// Three components additive to the V1 baseTagScore:
//   - themeScore     — user's V4-theme taste vector × candidate's themes,
//                      weighted by per-theme confidence.
//   - comparableScore — bidirectional walk on the resolved comparable graph,
//                      weighted by rating valence × position weight.
//   - enumFitScore   — user's preference distribution × candidate's enum value,
//                      summed across narrative_mode + engagement_level
//                      + stakes_scale.
//
// Initial weights are strawmen per ADR-0027 §what-we-chose. Tunable
// constants here. Reranking later may add normalisation or rank fusion;
// for Phase 1A linear combination is the debuggable starting point.
// ---------------------------------------------------------------------------

/** ADR-0027 weight β — V4 theme overlap (parity with base; this is the
 * moat signal). */
export const V4_THEME_WEIGHT = 1.0;
/** ADR-0027 weight γ — comparable-titles graph (powerful but resolution
 * rate is unknown until V4 runs at scale). */
export const V4_COMPARABLE_WEIGHT = 0.8;
/** ADR-0027 weight δ — enum fit (three coarse signals; sum earns the
 * small weight). */
export const V4_ENUM_WEIGHT = 0.3;

/** Position weights for the comparable-titles graph. Position 0 (top
 * comparable per the LLM's rank) carries full weight; later positions
 * decay linearly. This matches the LLM's intent that earlier-ranked
 * comparables are stronger matches. Indices 0..4 covered explicitly;
 * out-of-range positions fall back to the last weight. */
const COMPARABLE_POSITION_WEIGHTS: ReadonlyArray<number> = [1.0, 0.85, 0.7, 0.55, 0.4];

function positionWeight(position: number): number {
  if (position < 0) return COMPARABLE_POSITION_WEIGHTS[0]!;
  if (position >= COMPARABLE_POSITION_WEIGHTS.length) {
    return COMPARABLE_POSITION_WEIGHTS[COMPARABLE_POSITION_WEIGHTS.length - 1]!;
  }
  return COMPARABLE_POSITION_WEIGHTS[position]!;
}

/** Comparable-graph edge index: forward (from→edges) and reverse
 * (to→edges) for O(degree) lookups at score time. */
export interface ComparableEdgeIndex {
  readonly forward: ReadonlyMap<string, ReadonlyArray<ComparableEdge>>;
  readonly reverse: ReadonlyMap<string, ReadonlyArray<ComparableEdge>>;
}

/** Build the forward + reverse index for the comparable graph. Called
 * once per recommendForUser / recommendForGroup call. */
export function buildComparableEdgeIndex(
  edges: ReadonlyArray<ComparableEdge>,
): ComparableEdgeIndex {
  const forward = new Map<string, ComparableEdge[]>();
  const reverse = new Map<string, ComparableEdge[]>();
  for (const e of edges) {
    let f = forward.get(e.fromTitleId);
    if (!f) {
      f = [];
      forward.set(e.fromTitleId, f);
    }
    f.push(e);
    let r = reverse.get(e.toTitleId);
    if (!r) {
      r = [];
      reverse.set(e.toTitleId, r);
    }
    r.push(e);
  }
  return { forward, reverse };
}

/** Sum of (user theme weight × candidate theme confidence) over the
 * candidate's V4 themes. Negative user weights (from disliked titles
 * carrying this theme) actively subtract. */
function v4ThemeScore(v4Taste: V4TasteVector, descriptor: V4Descriptor): number {
  let score = 0;
  for (const t of descriptor.themes) {
    const userWeight = v4Taste.themesByWeight.get(t.slug);
    if (userWeight === undefined) continue;
    score += userWeight * t.confidence;
  }
  return score;
}

/** Bidirectional comparable-graph score. For each edge connecting the
 * candidate to a title the user has rated, contribute
 *   rating × positionWeight(edge.position)
 * Rating valence (positive vs negative) flows through — a user's
 * dislike of A penalises A's comparables. */
function v4ComparableScore(
  candidateTitleId: string,
  edgeIndex: ComparableEdgeIndex,
  userRatings: ReadonlyMap<string, number>,
): number {
  let score = 0;
  // Reverse: edges where toTitleId = candidate. fromTitleId may be rated.
  const inbound = edgeIndex.reverse.get(candidateTitleId);
  if (inbound) {
    for (const e of inbound) {
      const rating = userRatings.get(e.fromTitleId);
      if (rating === undefined || rating === 0) continue;
      score += rating * positionWeight(e.position);
    }
  }
  // Forward: edges where fromTitleId = candidate. toTitleId may be rated.
  const outbound = edgeIndex.forward.get(candidateTitleId);
  if (outbound) {
    for (const e of outbound) {
      const rating = userRatings.get(e.toTitleId);
      if (rating === undefined || rating === 0) continue;
      score += rating * positionWeight(e.position);
    }
  }
  return score;
}

/** Sum of user-preference for the candidate's enum value across the
 * three enum fields. Each contributes the user's accumulated weight for
 * that value. */
function v4EnumFitScore(v4Taste: V4TasteVector, descriptor: V4Descriptor): number {
  return (
    (v4Taste.modePref.get(descriptor.narrativeMode) ?? 0) +
    (v4Taste.engagementPref.get(descriptor.engagementLevel) ?? 0) +
    (v4Taste.stakesPref.get(descriptor.stakesScale) ?? 0)
  );
}

/**
 * Total V4 contribution for one candidate, computed as raw (unnormalised)
 * weighted sum. Used by the explanation layer (per-candidate breakdown
 * doesn't have access to the candidate set, so it can't normalise).
 *
 * The recommender's ranking path uses v4Components + normalisation
 * instead — see v4Components below and recommendForUser's two-pass
 * scoring loop. Per ADR-0027 Edit 2026-05-16, raw v4Score values are
 * three orders of magnitude smaller than V1 baseTagScore so they have
 * no influence on rankings unless normalised.
 *
 * Kept for backward compat + explanation use, NOT for ranking.
 */
export function v4Score(
  candidateTitleId: string,
  v4Taste: V4TasteVector | undefined,
  descriptor: V4Descriptor | undefined,
  userRatings: ReadonlyMap<string, number> | undefined,
  edgeIndex: ComparableEdgeIndex | undefined,
): number {
  const c = v4Components(candidateTitleId, v4Taste, descriptor, userRatings, edgeIndex);
  return (
    V4_THEME_WEIGHT * c.theme + V4_COMPARABLE_WEIGHT * c.comparable + V4_ENUM_WEIGHT * c.enumFit
  );
}

/** Raw per-component scores for one candidate. The recommender calls
 * this once per candidate, then normalises across the set before
 * applying weights — see scoreCombinedV4. Per ADR-0027 the components
 * cannot be combined raw because V1 baseTag is on a 0-100,000 scale
 * while V4 components are on a 0-1 scale, so naive addition makes V4
 * inert. Normalisation across the candidate set makes weights mean
 * what they say. */
export interface V4Components {
  /** Closed-vocab theme overlap (unweighted). */
  readonly theme: number;
  /** Comparable-graph contribution (unweighted, signed — rating valence
   * flows through, can be negative). */
  readonly comparable: number;
  /** Enum-fit contribution (unweighted, signed). */
  readonly enumFit: number;
}

/** Compute the three V4 raw components for one candidate. Returns
 * all-zero when v4 inputs are missing. */
export function v4Components(
  candidateTitleId: string,
  v4Taste: V4TasteVector | undefined,
  descriptor: V4Descriptor | undefined,
  userRatings: ReadonlyMap<string, number> | undefined,
  edgeIndex: ComparableEdgeIndex | undefined,
): V4Components {
  const theme = v4Taste && descriptor ? v4ThemeScore(v4Taste, descriptor) : 0;
  const enumFit = v4Taste && descriptor ? v4EnumFitScore(v4Taste, descriptor) : 0;
  const comparable =
    edgeIndex && userRatings && userRatings.size > 0
      ? v4ComparableScore(candidateTitleId, edgeIndex, userRatings)
      : 0;
  return { theme, comparable, enumFit };
}

/** Component scales for the four raw scoring channels. Computed once
 * per scoring call from max-of-absolute-values across the candidate
 * set. Used to normalise raw component values to [-1, 1] before
 * applying weights — see ADR-0027 Edit 2026-05-16. */
export interface ComponentScales {
  readonly baseTag: number;
  readonly v4Theme: number;
  readonly v4Comparable: number;
  readonly v4EnumFit: number;
}

/** Compute max-of-absolute-values per component across the candidate
 * set. Zero when all values are zero — normaliseToScale returns 0 in
 * that case (component contributes nothing). */
export function computeComponentScales(
  baseTagScores: ReadonlyArray<number>,
  v4ComponentsByTitle: ReadonlyArray<V4Components>,
): ComponentScales {
  let baseTag = 0;
  let v4Theme = 0;
  let v4Comparable = 0;
  let v4EnumFit = 0;
  for (const s of baseTagScores) {
    const a = Math.abs(s);
    if (a > baseTag) baseTag = a;
  }
  for (const c of v4ComponentsByTitle) {
    const at = Math.abs(c.theme);
    const ac = Math.abs(c.comparable);
    const ae = Math.abs(c.enumFit);
    if (at > v4Theme) v4Theme = at;
    if (ac > v4Comparable) v4Comparable = ac;
    if (ae > v4EnumFit) v4EnumFit = ae;
  }
  return { baseTag, v4Theme, v4Comparable, v4EnumFit };
}

/** Normalise a raw value against a per-component scale. Sign-preserving
 * (a negative input produces a negative output in [-1, 0]). Zero scale
 * → zero output (component contributes nothing to total). */
export function normaliseToScale(value: number, scale: number): number {
  if (scale === 0) return 0;
  return value / scale;
}

/** Total V4 contribution after normalisation. Computed per-candidate
 * using the pre-computed component scales. */
export function scoreCombinedV4(components: V4Components, scales: ComponentScales): number {
  return (
    V4_THEME_WEIGHT * normaliseToScale(components.theme, scales.v4Theme) +
    V4_COMPARABLE_WEIGHT * normaliseToScale(components.comparable, scales.v4Comparable) +
    V4_ENUM_WEIGHT * normaliseToScale(components.enumFit, scales.v4EnumFit)
  );
}

/**
 * Parallel breakdown variant of v4Score — produces ExplanationReason[]
 * instead of summing to a number. Each non-zero contributor surfaces as
 * one reason so the explanation layer can render specific copy ("Touches
 * on found-family," "Reminiscent of Mob Psycho 100").
 *
 * Contribution units match v4Score's units (weight × raw component),
 * so reasons sort comparably against V1 reasons from explainCandidateScore.
 *
 * Returns reasons UNSORTED — caller sorts the combined V1+V4 list.
 */
export function v4ScoreBreakdown(
  candidateTitleId: string,
  v4Taste: V4TasteVector | undefined,
  descriptor: V4Descriptor | undefined,
  userRatings: ReadonlyMap<string, number> | undefined,
  edgeIndex: ComparableEdgeIndex | undefined,
): ExplanationReason[] {
  const reasons: ExplanationReason[] = [];

  if (v4Taste && descriptor) {
    // v4-theme reasons: one per overlapping theme with non-zero weight.
    for (const t of descriptor.themes) {
      const userWeight = v4Taste.themesByWeight.get(t.slug);
      if (userWeight === undefined || userWeight === 0) continue;
      const contribution = V4_THEME_WEIGHT * userWeight * t.confidence;
      if (contribution === 0) continue;
      reasons.push({ kind: 'v4-theme', themeSlug: t.slug, contribution });
    }
    // v4-enum-fit reasons: one per matching enum bucket with non-zero weight.
    const modeWeight = v4Taste.modePref.get(descriptor.narrativeMode);
    if (modeWeight !== undefined && modeWeight !== 0) {
      reasons.push({
        kind: 'v4-enum-fit',
        enumField: 'mode',
        enumValue: descriptor.narrativeMode,
        contribution: V4_ENUM_WEIGHT * modeWeight,
      });
    }
    const engagementWeight = v4Taste.engagementPref.get(descriptor.engagementLevel);
    if (engagementWeight !== undefined && engagementWeight !== 0) {
      reasons.push({
        kind: 'v4-enum-fit',
        enumField: 'engagement',
        enumValue: descriptor.engagementLevel,
        contribution: V4_ENUM_WEIGHT * engagementWeight,
      });
    }
    const stakesWeight = v4Taste.stakesPref.get(descriptor.stakesScale);
    if (stakesWeight !== undefined && stakesWeight !== 0) {
      reasons.push({
        kind: 'v4-enum-fit',
        enumField: 'stakes',
        enumValue: descriptor.stakesScale,
        contribution: V4_ENUM_WEIGHT * stakesWeight,
      });
    }
  }

  // v4-comparable reasons: one per edge with non-zero rating valence.
  if (edgeIndex && userRatings && userRatings.size > 0) {
    const inbound = edgeIndex.reverse.get(candidateTitleId);
    if (inbound) {
      for (const e of inbound) {
        const rating = userRatings.get(e.fromTitleId);
        if (rating === undefined || rating === 0) continue;
        const contribution = V4_COMPARABLE_WEIGHT * rating * positionWeight(e.position);
        if (contribution === 0) continue;
        reasons.push({
          kind: 'v4-comparable',
          comparableTitleId: e.fromTitleId,
          comparableDirection: 'inbound',
          comparablePosition: e.position,
          contribution,
        });
      }
    }
    const outbound = edgeIndex.forward.get(candidateTitleId);
    if (outbound) {
      for (const e of outbound) {
        const rating = userRatings.get(e.toTitleId);
        if (rating === undefined || rating === 0) continue;
        const contribution = V4_COMPARABLE_WEIGHT * rating * positionWeight(e.position);
        if (contribution === 0) continue;
        reasons.push({
          kind: 'v4-comparable',
          comparableTitleId: e.toTitleId,
          comparableDirection: 'outbound',
          comparablePosition: e.position,
          contribution,
        });
      }
    }
  }

  return reasons;
}
