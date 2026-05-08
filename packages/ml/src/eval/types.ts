// Eval-harness public types. Per ADR-0020 ("Required before any group-rec
// code lands"): the harness lives in packages/ml, runs offline, produces a
// one-page report per parameter sweep, and is what tells us whether a
// proposed (vetoThreshold, lambda) combo is worth shipping. None of this
// is wired to user-facing surfaces — it's a research instrument.
//
// Design: pure functions + plain data structures. The harness should be
// runnable from a vitest test, a one-off node script, or future CI gating
// (e.g. "if any archetype's all-happy count drops below baseline, fail").

import type {
  GroupMember,
  GroupScoreParams,
  TagThemeMembership,
  TitleTagSet,
} from '../recommendation';

/** A named group fixture used by the eval harness. The archetype label
 * maps to one of ADR-0020's five required scenarios. */
export interface SyntheticGroup {
  readonly archetype: string;
  readonly description: string;
  readonly members: ReadonlyArray<GroupMember>;
}

/** A bundle of fixture data — group plus the candidate set + theme
 * membership the harness scores against. Held together so a fixture file
 * can express scenario-specific candidate biases (e.g. mostly-anime
 * candidates for the mixed-medium couple). */
export interface SyntheticScenario {
  readonly group: SyntheticGroup;
  readonly candidates: ReadonlyArray<TitleTagSet>;
  readonly themeMembership: ReadonlyArray<TagThemeMembership>;
}

/** Per-strategy metrics computed against the top-N output of one
 * recommendForGroup call. All metrics are over the SURVIVING (non-vetoed)
 * candidates only — the harness reports vetoCount separately so callers
 * can see how aggressively the threshold filtered. */
export interface EvalMetrics {
  /** Top-N output size after veto. May be < limit if too few survived. */
  readonly topN: number;
  /** Total candidates the algorithm considered. */
  readonly totalCandidates: number;
  /** Candidates excluded by the veto rule. */
  readonly vetoCount: number;
  /** Mean of perUserScores across the top-N output, averaged across all
   * members and all items. 0..1 scale. */
  readonly meanScore: number;
  /** Worst per-user score across the top-N output. Surfaces "the most
   * underserved member's worst rec" — tells us if the floor is biting. */
  readonly minScore: number;
  /** Mean stddev of perUserScores within each top-N item. Higher = more
   * disagreement bleeds through despite the lambda penalty. */
  readonly meanStddev: number;
  /** Count of top-N items where EVERY member's score >= 0.7. The
   * "everyone genuinely likes it" bar per the ADR. */
  readonly allHappyCount: number;
  /** Distinct themes covered by the top-N output (across all candidate
   * tags' theme memberships). Higher = more diverse recs for the group. */
  readonly themeDiversity: number;
}

/** One cell in the parameter-sweep grid. */
export interface SweepCell {
  readonly vetoThreshold: number;
  readonly lambda: number;
  readonly metrics: EvalMetrics;
}

/** Full sweep result for one archetype. */
export interface SweepReport {
  readonly archetype: string;
  readonly description: string;
  readonly cells: ReadonlyArray<SweepCell>;
}

/** Default top-N for eval. Smaller than the production 200 — eval focuses
 * on the surface a user actually sees, and 20 mirrors the dashboard cap. */
export const EVAL_TOP_N = 20;

/** Threshold for "everyone genuinely likes it" in allHappyCount. Per
 * ADR-0020 §required-before-code: "count of items where every member
 * scores ≥7/10". On our 0..1 normalised scale, that's 0.7. */
export const ALL_HAPPY_THRESHOLD = 0.7;

/** Re-export so eval consumers can build their own scenarios without
 * having to chase imports across modules. */
export type { GroupMember, GroupScoreParams, TagThemeMembership, TitleTagSet };
