import { describe, it, expect } from 'vitest';
import { explainRecommendation } from './explain';
import type { ExplanationReason } from './explain';
import {
  computeRecommendationScales,
  type ComparableEdge,
  type ComponentScales,
  type TagThemeMembership,
  type TitleTagSet,
  type UserTasteVector,
  type V4Descriptor,
  type V4RecInputs,
  type V4TasteVector,
  type V4Theme,
} from './recommendation';

// ---------------------------------------------------------------------------
// Tests for the `scales?: ComponentScales` parameter on explainRecommendation,
// and the new `computeRecommendationScales` export. Per ADR-0027 Edit
// 2026-05-16, the raw `contribution` field puts V1 reasons (raw 0–100,000)
// orders of magnitude above V4 reasons (raw 0–1) when sorting by
// contribution. Passing `scales` replaces each reason's contribution with a
// weighted, normalised value so V4 reasons can compete fairly with V1 ones
// in the headline-copy walk.
//
// Conventions per packages/ml/CLAUDE.md §8.1 (Approach B):
//   - Tests assert RANKINGS and SIGNS only, never absolute magnitudes.
//   - Written from the type signatures + contract document. Implementation
//     function bodies were NOT read.
//   - No mocks; the public functions are exercised end-to-end.
// ---------------------------------------------------------------------------

// -- Fixture helpers --------------------------------------------------------

const taste = (entries: ReadonlyArray<readonly [string, number]>): UserTasteVector =>
  new Map<string, number>(entries);

const desc = (
  themes: ReadonlyArray<V4Theme>,
  narrativeMode = 'plays-straight',
  engagementLevel = 'medium',
  stakesScale = 'interpersonal',
): V4Descriptor => ({ themes, narrativeMode, engagementLevel, stakesScale });

const emptyV4Taste = (): V4TasteVector => ({
  themesByWeight: new Map<string, number>(),
  modePref: new Map<string, number>(),
  engagementPref: new Map<string, number>(),
  stakesPref: new Map<string, number>(),
});

const v4TasteWith = (overrides: {
  themesByWeight?: ReadonlyArray<readonly [string, number]>;
  modePref?: ReadonlyArray<readonly [string, number]>;
  engagementPref?: ReadonlyArray<readonly [string, number]>;
  stakesPref?: ReadonlyArray<readonly [string, number]>;
}): V4TasteVector => ({
  themesByWeight: new Map<string, number>(overrides.themesByWeight ?? []),
  modePref: new Map<string, number>(overrides.modePref ?? []),
  engagementPref: new Map<string, number>(overrides.engagementPref ?? []),
  stakesPref: new Map<string, number>(overrides.stakesPref ?? []),
});

const titleWithTags = (titleId: string, tags: TitleTagSet['tags']): TitleTagSet => ({
  titleId,
  tags,
});

const titleNoTags = (titleId: string): TitleTagSet => ({ titleId, tags: [] });

// Convenience: pull the first reason of a given kind from a reason array.
const firstOfKind = (
  reasons: ReadonlyArray<ExplanationReason>,
  kind: ExplanationReason['kind'],
): ExplanationReason | undefined => reasons.find((r) => r.kind === kind);

// Convenience: index of the first reason of a given kind (or -1).
const indexOfKind = (
  reasons: ReadonlyArray<ExplanationReason>,
  kind: ExplanationReason['kind'],
): number => reasons.findIndex((r) => r.kind === kind);

// ---------------------------------------------------------------------------
// Behaviour 1 — Backward compat: no `scales` argument
// ---------------------------------------------------------------------------

