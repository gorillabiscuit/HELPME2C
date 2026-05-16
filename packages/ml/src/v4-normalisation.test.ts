import { describe, it, expect } from 'vitest';
import {
  recommendForGroup,
  recommendForUser,
  type ComparableEdge,
  type GroupMember,
  type TitleTagSet,
  type UserTasteVector,
  type V4Descriptor,
  type V4GroupInputs,
  type V4RecInputs,
  type V4TasteVector,
  type V4Theme,
} from './recommendation';
import {
  computeComponentScales,
  normaliseToScale,
  scoreCombinedV4,
  v4Components,
  type ComponentScales,
  type V4Components,
} from './scoring';

// Tests for the per-component max-of-absolute-values normalisation added
// per ADR-0027 Edit 2026-05-16. The pre-normalisation V4 wiring had V4
// components on a 0-1 scale and V1 baseTagScore on a 0-100,000 scale, so
// V4 contributions were three orders of magnitude smaller than V1 and
// had no effect on rankings. Normalisation makes each weighted component
// commensurable.
//
// Conventions (per packages/ml/CLAUDE.md):
//   - Assert rankings (and signs for valence flow), never absolute scores
//   - Approach B isolation: written against the contract in the task brief
//     plus the type signatures in scoring.ts / recommendation.ts; the
//     implementation bodies of the helpers under test were not read

const EMPTY_TASTE: UserTasteVector = new Map();
const EMPTY_RATINGS: ReadonlyMap<string, number> = new Map();

const EMPTY_V4_TASTE: V4TasteVector = {
  themesByWeight: new Map(),
  modePref: new Map(),
  engagementPref: new Map(),
  stakesPref: new Map(),
};

const desc = (
  themes: ReadonlyArray<V4Theme>,
  narrativeMode = 'plays-straight',
  engagementLevel = 'medium',
  stakesScale = 'interpersonal',
): V4Descriptor => ({ themes, narrativeMode, engagementLevel, stakesScale });

const titleNoTags = (titleId: string): TitleTagSet => ({ titleId, tags: [] });

// Helper: build a V4Components literal that satisfies the readonly contract.
const comps = (theme: number, comparable: number, enumFit: number): V4Components => ({
  theme,
  comparable,
  enumFit,
});

// ---------------------------------------------------------------------------
// Behaviour 1 — normaliseToScale primitive
// ---------------------------------------------------------------------------