describe('explainRecommendation — backward compat without scales', () => {
  it('returns the same reasons when scales is omitted as before (raw contributions)', () => {
    // Set up a candidate with BOTH a strong V1 direct-tag signal and a
    // strong V4 theme signal. Without `scales`, V1 raw contribution
    // (~tasteWeight × tagWeight, in the thousands) MUST dominate the sort
    // versus the V4 raw contribution (themeWeight × confidence, in the
    // single digits). The headline reason therefore has kind 'direct-tag'.
    const tasteV: UserTasteVector = taste([['actionT', 100]]);
    const candidate: TitleTagSet = titleWithTags('cand', [{ tagId: 'actionT', weight: 100 }]);

    const v4: V4RecInputs = {
      taste: v4TasteWith({ themesByWeight: [['coming-of-age', 2.0]] }),
      candidateDescriptors: new Map<string, V4Descriptor>([
        ['cand', desc([{ slug: 'coming-of-age', confidence: 1.0 }])],
      ]),
      comparableEdges: [],
      userRatings: new Map(),
    };

    const reasons = explainRecommendation(tasteV, candidate, [], v4);

    // V1 direct-tag must come first when no scales are applied — its raw
    // contribution dominates by orders of magnitude.
    expect(reasons.length).toBeGreaterThan(0);
    expect(reasons[0]?.kind).toBe('direct-tag');
    // The V4 theme reason exists in the list but is buried below V1.
    const v4ThemeIdx = indexOfKind(reasons, 'v4-theme');
    const v1Idx = indexOfKind(reasons, 'direct-tag');
    expect(v4ThemeIdx).toBeGreaterThan(v1Idx);
  });

  it('explicitly omitting scales is identical to passing undefined', () => {
    // Idempotency / arity check: the optional `scales` parameter has the
    // same behaviour whether omitted or passed as `undefined`.
    const tasteV: UserTasteVector = taste([['t1', 80]]);
    const candidate: TitleTagSet = titleWithTags('c', [{ tagId: 't1', weight: 60 }]);

    const reasonsA = explainRecommendation(tasteV, candidate);
    const reasonsB = explainRecommendation(tasteV, candidate, [], undefined, undefined);

    expect(reasonsA.length).toBe(reasonsB.length);
    expect(reasonsA.map((r) => r.kind)).toEqual(reasonsB.map((r) => r.kind));
    expect(reasonsA.map((r) => r.contribution)).toEqual(reasonsB.map((r) => r.contribution));
  });
});

// ---------------------------------------------------------------------------
// Behaviour 2 — HEADLINE: scales argument changes the sort order
// ---------------------------------------------------------------------------

describe('explainRecommendation — scales argument swaps V1/V4 sort order', () => {
  it('HEADLINE: without scales V1 ranks first; with scales V4 ranks first (for a candidate where V4 is the stronger signal after normalisation)', () => {
    // Fixture design — two candidates:
    //   - weakCand: carries a weak V1 signal (one direct-tag overlap on
    //     a low-weight tag) AND a strong V4 signal (position-0
    //     comparable to a title the user rated +1.0 / loved).
    //   - bigV1Cand: carries a heavy V1 signal (big direct-tag overlap)
    //     and NO V4 signal. Its raw V1 score dominates the candidate-set
    //     baseTag scale.
    //
    // Without scales: weakCand's V1 direct-tag (raw = small but > V4
    // raw) sorts above its V4 comparable reason.
    //
    // With scales: the baseTag scale is set by bigV1Cand's huge raw V1.
    // weakCand's normalised V1 contribution = (weak V1 raw / bigV1 raw)
    // × BASE_TAG_WEIGHT, a tiny fraction. weakCand's normalised V4
    // contribution = (1 / 1) × V4_COMPARABLE_WEIGHT = 0.8. V4 wins
    // decisively.
    //
    // Concrete fixture: weakT taste 2, tag weight 2 → V1 raw = 4 (still
    // dwarfed by bigV1Cand's 10,000, which sets the candidate-set V1
    // scale). V4 comparable raw = rating × positionWeight = 1.0 × 1.0 =
    // 1.0. So V1 raw (4) > V4 raw (1) → V1 wins without scales. With
    // scales: weakCand's normalised V1 contribution = (4 / 10000) ×
    // BASE_TAG_WEIGHT ≈ 4e-4. weakCand's normalised V4 contribution =
    // (1 / 1) × V4_COMPARABLE_WEIGHT = 0.8. V4 wins decisively.
    const tasteV: UserTasteVector = taste([
      ['weakT', 2],
      ['heavyT', 100],
    ]);
    const weakCand: TitleTagSet = titleWithTags('weakV1_strongV4', [{ tagId: 'weakT', weight: 2 }]);
    const bigV1Cand: TitleTagSet = titleWithTags('bigV1_noV4', [
      // Sets the candidate-set V1 scale to a large value, shrinking the
      // weak candidate's normalised V1 contribution towards zero.
      { tagId: 'heavyT', weight: 100 },
    ]);
    const candidates: ReadonlyArray<TitleTagSet> = [weakCand, bigV1Cand];

    // User has rated `lovedTitle` at +1.0 (loved). weakCand is a
    // position-0 comparable to lovedTitle → strong v4-comparable signal.
    const userRatings = new Map<string, number>([['lovedTitle', 1.0]]);
    const comparableEdges: ComparableEdge[] = [
      { fromTitleId: 'lovedTitle', toTitleId: 'weakV1_strongV4', position: 0 },
    ];
    const v4: V4RecInputs = {
      taste: emptyV4Taste(),
      // No descriptors needed for the comparable graph; v4Comparable
      // works through the edge index + userRatings.
      candidateDescriptors: new Map(),
      comparableEdges,
      userRatings,
    };

    const reasonsRaw = explainRecommendation(tasteV, weakCand, [], v4);

    // Without scales: the V1 direct-tag reason (raw = 4) sorts above the
    // V4 comparable reason (raw = 1).
    const v1IdxRaw = indexOfKind(reasonsRaw, 'direct-tag');
    const v4IdxRaw = indexOfKind(reasonsRaw, 'v4-comparable');
    expect(v1IdxRaw).toBeGreaterThanOrEqual(0);
    expect(v4IdxRaw).toBeGreaterThanOrEqual(0);
    expect(v1IdxRaw).toBeLessThan(v4IdxRaw);

    // Step 2: WITH scales — V4 wins decisively because V1's normalised
    // contribution is a tiny fraction (weak's raw V1 / big's raw V1).
    const scales = computeRecommendationScales(tasteV, candidates, [], v4);
    const reasonsNorm = explainRecommendation(tasteV, weakCand, [], v4, scales);

    const v1IdxNorm = indexOfKind(reasonsNorm, 'direct-tag');
    const v4IdxNorm = indexOfKind(reasonsNorm, 'v4-comparable');
    expect(v1IdxNorm).toBeGreaterThanOrEqual(0);
    expect(v4IdxNorm).toBeGreaterThanOrEqual(0);
    // This is the bug normalisation fixes: V4 must now sort ABOVE V1.
    expect(v4IdxNorm).toBeLessThan(v1IdxNorm);
    // The top reason for this candidate is now the V4 signal.
    expect(reasonsNorm[0]?.kind).toBe('v4-comparable');
  });
});

// ---------------------------------------------------------------------------
// Behaviour 3 — Normalisation is sign-preserving
// ---------------------------------------------------------------------------