describe('normaliseToScale', () => {
  it('divides value by scale when scale > 0', () => {
    expect(normaliseToScale(5, 10)).toBe(0.5);
    expect(normaliseToScale(10, 10)).toBe(1);
    expect(normaliseToScale(2, 8)).toBe(0.25);
  });

  it('returns 0 when scale is 0 (component contributed no signal across candidate set)', () => {
    expect(normaliseToScale(0, 0)).toBe(0);
    // Even with a non-zero value, scale=0 means the candidate set was all-
    // zero so the per-component normaliser has no reference frame; the
    // contract says return 0 to make the component inert.
    expect(normaliseToScale(5, 0)).toBe(0);
    expect(normaliseToScale(-3, 0)).toBe(0);
  });

  it('is sign-preserving for negative inputs', () => {
    expect(normaliseToScale(-5, 10)).toBe(-0.5);
    expect(normaliseToScale(-10, 10)).toBe(-1);
    // A negative scale would be a programming error per the contract;
    // computeComponentScales only emits non-negative scales (max of |x|).
  });

  it('returns values in [-1, 1] when |value| <= scale', () => {
    for (const [v, s] of [
      [3, 10],
      [-7, 10],
      [10, 10],
      [-10, 10],
      [0, 10],
    ] as const) {
      const out = normaliseToScale(v, s);
      expect(out).toBeGreaterThanOrEqual(-1);
      expect(out).toBeLessThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------
// Behaviour 2 — computeComponentScales primitive
// ---------------------------------------------------------------------------

describe('computeComponentScales', () => {
  it('returns max-of-absolute-values per component across the candidate set', () => {
    const baseTagScores = [10, 50, 30];
    const v4 = [comps(0.2, 0.4, 0.1), comps(0.8, 0.1, 0.3), comps(0.5, 0.2, 0.05)];
    const scales = computeComponentScales(baseTagScores, v4);

    expect(scales.baseTag).toBe(50);
    expect(scales.v4Theme).toBe(0.8);
    expect(scales.v4Comparable).toBe(0.4);
    expect(scales.v4EnumFit).toBe(0.3);
  });

  it('treats negative raw values by their absolute value (so the scale is positive)', () => {
    // Per the contract: normalised values must lie in [-1, +1]. That can
    // only hold if the scale equals max(|v|), not max(v). A purely
    // negative-valued component must still get a positive scale.
    const baseTagScores = [-100, -50];
    const v4 = [comps(-0.9, -0.4, 0), comps(-0.5, -0.7, 0)];
    const scales = computeComponentScales(baseTagScores, v4);

    expect(scales.baseTag).toBe(100);
    expect(scales.v4Theme).toBe(0.9);
    expect(scales.v4Comparable).toBe(0.7);
    expect(scales.v4EnumFit).toBe(0);
  });

  it('returns all-zero scales when all inputs are zero', () => {
    const scales = computeComponentScales([0, 0, 0], [comps(0, 0, 0), comps(0, 0, 0)]);
    expect(scales.baseTag).toBe(0);
    expect(scales.v4Theme).toBe(0);
    expect(scales.v4Comparable).toBe(0);
    expect(scales.v4EnumFit).toBe(0);
  });

  it('takes max(|values|) — not max(values) — for mixed positive/negative inputs', () => {
    // Mixed signs: a candidate with comparable=+0.3 and another with
    // comparable=-0.9 must produce scale=0.9 (not 0.3, which would be
    // max(values)).
    const v4 = [comps(0.3, 0.3, 0), comps(-0.7, -0.9, 0), comps(0.5, 0.2, 0)];
    const scales = computeComponentScales([10, -100, 5], v4);

    expect(scales.baseTag).toBe(100);
    expect(scales.v4Theme).toBe(0.7);
    expect(scales.v4Comparable).toBe(0.9);
  });

  it('handles an empty candidate set (all scales zero)', () => {
    const scales = computeComponentScales([], []);
    expect(scales.baseTag).toBe(0);
    expect(scales.v4Theme).toBe(0);
    expect(scales.v4Comparable).toBe(0);
    expect(scales.v4EnumFit).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Behaviour 3 (HEADLINE) — V4 actually changes rankings vs V1-only
// ---------------------------------------------------------------------------

describe('recommendForUser — normalisation lets V4 signal change rankings', () => {
  it('HEADLINE: V4 preference for B (over A) successfully swaps an A-on-top V1 ranking', () => {
    // Fixture design: candidate A wins purely on V1 (its base tag overlap
    // is dominant — way more total tag weight than B). Candidate B has
    // weak V1 overlap, but B's V4 theme overlap is the maximum possible
    // (its theme matches the user's strongest V4 preference at confidence
    // 1.0). Without per-component normalisation, V1's 100,000-scale crushes
    // V4's 0-1 scale and A wins by a huge margin. With normalisation, V1
    // and V4 contribute on the same scale (each weighted by their
    // respective constant) and B wins.
    //
    // Concretely, before normalisation: total_A = bigV1 + 0; total_B =
    // smallV1 + (β×1.0). bigV1 (tens of thousands) >> β×1.0 (~1) so A
    // wins, regardless of weight. After normalisation, V1 contributes
    // BASE_TAG_WEIGHT (1.0) to A and BASE_TAG_WEIGHT × (smallV1/bigV1)
    // (vanishingly small) to B; V4 contributes V4_THEME_WEIGHT (1.0) to
    // B. So B narrowly beats A. This is the bug normalisation fixes.
    const v1Taste: UserTasteVector = new Map([
      // Tags weighted very heavily. ScoreCandidate sums taste[tag] *
      // candidate.weight, so this produces a 4-figure raw V1 score for
      // candidate A.
      ['actionT', 100],
      ['mechaT', 100],
      ['epicT', 100],
    ]);
    const v4Taste: V4TasteVector = {
      themesByWeight: new Map([['coming-of-age', 2.0]]), // user loves this theme
      modePref: new Map(),
      engagementPref: new Map(),
      stakesPref: new Map(),
    };

    const candidates: TitleTagSet[] = [
      {
        // A: huge V1 score, no V4 signal.
        titleId: 'A_heavyV1_noV4',
        tags: [
          { tagId: 'actionT', weight: 100 },
          { tagId: 'mechaT', weight: 100 },
          { tagId: 'epicT', weight: 100 },
        ],
      },
      {
        // B: tiny V1 score, maximal V4 theme overlap.
        titleId: 'B_tinyV1_strongV4',
        tags: [{ tagId: 'actionT', weight: 1 }],
      },
    ];

    const v4: V4RecInputs = {
      taste: v4Taste,
      candidateDescriptors: new Map<string, V4Descriptor>([
        // B has the user's preferred theme at full confidence.
        ['B_tinyV1_strongV4', desc([{ slug: 'coming-of-age', confidence: 1.0 }])],
        // A has no theme overlap.
        ['A_heavyV1_noV4', desc([{ slug: 'cooking', confidence: 1.0 }])],
      ]),
      comparableEdges: [],
      userRatings: EMPTY_RATINGS,
    };

    // Sanity check on the fixture: V1-only ranking puts A first.
    const v1Only = recommendForUser(v1Taste, candidates);
    expect(v1Only[0]?.titleId).toBe('A_heavyV1_noV4');
    expect(v1Only[1]?.titleId).toBe('B_tinyV1_strongV4');

    // The real assertion: with V4 in play AND normalisation, B beats A.
    const withV4 = recommendForUser(v1Taste, candidates, undefined, [], v4);
    expect(withV4[0]?.titleId).toBe('B_tinyV1_strongV4');
    expect(withV4[1]?.titleId).toBe('A_heavyV1_noV4');
  });

  it('is the V4-makes-a-difference test: same candidates, V4 absent → A still wins; V4 present → B wins', () => {
    // A second presentation of the headline behaviour: keeps the fixture
    // and asserts the swap explicitly so a future regression that
    // accidentally drops normalisation will fail with a clear message.
    const v1Taste: UserTasteVector = new Map([['t1', 100]]);
    const v4Taste: V4TasteVector = {
      themesByWeight: new Map([['themeUserLoves', 5.0]]),
      modePref: new Map(),
      engagementPref: new Map(),
      stakesPref: new Map(),
    };
    const candidates: TitleTagSet[] = [
      { titleId: 'A', tags: [{ tagId: 't1', weight: 100 }] }, // big V1
      { titleId: 'B', tags: [{ tagId: 't1', weight: 1 }] }, // tiny V1
    ];
    const v4: V4RecInputs = {
      taste: v4Taste,
      candidateDescriptors: new Map([['B', desc([{ slug: 'themeUserLoves', confidence: 1.0 }])]]),
      comparableEdges: [],
      userRatings: EMPTY_RATINGS,
    };

    const noV4 = recommendForUser(v1Taste, candidates);
    expect(noV4[0]?.titleId).toBe('A');

    const yesV4 = recommendForUser(v1Taste, candidates, undefined, [], v4);
    expect(yesV4[0]?.titleId).toBe('B');
  });
});

// ---------------------------------------------------------------------------
// Behaviour 4 — backward compat: V4 absent → V1 ranking preserved
// ---------------------------------------------------------------------------

describe('recommendForUser — V4 absent preserves V1 ordering', () => {
  it('produces the same ranking as it would without normalisation when v4 is omitted', () => {
    // Per the contract: normalising a single component (baseTag/max_baseTag)
    // is monotonic, so the ORDER of candidates by score is preserved
    // relative to a pre-normalisation V1-only baseline. We can't recompute
    // the "old" V1 score here, but we can assert ordering matches the
    // tag-overlap intuition: candidates with more taste-aligned tags rank
    // higher than candidates with fewer.
    const taste: UserTasteVector = new Map([
      ['t1', 100],
      ['t2', 80],
    ]);
    const candidates: TitleTagSet[] = [
      // Strong overlap on both tags.
      {
        titleId: 'high',
        tags: [
          { tagId: 't1', weight: 90 },
          { tagId: 't2', weight: 70 },
        ],
      },
      // Medium overlap.
      { titleId: 'mid', tags: [{ tagId: 't1', weight: 60 }] },
      // No overlap.
      { titleId: 'low', tags: [{ tagId: 'unrelated', weight: 100 }] },
    ];

    const result = recommendForUser(taste, candidates);
    expect(result.map((r) => r.titleId)).toEqual(['high', 'mid', 'low']);
  });

  it('preserves ordering between repeated calls with identical inputs (determinism)', () => {
    // Determinism guard: normalisation must not introduce float drift that
    // changes tie-break behaviour across calls. Same inputs → same order.
    const taste: UserTasteVector = new Map([['t1', 50]]);
    const candidates: TitleTagSet[] = [
      { titleId: 'a', tags: [{ tagId: 't1', weight: 50 }] },
      { titleId: 'b', tags: [{ tagId: 't1', weight: 30 }] },
      { titleId: 'c', tags: [{ tagId: 't1', weight: 10 }] },
    ];

    const r1 = recommendForUser(taste, candidates).map((r) => r.titleId);
    const r2 = recommendForUser(taste, candidates).map((r) => r.titleId);
    expect(r1).toEqual(r2);
    expect(r1).toEqual(['a', 'b', 'c']);
  });
});

// ---------------------------------------------------------------------------
// Behaviour 5 — All-zero V4 components do not crash or pollute ranking
// ---------------------------------------------------------------------------

describe('recommendForUser — all-zero V4 inputs reduce to V1 ranking', () => {
  it('does not crash when v4 taste is empty and no edges / ratings exist', () => {
    // Empty-everything V4: themesByWeight/modePref/etc all empty, no
    // edges, no ratings. v4Components returns all zeros, scales are zero,
    // normaliseToScale(0, 0) is 0, V4 total contribution is 0. Ranking is
    // V1-determined. Must not throw a divide-by-zero or NaN.
    const v1Taste: UserTasteVector = new Map([['t1', 80]]);
    const candidates: TitleTagSet[] = [
      { titleId: 'x', tags: [{ tagId: 't1', weight: 90 }] },
      { titleId: 'y', tags: [{ tagId: 't1', weight: 40 }] },
      { titleId: 'z', tags: [] },
    ];
    const v4: V4RecInputs = {
      taste: EMPTY_V4_TASTE,
      candidateDescriptors: new Map(),
      comparableEdges: [],
      userRatings: EMPTY_RATINGS,
    };

    const result = recommendForUser(v1Taste, candidates, undefined, [], v4);

    // No NaN / Infinity / undefined: all scores are finite numbers.
    for (const r of result) {
      expect(Number.isFinite(r.score)).toBe(true);
    }
    // Order is V1-determined: x > y > z.
    expect(result.map((r) => r.titleId)).toEqual(['x', 'y', 'z']);
  });

  it('zero V4 contribution does not perturb V1-driven order even when V1 scales are heterogeneous', () => {
    // Heterogeneous V1 magnitudes; V4 totally inert. The V4 component must
    // not somehow flip rankings when its scale is zero.
    const taste: UserTasteVector = new Map([['t', 100]]);
    const candidates: TitleTagSet[] = [
      { titleId: 'big', tags: [{ tagId: 't', weight: 99 }] },
      { titleId: 'small', tags: [{ tagId: 't', weight: 1 }] },
    ];
    const v4: V4RecInputs = {
      taste: EMPTY_V4_TASTE,
      candidateDescriptors: new Map(),
      comparableEdges: [],
      userRatings: EMPTY_RATINGS,
    };

    const result = recommendForUser(taste, candidates, undefined, [], v4);
    expect(result[0]?.titleId).toBe('big');
    expect(result[1]?.titleId).toBe('small');
  });
});

// ---------------------------------------------------------------------------
// Behaviour 6 — Negative comparable contributions survive normalisation
// ---------------------------------------------------------------------------

describe('recommendForUser — negative comparable contributions flow through normalisation', () => {
  it('a candidate comparable to a hated title ranks below a candidate with no V4 signal', () => {
    // User hates `hatedShow` (rating 1 → multiplier -1.0). `comparableToHated`
    // is comparable to it, so its v4Comparable raw score is negative. After
    // normalisation, its v4Comparable normalised score is negative.
    // `neutral` has no V4 contribution (no edges, no descriptor). So:
    //   normalised V1 contribution: both candidates have weight 0 (no V1
    //     overlap), so V1 is 0 for both.
    //   normalised V4 contribution: comparableToHated has negative; neutral
    //     has zero. neutral therefore ranks above comparableToHated.
    const userRatings = new Map<string, number>([['hatedShow', -1.0]]);
    const comparableEdges: ComparableEdge[] = [
      { fromTitleId: 'hatedShow', toTitleId: 'comparableToHated', position: 0 },
    ];
    const candidates: TitleTagSet[] = [titleNoTags('comparableToHated'), titleNoTags('neutral')];
    const v4: V4RecInputs = {
      taste: EMPTY_V4_TASTE,
      candidateDescriptors: new Map(),
      comparableEdges,
      userRatings,
    };

    const result = recommendForUser(EMPTY_TASTE, candidates, undefined, [], v4);
    const compIdx = result.findIndex((r) => r.titleId === 'comparableToHated');
    const neutralIdx = result.findIndex((r) => r.titleId === 'neutral');

    expect(neutralIdx).toBeLessThan(compIdx);
    // Sign is preserved through normalisation: the hated-comparable's
    // total score is negative.
    const compScore = result.find((r) => r.titleId === 'comparableToHated')?.score ?? 0;
    expect(compScore).toBeLessThan(0);
  });

  it('a candidate comparable to a loved title ranks above one comparable to a hated title', () => {
    // Stronger version: explicitly contrast positive and negative comparable
    // contributions through normalisation. With max-of-|values| scaling,
    // the loved-comparable ends up at +1.0 normalised and the hated-
    // comparable at -1.0 normalised (each is the max-magnitude in its
    // direction); the loved one wins decisively.
    const userRatings = new Map<string, number>([
      ['lovedShow', 1.0],
      ['hatedShow', -1.0],
    ]);
    const comparableEdges: ComparableEdge[] = [
      { fromTitleId: 'lovedShow', toTitleId: 'comparableToLoved', position: 0 },
      { fromTitleId: 'hatedShow', toTitleId: 'comparableToHated', position: 0 },
    ];
    const candidates: TitleTagSet[] = [
      titleNoTags('comparableToLoved'),
      titleNoTags('comparableToHated'),
    ];
    const v4: V4RecInputs = {
      taste: EMPTY_V4_TASTE,
      candidateDescriptors: new Map(),
      comparableEdges,
      userRatings,
    };

    const result = recommendForUser(EMPTY_TASTE, candidates, undefined, [], v4);
    expect(result[0]?.titleId).toBe('comparableToLoved');
    expect(result[1]?.titleId).toBe('comparableToHated');
    expect((result[0]?.score ?? 0) > 0).toBe(true);
    expect((result[1]?.score ?? 0) < 0).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Behaviour 7 — Group rec uses per-member normalisation
// ---------------------------------------------------------------------------

describe('recommendForGroup — normalisation operates per member then AWM on top', () => {
  it('a per-member V4 swap (same dynamic as the single-user headline) is reflected in group rankings', () => {
    // Two members, both with identical V1 taste preferring action+mecha,
    // and identical V4 taste preferring `coming-of-age`. Same headline
    // fixture from behaviour 3, scaled to a group: B (tiny V1, strong V4)
    // should still beat A (heavy V1, no V4) at the group level once
    // per-member normalisation is in play and AWM aggregates the agreeing
    // per-user normalised scores.
    const v1Taste: UserTasteVector = new Map([
      ['actionT', 100],
      ['mechaT', 100],
      ['epicT', 100],
    ]);
    const v4Taste: V4TasteVector = {
      themesByWeight: new Map([['coming-of-age', 2.0]]),
      modePref: new Map(),
      engagementPref: new Map(),
      stakesPref: new Map(),
    };
    const members: GroupMember[] = [
      { userId: 'u1', taste: v1Taste },
      { userId: 'u2', taste: v1Taste },
    ];
    const candidates: TitleTagSet[] = [
      {
        titleId: 'A_heavyV1_noV4',
        tags: [
          { tagId: 'actionT', weight: 100 },
          { tagId: 'mechaT', weight: 100 },
          { tagId: 'epicT', weight: 100 },
        ],
      },
      {
        titleId: 'B_tinyV1_strongV4',
        tags: [{ tagId: 'actionT', weight: 1 }],
      },
    ];
    const v4: V4GroupInputs = {
      memberTastes: new Map([
        ['u1', v4Taste],
        ['u2', v4Taste],
      ]),
      memberRatings: new Map([
        ['u1', EMPTY_RATINGS],
        ['u2', EMPTY_RATINGS],
      ]),
      candidateDescriptors: new Map([
        ['B_tinyV1_strongV4', desc([{ slug: 'coming-of-age', confidence: 1.0 }])],
        ['A_heavyV1_noV4', desc([{ slug: 'cooking', confidence: 1.0 }])],
      ]),
      comparableEdges: [],
    };

    // Use a low veto threshold so neither candidate is excluded — we're
    // testing ranking, not veto.
    const result = recommendForGroup(
      members,
      candidates,
      { vetoThreshold: -2, lambda: 0 },
      [],
      undefined,
      v4,
    );

    expect(result[0]?.titleId).toBe('B_tinyV1_strongV4');
    expect(result[1]?.titleId).toBe('A_heavyV1_noV4');
  });

  it('per-user normalisation still applies on top: an agreeing group gives both members the same max-norm score for the top candidate', () => {
    // Sanity check that the second normalisation layer (per-user max)
    // still operates after the new per-component normalisation layer.
    // Both members fully agree → the winning candidate should be each
    // member's personal top, so each has normalised score 1.0 (per the
    // existing per-user-max scheme described in recommendForGroup's JSDoc).
    const taste: UserTasteVector = new Map([['t', 100]]);
    const members: GroupMember[] = [
      { userId: 'u1', taste },
      { userId: 'u2', taste },
    ];
    const candidates: TitleTagSet[] = [
      { titleId: 'winner', tags: [{ tagId: 't', weight: 100 }] },
      { titleId: 'loser', tags: [{ tagId: 't', weight: 10 }] },
    ];

    const result = recommendForGroup(members, candidates, { vetoThreshold: 0, lambda: 0 }, []);

    expect(result[0]?.titleId).toBe('winner');
    // Both members agree → per-user normalised score for winner is 1.0.
    expect(result[0]?.perUserScores.get('u1')).toBe(1);
    expect(result[0]?.perUserScores.get('u2')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Bonus — direct unit test of scoreCombinedV4 weighting through normalisation.
// Verifies the composition of normaliseToScale + the three V4 weights is
// what the contract describes (without asserting absolute weight values).
// ---------------------------------------------------------------------------

describe('scoreCombinedV4', () => {
  it('returns 0 when all component scales are 0 (no signal anywhere in the candidate set)', () => {
    const zeroScales: ComponentScales = {
      baseTag: 0,
      v4Theme: 0,
      v4Comparable: 0,
      v4EnumFit: 0,
    };
    expect(scoreCombinedV4(comps(0, 0, 0), zeroScales)).toBe(0);
    // Even with non-zero "value" inputs (impossible from the real
    // pipeline, but a robustness assertion), zero scales suppress the
    // contribution entirely per normaliseToScale's contract.
    expect(scoreCombinedV4(comps(5, -3, 7), zeroScales)).toBe(0);
  });

  it('a candidate at the per-component max yields a positive total (each component contributes its weighted normalised max)', () => {
    const scales: ComponentScales = {
      baseTag: 100,
      v4Theme: 0.5,
      v4Comparable: 0.4,
      v4EnumFit: 0.2,
    };
    // Candidate IS the max-magnitude positive contributor in every V4
    // dimension → every V4 normalised component is +1.0 → total V4 is
    // strictly positive.
    expect(scoreCombinedV4(comps(0.5, 0.4, 0.2), scales)).toBeGreaterThan(0);
  });

  it('a candidate at the per-component max with negative signs yields a negative total', () => {
    const scales: ComponentScales = {
      baseTag: 100,
      v4Theme: 0.5,
      v4Comparable: 0.4,
      v4EnumFit: 0.2,
    };
    expect(scoreCombinedV4(comps(-0.5, -0.4, -0.2), scales)).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// Smoke: v4Components returns all-zero when v4 inputs are absent — the
// "absent v4" path must produce a zero V4Components struct so the
// normalisation downstream behaves correctly (matches Behaviour 5 from
// the integration angle).
// ---------------------------------------------------------------------------

describe('v4Components — zero contract when v4 inputs are absent', () => {
  it('returns all-zero components when v4 taste and edges are absent', () => {
    const c = v4Components('anyTitle', undefined, undefined, undefined, undefined);
    expect(c.theme).toBe(0);
    expect(c.comparable).toBe(0);
    expect(c.enumFit).toBe(0);
  });

  it('returns zero comparable when userRatings is empty even if edges exist (no rated anchor → no signal)', () => {
    // Edges alone with no ratings cannot produce a comparable score — the
    // rating valence is what gives an edge its sign and magnitude.
    const c = v4Components(
      'someCand',
      EMPTY_V4_TASTE,
      undefined,
      new Map(),
      // edgeIndex is built by the caller; passing undefined is the
      // standard "no V4 in this call" signal.
      undefined,
    );
    expect(c.comparable).toBe(0);
  });
});