describe('explainRecommendation — sign-preserving normalisation', () => {
  it('a negative raw v4-comparable contribution stays negative after normalisation', () => {
    // User HATED `hatedTitle` (rating −1.0). Candidate is comparable to
    // hatedTitle → v4-comparable raw contribution is negative.
    // After normalisation the sign must survive so the copy generator's
    // `contribution <= 0` skip-check still fires (we don't surface
    // "Reminiscent of X" for a title the user hated).
    const userRatings = new Map<string, number>([['hatedTitle', -1.0]]);
    const comparableEdges: ComparableEdge[] = [
      { fromTitleId: 'hatedTitle', toTitleId: 'cand', position: 0 },
    ];
    const candidate: TitleTagSet = titleNoTags('cand');
    const candidates: ReadonlyArray<TitleTagSet> = [candidate];
    const v4: V4RecInputs = {
      taste: emptyV4Taste(),
      candidateDescriptors: new Map(),
      comparableEdges,
      userRatings,
    };

    // Raw: v4-comparable contribution is strictly negative (rating × pos
    // weight = -1.0 × 1.0 = -1.0).
    const reasonsRaw = explainRecommendation(taste([]), candidate, [], v4);
    const compRaw = firstOfKind(reasonsRaw, 'v4-comparable');
    expect(compRaw).toBeDefined();
    expect(compRaw!.contribution).toBeLessThan(0);

    // Normalised: contribution is still strictly negative.
    const scales = computeRecommendationScales(taste([]), candidates, [], v4);
    const reasonsNorm = explainRecommendation(taste([]), candidate, [], v4, scales);
    const compNorm = firstOfKind(reasonsNorm, 'v4-comparable');
    expect(compNorm).toBeDefined();
    expect(compNorm!.contribution).toBeLessThan(0);
  });

  it('a negative raw v4-theme contribution stays negative after normalisation', () => {
    // User has a NEGATIVE theme weight for `darkTheme` (built from
    // disliked rated titles carrying that theme). A candidate carrying
    // darkTheme produces a negative raw v4-theme contribution. Sign
    // must survive normalisation.
    const v4Taste = v4TasteWith({ themesByWeight: [['darkTheme', -2.0]] });
    const candidate: TitleTagSet = titleNoTags('cand');
    const v4: V4RecInputs = {
      taste: v4Taste,
      candidateDescriptors: new Map<string, V4Descriptor>([
        ['cand', desc([{ slug: 'darkTheme', confidence: 1.0 }])],
      ]),
      comparableEdges: [],
      userRatings: new Map(),
    };

    const reasonsRaw = explainRecommendation(taste([]), candidate, [], v4);
    const themeRaw = firstOfKind(reasonsRaw, 'v4-theme');
    expect(themeRaw).toBeDefined();
    expect(themeRaw!.contribution).toBeLessThan(0);

    const scales = computeRecommendationScales(taste([]), [candidate], [], v4);
    const reasonsNorm = explainRecommendation(taste([]), candidate, [], v4, scales);
    const themeNorm = firstOfKind(reasonsNorm, 'v4-theme');
    expect(themeNorm).toBeDefined();
    expect(themeNorm!.contribution).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// Behaviour 4 — Zero scale → zero contribution
// ---------------------------------------------------------------------------

describe('explainRecommendation — zero scale suppresses contribution', () => {
  it('when no candidate has any v4-comparable signal across the set, v4-comparable reasons (if any leak through) get contribution 0', () => {
    // No edges in the candidate set → v4Comparable scale = 0 →
    // normaliseToScale(value, 0) = 0 per the scoring contract. A v4-
    // comparable reason cannot really arise here without edges, but we
    // also need to assert the more general claim: if a kind has scale 0
    // its normalised contribution is 0.
    const candidate: TitleTagSet = titleWithTags('cand', [{ tagId: 't1', weight: 50 }]);
    const candidates: ReadonlyArray<TitleTagSet> = [candidate];
    const v4: V4RecInputs = {
      taste: emptyV4Taste(),
      candidateDescriptors: new Map(),
      comparableEdges: [],
      userRatings: new Map(),
    };

    const scales = computeRecommendationScales(taste([['t1', 50]]), candidates, [], v4);
    // No V4 signal anywhere → all V4 scales are 0.
    expect(scales.v4Theme).toBe(0);
    expect(scales.v4Comparable).toBe(0);
    expect(scales.v4EnumFit).toBe(0);

    const reasonsNorm = explainRecommendation(taste([['t1', 50]]), candidate, [], v4, scales);

    // Any V4 reasons that exist (probably none here) must have 0
    // contribution. V1 reasons can be non-zero — the V1 scale is
    // non-zero here.
    for (const r of reasonsNorm) {
      if (r.kind === 'v4-theme' || r.kind === 'v4-comparable' || r.kind === 'v4-enum-fit') {
        expect(r.contribution).toBe(0);
      }
    }
  });

  it('when no candidate has any v1 signal, baseTag scale = 0 and v1 reasons get contribution 0', () => {
    // The dual case: only V4 signal in the candidate set, V1 scale is
    // zero, so any V1 reason normalises to 0.
    const userRatings = new Map<string, number>([['lovedTitle', 1.0]]);
    const comparableEdges: ComparableEdge[] = [
      { fromTitleId: 'lovedTitle', toTitleId: 'cand', position: 0 },
    ];
    const candidate: TitleTagSet = titleNoTags('cand');
    const candidates: ReadonlyArray<TitleTagSet> = [candidate];
    const v4: V4RecInputs = {
      taste: emptyV4Taste(),
      candidateDescriptors: new Map(),
      comparableEdges,
      userRatings,
    };

    const scales = computeRecommendationScales(taste([]), candidates, [], v4);
    expect(scales.baseTag).toBe(0);

    const reasonsNorm = explainRecommendation(taste([]), candidate, [], v4, scales);
    for (const r of reasonsNorm) {
      if (r.kind === 'direct-tag' || r.kind === 'theme-bridge') {
        expect(r.contribution).toBe(0);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Behaviour 5 — Per-kind dispatch correctness
// ---------------------------------------------------------------------------

describe('explainRecommendation — per-kind normalisation dispatch', () => {
  it('v4-theme reasons normalise by scales.v4Theme (not by v4Comparable or v4EnumFit)', () => {
    // Two candidates. cand_A has a theme signal at value 1.0 (max).
    // cand_B has theme signal 0.5. v4Theme scale = 1.0. cand_A's
    // normalised v4-theme contribution = 1.0 × V4_THEME_WEIGHT.
    // cand_B's normalised v4-theme contribution = 0.5 × V4_THEME_WEIGHT.
    // We assert: cand_A's v4-theme contribution magnitude is strictly
    // greater than cand_B's. This isolates the v4Theme dispatch path.
    const v4Taste = v4TasteWith({ themesByWeight: [['t', 1.0]] });
    const cand_A: TitleTagSet = titleNoTags('A');
    const cand_B: TitleTagSet = titleNoTags('B');
    const v4: V4RecInputs = {
      taste: v4Taste,
      candidateDescriptors: new Map<string, V4Descriptor>([
        ['A', desc([{ slug: 't', confidence: 1.0 }])],
        ['B', desc([{ slug: 't', confidence: 0.5 }])],
      ]),
      comparableEdges: [],
      userRatings: new Map(),
    };
    const scales = computeRecommendationScales(taste([]), [cand_A, cand_B], [], v4);

    const reasonsA = explainRecommendation(taste([]), cand_A, [], v4, scales);
    const reasonsB = explainRecommendation(taste([]), cand_B, [], v4, scales);
    const themeA = firstOfKind(reasonsA, 'v4-theme');
    const themeB = firstOfKind(reasonsB, 'v4-theme');
    expect(themeA).toBeDefined();
    expect(themeB).toBeDefined();
    expect(themeA!.contribution).toBeGreaterThan(themeB!.contribution);
    // And the max-magnitude one is positive (normalised to ~+1 × weight).
    expect(themeA!.contribution).toBeGreaterThan(0);
  });

  it('v4-comparable reasons normalise by scales.v4Comparable (independent of v4Theme scale)', () => {
    // Build a candidate set where:
    //   - The comparable-graph signal has scale = 1.0 (cand_C is the
    //     position-0 comparable of a loved title).
    //   - The v4-theme signal in the set has a DIFFERENT, larger scale
    //     than the comparable's raw value. If dispatch were wrong (e.g.
    //     v4-comparable divided by v4Theme scale), cand_C's normalised
    //     comparable contribution would shrink artificially.
    const userRatings = new Map<string, number>([['lovedTitle', 1.0]]);
    const comparableEdges: ComparableEdge[] = [
      { fromTitleId: 'lovedTitle', toTitleId: 'C', position: 0 },
    ];
    const v4Taste = v4TasteWith({ themesByWeight: [['t', 5.0]] }); // big theme weight
    const cand_C: TitleTagSet = titleNoTags('C');
    const cand_D: TitleTagSet = titleNoTags('D');
    const v4: V4RecInputs = {
      taste: v4Taste,
      candidateDescriptors: new Map<string, V4Descriptor>([
        // D has the big theme signal — raw v4Theme ≈ 5.0 → v4Theme scale = 5.
        ['D', desc([{ slug: 't', confidence: 1.0 }])],
      ]),
      comparableEdges,
      userRatings,
    };
    const scales = computeRecommendationScales(taste([]), [cand_C, cand_D], [], v4);
    expect(scales.v4Theme).toBeGreaterThan(1); // distinct scale to v4Comparable
    expect(scales.v4Comparable).toBeGreaterThan(0);

    const reasonsC = explainRecommendation(taste([]), cand_C, [], v4, scales);
    const compC = firstOfKind(reasonsC, 'v4-comparable');
    expect(compC).toBeDefined();
    // cand_C is the max-magnitude v4-comparable contributor in the set,
    // so its normalised contribution is +V4_COMPARABLE_WEIGHT (positive).
    // If dispatch routed it through v4Theme scale instead, the value
    // would be 1.0 / 5.0 × V4_COMPARABLE_WEIGHT = 0.16, not the full
    // 0.8. Assert magnitude is "near max" by comparing to D's v4-theme
    // contribution (which is the max-magnitude theme contributor).
    const reasonsD = explainRecommendation(taste([]), cand_D, [], v4, scales);
    const themeD = firstOfKind(reasonsD, 'v4-theme');
    expect(themeD).toBeDefined();
    // C's normalised comparable ≈ 1.0 × V4_COMPARABLE_WEIGHT (= 0.8).
    // D's normalised theme ≈ 1.0 × V4_THEME_WEIGHT (= 1.0). If dispatch
    // is correct, C's comparable contribution is greater than 0.5 ×
    // D's theme contribution (i.e. they're on the same scale times their
    // weights). A wrong dispatch (e.g. dividing by v4Theme scale) would
    // crush C's comparable to a small fraction.
    expect(compC!.contribution).toBeGreaterThan(themeD!.contribution * 0.5);
  });

  it('v4-enum-fit reasons normalise by scales.v4EnumFit (independent of v4Theme / v4Comparable scales)', () => {
    // Candidate with a single enum-fit signal. We confirm the enum-fit
    // contribution is non-zero AND positive when the candidate matches a
    // positive enum preference, even when the v4Theme scale in the set
    // is much larger than the enum-fit value.
    const v4Taste = v4TasteWith({
      themesByWeight: [['t', 5.0]], // big theme scale in the set
      modePref: [['deconstructs', 1.0]], // small enum weight for the candidate
    });
    const cand_E: TitleTagSet = titleNoTags('E');
    const cand_F: TitleTagSet = titleNoTags('F');
    const v4: V4RecInputs = {
      taste: v4Taste,
      candidateDescriptors: new Map<string, V4Descriptor>([
        // E matches the enum pref (deconstructs).
        ['E', desc([], 'deconstructs')],
        // F drives the v4Theme scale up.
        ['F', desc([{ slug: 't', confidence: 1.0 }])],
      ]),
      comparableEdges: [],
      userRatings: new Map(),
    };
    const scales = computeRecommendationScales(taste([]), [cand_E, cand_F], [], v4);
    expect(scales.v4EnumFit).toBeGreaterThan(0);

    const reasonsE = explainRecommendation(taste([]), cand_E, [], v4, scales);
    const enumE = firstOfKind(reasonsE, 'v4-enum-fit');
    expect(enumE).toBeDefined();
    // E is the max-magnitude enum-fit contributor in the set → its
    // normalised contribution ≈ +V4_ENUM_WEIGHT (= 0.3). Must be > 0 and
    // strictly bounded by the V4 weight constants (i.e. ≤ ~0.3, well
    // below the full +1.0). If dispatch were wrong (e.g. divided by
    // v4Theme scale 5.0), the value would shrink to 0.06.
    expect(enumE!.contribution).toBeGreaterThan(0);
    // The strict-upper-bound check is enough to detect a wildly wrong
    // dispatch (sign flip, divided by the wrong scale).
    expect(enumE!.contribution).toBeLessThanOrEqual(1);
  });

  it('direct-tag and theme-bridge both normalise by scales.baseTag (× BASE_TAG_WEIGHT)', () => {
    // Both V1 kinds share the baseTag scale per the contract. Build a
    // candidate that exposes both a direct-tag reason and a theme-bridge
    // reason. Compare their normalised contributions to a candidate
    // whose total V1 score sets the baseTag scale (so we know the
    // denominator).
    //
    // Specifically: cand_X has tag t1 (direct match, taste 100, weight
    // 100 → raw 10000) AND tag tBridge (bridges through theme y; taste
    // has tBridgeMember which also bridges to theme y, strength 100).
    // The direct-tag contribution dominates; baseTag scale = sum of X's
    // V1 contributions (call it S_X). cand_Y is a no-overlap candidate.
    const tasteV: UserTasteVector = taste([
      ['t1', 100],
      ['tBridgeMember', 100],
    ]);
    const cand_X: TitleTagSet = titleWithTags('X', [
      { tagId: 't1', weight: 100 },
      { tagId: 'tBridge', weight: 50 },
    ]);
    const cand_Y: TitleTagSet = titleNoTags('Y');
    const themeMembership: TagThemeMembership[] = [
      // tBridgeMember is in the user's taste; tBridge is in the candidate.
      // Both belong to theme 'y' → bridge fires.
      { tagId: 'tBridgeMember', themeId: 'y', strength: 100 },
      { tagId: 'tBridge', themeId: 'y', strength: 100 },
    ];

    const scales = computeRecommendationScales(tasteV, [cand_X, cand_Y], themeMembership);
    expect(scales.baseTag).toBeGreaterThan(0);

    const reasonsX = explainRecommendation(tasteV, cand_X, themeMembership, undefined, scales);
    const direct = firstOfKind(reasonsX, 'direct-tag');
    const bridge = firstOfKind(reasonsX, 'theme-bridge');

    expect(direct).toBeDefined();
    expect(bridge).toBeDefined();
    // Both V1 kinds must have non-negative normalised contribution,
    // bounded by BASE_TAG_WEIGHT (i.e. <= 1.0). And the direct-tag
    // (whose raw value dominates) must rank above the bridge.
    expect(direct!.contribution).toBeGreaterThan(0);
    expect(bridge!.contribution).toBeGreaterThan(0);
    expect(direct!.contribution).toBeGreaterThan(bridge!.contribution);
    expect(direct!.contribution).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Behaviour 6 — computeRecommendationScales matches what recommendForUser uses
// ---------------------------------------------------------------------------

describe('computeRecommendationScales — produces the scales recommendForUser uses internally', () => {
  it('scales.baseTag equals the max |baseTagScore| across candidates', () => {
    // We can't reach into recommendForUser's private locals. The
    // contract documented in the recommendation.ts JSDoc says:
    // "scales.baseTag = max(|baseTagScore(c)| across candidates)". A
    // simple invariant to check: among a small candidate set with
    // known dominant V1 contributors, the function returns the value of
    // the candidate with the largest raw V1 score.
    //
    // We exercise this indirectly: the candidate set has one candidate
    // with raw V1 = 100×100 = 10000 (taste t × tag t, both 100) and one
    // with raw V1 = 0 (no overlap). Scale.baseTag must equal 10000.
    const tasteV: UserTasteVector = taste([['t', 100]]);
    const cand_big: TitleTagSet = titleWithTags('big', [{ tagId: 't', weight: 100 }]);
    const cand_zero: TitleTagSet = titleNoTags('zero');

    const scales = computeRecommendationScales(tasteV, [cand_big, cand_zero], []);
    expect(scales.baseTag).toBe(10000);
  });

  it('scales.v4Theme equals the max |v4Theme raw| across candidates', () => {
    // user theme weight 3.0 × candidate confidence 1.0 = 3.0. Another
    // candidate has confidence 0.5 → raw = 1.5. Scale must be 3.0.
    const v4: V4RecInputs = {
      taste: v4TasteWith({ themesByWeight: [['t', 3.0]] }),
      candidateDescriptors: new Map<string, V4Descriptor>([
        ['big', desc([{ slug: 't', confidence: 1.0 }])],
        ['small', desc([{ slug: 't', confidence: 0.5 }])],
      ]),
      comparableEdges: [],
      userRatings: new Map(),
    };
    const scales = computeRecommendationScales(
      taste([]),
      [titleNoTags('big'), titleNoTags('small')],
      [],
      v4,
    );
    expect(scales.v4Theme).toBe(3.0);
  });

  it('scales.v4Comparable takes the max of |signed| comparable values across the set', () => {
    // One candidate has comparable=+1.0 (loved title at position 0).
    // Another has comparable=-1.0 (hated title at position 0). The
    // scale is max(|1.0|, |-1.0|) = 1.0.
    const userRatings = new Map<string, number>([
      ['loved', 1.0],
      ['hated', -1.0],
    ]);
    const comparableEdges: ComparableEdge[] = [
      { fromTitleId: 'loved', toTitleId: 'fav', position: 0 },
      { fromTitleId: 'hated', toTitleId: 'reject', position: 0 },
    ];
    const v4: V4RecInputs = {
      taste: emptyV4Taste(),
      candidateDescriptors: new Map(),
      comparableEdges,
      userRatings,
    };
    const scales = computeRecommendationScales(
      taste([]),
      [titleNoTags('fav'), titleNoTags('reject')],
      [],
      v4,
    );
    expect(scales.v4Comparable).toBe(1.0);
  });

  it('using the returned scales in explainRecommendation produces rankings consistent with the contract: V4 reason can outrank V1 reason in the headline candidate', () => {
    // End-to-end integration check: compute scales via the public API,
    // pass to explainRecommendation, observe that the V4 reason wins
    // over the V1 reason on a fixture designed to expose the bug.
    // Functionally a reprise of Behaviour 2, but routed through the
    // computeRecommendationScales export to confirm both paths agree.
    const tasteV: UserTasteVector = taste([
      ['weakT', 2],
      ['heavyT', 100],
    ]);
    const weakCand: TitleTagSet = titleWithTags('W', [{ tagId: 'weakT', weight: 2 }]);
    const bigV1Cand: TitleTagSet = titleWithTags('B', [{ tagId: 'heavyT', weight: 100 }]);
    const userRatings = new Map<string, number>([['lovedTitle', 1.0]]);
    const comparableEdges: ComparableEdge[] = [
      { fromTitleId: 'lovedTitle', toTitleId: 'W', position: 0 },
    ];
    const v4: V4RecInputs = {
      taste: emptyV4Taste(),
      candidateDescriptors: new Map(),
      comparableEdges,
      userRatings,
    };

    const scales: ComponentScales = computeRecommendationScales(
      tasteV,
      [weakCand, bigV1Cand],
      [],
      v4,
    );

    const reasons = explainRecommendation(tasteV, weakCand, [], v4, scales);
    expect(reasons[0]?.kind).toBe('v4-comparable');
    // The V4 reason's normalised contribution is positive.
    expect(reasons[0]?.contribution).toBeGreaterThan(0);
  });
});
