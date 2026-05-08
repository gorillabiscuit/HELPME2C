// Eval-harness behavioural tests — written under Approach B (sub-agent
// isolation per packages/ml/CLAUDE.md §8.1) against the contract in
// ADR-0020 + the JSDoc on metrics.ts / harness.ts. Builds on top of the
// structural smoke.test.ts; this file asserts the actual semantic
// contracts (per-metric correctness, sweep cartesian shape, cross-cell
// research invariants).
//
// Style note: assertions on RANKINGS and INVARIANTS not absolute scores
// (per packages/ml/CLAUDE.md). The few absolute-value assertions that
// exist are on cases where the metric semantics pin the value exactly
// (e.g. allHappyCount on a constructed input with known scores).
//
// We assert against ALL_HAPPY_THRESHOLD and EVAL_TOP_N from types.ts
// rather than hardcoding 0.7 / 20, so a future ADR-driven shift moves
// the assertions automatically.

import { describe, expect, it } from 'vitest';
import type { GroupRecommendation, TagThemeMembership, TitleTagSet } from '../recommendation';
import {
  SCENARIO_ANIME_TV_MIXED,
  SCENARIO_COMPATIBLE_COUPLE,
  SCENARIO_INCOMPATIBLE_COUPLE,
} from './fixtures';
import { parameterSweep } from './harness';
import { computeMetrics } from './metrics';
import { ALL_HAPPY_THRESHOLD, EVAL_TOP_N } from './types';

// ---------------------------------------------------------------------------
// Inline-fixture helpers for the computeMetrics unit tests. We construct
// GroupRecommendation arrays directly (no algorithm involvement) so each
// metric is asserted against a hand-computed expected value.
// ---------------------------------------------------------------------------

const rec = (
  titleId: string,
  perUserScores: ReadonlyArray<readonly [string, number]>,
  groupScore: number = 0,
): GroupRecommendation => ({
  titleId,
  groupScore,
  perUserScores: new Map(perUserScores),
});

describe('computeMetrics', () => {
  it('returns all-zero metrics with vetoCount equal to totalCandidates when output is empty', () => {
    const candidates: ReadonlyArray<TitleTagSet> = [
      { titleId: 'a', tags: [{ tagId: 't:x', weight: 100 }] },
      { titleId: 'b', tags: [{ tagId: 't:y', weight: 100 }] },
    ];
    const themes: ReadonlyArray<TagThemeMembership> = [];

    const metrics = computeMetrics([], candidates.length, candidates, themes);

    expect(metrics.topN).toBe(0);
    expect(metrics.totalCandidates).toBe(2);
    expect(metrics.vetoCount).toBe(2);
    expect(metrics.meanScore).toBe(0);
    expect(metrics.minScore).toBe(0);
    expect(metrics.meanStddev).toBe(0);
    expect(metrics.allHappyCount).toBe(0);
    expect(metrics.themeDiversity).toBe(0);
  });

  it('reports topN equal to output length and vetoCount as the difference from totalCandidates', () => {
    const candidates: ReadonlyArray<TitleTagSet> = [
      { titleId: 'a', tags: [] },
      { titleId: 'b', tags: [] },
      { titleId: 'c', tags: [] },
      { titleId: 'd', tags: [] },
      { titleId: 'e', tags: [] },
    ];
    const output = [rec('a', [['u1', 0.8]]), rec('b', [['u1', 0.6]])];

    const metrics = computeMetrics(output, candidates.length, candidates, []);

    expect(metrics.topN).toBe(2);
    expect(metrics.totalCandidates).toBe(5);
    expect(metrics.vetoCount).toBe(3);
  });

  it('averages meanScore across both items and members', () => {
    // Two items, two members per item. Scores: 0.8, 0.6, 0.4, 0.2.
    // Expected mean = (0.8 + 0.6 + 0.4 + 0.2) / 4 = 0.5
    const output = [
      rec('a', [
        ['u1', 0.8],
        ['u2', 0.6],
      ]),
      rec('b', [
        ['u1', 0.4],
        ['u2', 0.2],
      ]),
    ];

    const metrics = computeMetrics(output, 2, [], []);

    expect(metrics.meanScore).toBeCloseTo(0.5, 10);
  });

  it('reports minScore as the global minimum per-user score across the entire output', () => {
    // Item a has a low (0.55) and a high (0.95). Item b has a much lower
    // worst (0.10). Global min must be 0.10, not item-a's 0.55.
    const output = [
      rec('a', [
        ['u1', 0.95],
        ['u2', 0.55],
      ]),
      rec('b', [
        ['u1', 0.8],
        ['u2', 0.1],
      ]),
    ];

    const metrics = computeMetrics(output, 2, [], []);

    expect(metrics.minScore).toBeCloseTo(0.1, 10);
  });

  it('averages per-item stddev across items for meanStddev', () => {
    // Item a perUserScores: [0.5, 0.7] → mean 0.6, var = ((0.1)^2 + (-0.1)^2)/2 = 0.01
    //   stddev = 0.1
    // Item b perUserScores: [0.4, 0.4] → identical, stddev = 0
    // meanStddev = (0.1 + 0) / 2 = 0.05
    const output = [
      rec('a', [
        ['u1', 0.5],
        ['u2', 0.7],
      ]),
      rec('b', [
        ['u1', 0.4],
        ['u2', 0.4],
      ]),
    ];

    const metrics = computeMetrics(output, 2, [], []);

    expect(metrics.meanStddev).toBeCloseTo(0.05, 10);
  });

  it('counts only items where every member is at or above ALL_HAPPY_THRESHOLD', () => {
    // a: both >= threshold → counts
    // b: one strictly below → does not count
    // c: exactly at threshold for both → counts (>= is inclusive)
    // d: one well above, one well below → does not count
    const output = [
      rec('a', [
        ['u1', 0.9],
        ['u2', 0.75],
      ]),
      rec('b', [
        ['u1', 0.95],
        ['u2', ALL_HAPPY_THRESHOLD - 0.01],
      ]),
      rec('c', [
        ['u1', ALL_HAPPY_THRESHOLD],
        ['u2', ALL_HAPPY_THRESHOLD],
      ]),
      rec('d', [
        ['u1', 0.95],
        ['u2', 0.2],
      ]),
    ];

    const metrics = computeMetrics(output, 4, [], []);

    expect(metrics.allHappyCount).toBe(2);
  });

  it('counts distinct themes covered by tags on the top-N output', () => {
    // Two items share the th:tragedy theme via different tags (one TMDB,
    // one AniList). The themeDiversity must count th:tragedy once, not
    // twice. Item b also covers th:revenge.
    const candidates: ReadonlyArray<TitleTagSet> = [
      {
        titleId: 'a',
        tags: [{ tagId: 't:tmdb:tragedy', weight: 100 }],
      },
      {
        titleId: 'b',
        tags: [
          { tagId: 't:anilist:Tragedy', weight: 100 },
          { tagId: 't:anilist:Revenge', weight: 100 },
        ],
      },
    ];
    const themes: ReadonlyArray<TagThemeMembership> = [
      { tagId: 't:tmdb:tragedy', themeId: 'th:tragedy', strength: 100 },
      { tagId: 't:anilist:Tragedy', themeId: 'th:tragedy', strength: 100 },
      { tagId: 't:anilist:Revenge', themeId: 'th:revenge', strength: 100 },
    ];
    const output = [rec('a', [['u1', 0.9]]), rec('b', [['u1', 0.8]])];

    const metrics = computeMetrics(output, candidates.length, candidates, themes);

    // Distinct themes: th:tragedy + th:revenge = 2
    expect(metrics.themeDiversity).toBe(2);
  });

  it('does not count themes whose tags do not appear on any output item', () => {
    // Theme membership references tags that aren't on the surviving
    // candidate's tags. themeDiversity should be 0.
    const candidates: ReadonlyArray<TitleTagSet> = [
      { titleId: 'a', tags: [{ tagId: 't:plain', weight: 100 }] },
    ];
    const themes: ReadonlyArray<TagThemeMembership> = [
      { tagId: 't:other', themeId: 'th:other', strength: 100 },
    ];
    const output = [rec('a', [['u1', 0.9]])];

    const metrics = computeMetrics(output, 1, candidates, themes);

    expect(metrics.themeDiversity).toBe(0);
  });

  it('keeps allHappyCount at zero when at least one member is below threshold on every item', () => {
    const output = [
      rec('a', [
        ['u1', 0.9],
        ['u2', 0.5],
      ]),
      rec('b', [
        ['u1', 0.95],
        ['u2', 0.4],
      ]),
    ];

    const metrics = computeMetrics(output, 2, [], []);

    expect(metrics.allHappyCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// parameterSweep tests use the real fixtures + algorithm. These assert
// behavioural invariants the harness exists to surface (per ADR-0020).
// ---------------------------------------------------------------------------

describe('parameterSweep', () => {
  it('produces a 16-cell default sweep matching the cartesian product of thresholds × lambdas', () => {
    const report = parameterSweep(SCENARIO_COMPATIBLE_COUPLE);

    expect(report.archetype).toBe('compatible-couple');
    expect(report.cells).toHaveLength(16);

    // Reconstruct the (threshold, lambda) pairs and assert they match the
    // documented defaults exactly.
    const defaults = {
      thresholds: [0, 0.25, 0.5, 0.75],
      lambdas: [0, 0.25, 0.5, 1.0],
    };
    const expectedPairs = new Set<string>();
    for (const t of defaults.thresholds) {
      for (const l of defaults.lambdas) {
        expectedPairs.add(`${t}|${l}`);
      }
    }
    const actualPairs = new Set(report.cells.map((c) => `${c.vetoThreshold}|${c.lambda}`));
    expect(actualPairs).toEqual(expectedPairs);
  });

  it('respects custom threshold and lambda grids producing the right cartesian count', () => {
    const thresholds = [0, 0.3, 0.6];
    const lambdas = [0, 0.5];
    const report = parameterSweep(SCENARIO_COMPATIBLE_COUPLE, thresholds, lambdas);

    expect(report.cells).toHaveLength(thresholds.length * lambdas.length);
    const observedThresholds = new Set(report.cells.map((c) => c.vetoThreshold));
    const observedLambdas = new Set(report.cells.map((c) => c.lambda));
    expect(observedThresholds).toEqual(new Set(thresholds));
    expect(observedLambdas).toEqual(new Set(lambdas));
  });

  it('keeps every cell metric within its valid range across the default sweep', () => {
    const report = parameterSweep(SCENARIO_COMPATIBLE_COUPLE);

    for (const cell of report.cells) {
      const m = cell.metrics;
      expect(m.topN).toBeGreaterThanOrEqual(0);
      expect(m.topN).toBeLessThanOrEqual(EVAL_TOP_N);
      expect(m.meanScore).toBeGreaterThanOrEqual(0);
      expect(m.meanScore).toBeLessThanOrEqual(1);
      expect(m.minScore).toBeGreaterThanOrEqual(0);
      expect(m.minScore).toBeLessThanOrEqual(1);
      expect(m.meanStddev).toBeGreaterThanOrEqual(0);
      // stddev of values in [0,1] is bounded above by 0.5 (extreme split).
      expect(m.meanStddev).toBeLessThanOrEqual(0.5);
      expect(m.allHappyCount).toBeGreaterThanOrEqual(0);
      expect(m.allHappyCount).toBeLessThanOrEqual(m.topN);
      expect(m.themeDiversity).toBeGreaterThanOrEqual(0);
      expect(m.vetoCount).toBe(m.totalCandidates - m.topN);
    }
  });

  it('admits all candidates at vetoThreshold=0 for the compatible-couple archetype', () => {
    // At threshold 0, every member's normalised score is >= 0 trivially,
    // so no candidate is vetoed. topN equals min(totalCandidates, limit).
    const report = parameterSweep(SCENARIO_COMPATIBLE_COUPLE);
    const totalCandidates = SCENARIO_COMPATIBLE_COUPLE.candidates.length;
    const expectedTopN = Math.min(totalCandidates, EVAL_TOP_N);

    const zeroThresholdCells = report.cells.filter((c) => c.vetoThreshold === 0);
    expect(zeroThresholdCells.length).toBeGreaterThan(0);
    for (const cell of zeroThresholdCells) {
      expect(cell.metrics.topN).toBe(expectedTopN);
    }
  });

  it('non-increases topN as vetoThreshold rises for fixed lambda on the compatible-couple archetype', () => {
    // Monotonicity: tightening the floor cannot increase the surviving
    // set. For each lambda, sort cells by threshold and assert topN only
    // ever falls or stays the same.
    const report = parameterSweep(SCENARIO_COMPATIBLE_COUPLE);
    const lambdas = Array.from(new Set(report.cells.map((c) => c.lambda)));

    for (const lambda of lambdas) {
      const cellsForLambda = report.cells
        .filter((c) => c.lambda === lambda)
        .sort((a, b) => a.vetoThreshold - b.vetoThreshold);

      for (let i = 1; i < cellsForLambda.length; i += 1) {
        const prev = cellsForLambda[i - 1]!;
        const curr = cellsForLambda[i]!;
        expect(curr.metrics.topN).toBeLessThanOrEqual(prev.metrics.topN);
      }
    }
  });

  it('keeps topN invariant under lambda changes for fixed vetoThreshold (lambda only re-ranks survivors)', () => {
    // Lambda is the disagreement penalty applied to scoring AFTER the
    // veto filter. Changing it must not change the SET of surviving
    // candidates — it only re-orders them. For a fixed threshold, topN
    // (and the multiset of titleIds in the top-N) must be identical
    // across lambdas, modulo top-N truncation. With limit >= surviving,
    // identity is exact.
    const limit = 1000; // generous limit to skip top-N truncation effects
    const report = parameterSweep(
      SCENARIO_COMPATIBLE_COUPLE,
      [0, 0.25, 0.5, 0.75],
      [0, 0.25, 0.5, 1.0],
      limit,
    );
    const thresholds = Array.from(new Set(report.cells.map((c) => c.vetoThreshold)));

    for (const threshold of thresholds) {
      const cellsForThreshold = report.cells.filter((c) => c.vetoThreshold === threshold);
      const topNs = new Set(cellsForThreshold.map((c) => c.metrics.topN));
      expect(topNs.size).toBe(1);
    }
  });

  it('shrinks topN when raising vetoThreshold from 0 to 0.5 on the incompatible-couple archetype', () => {
    // ADR-0020: incompatible couples should produce honestly-empty
    // output at sensible thresholds. At threshold=0 some candidates can
    // get through (any normalised score >= 0 passes); at threshold=0.5
    // most should be vetoed because each member's preferred genres
    // produce zero raw score for the other.
    const report = parameterSweep(SCENARIO_INCOMPATIBLE_COUPLE);

    const atZero = report.cells.find((c) => c.vetoThreshold === 0 && c.lambda === 0.5);
    const atHalf = report.cells.find((c) => c.vetoThreshold === 0.5 && c.lambda === 0.5);
    expect(atZero).toBeDefined();
    expect(atHalf).toBeDefined();
    expect(atHalf!.metrics.topN).toBeLessThan(atZero!.metrics.topN);
  });

  it('still surfaces some recommendations at vetoThreshold=0.75 for the compatible-couple archetype', () => {
    // ADR-0020: tightly-aligned couples should keep output non-empty even
    // at strict floors — that's the "compatible" property. If this fails,
    // either the algorithm broke or the fixture's overlap is too weak.
    const report = parameterSweep(SCENARIO_COMPATIBLE_COUPLE);

    const strictCells = report.cells.filter((c) => c.vetoThreshold === 0.75);
    expect(strictCells.length).toBeGreaterThan(0);
    for (const cell of strictCells) {
      expect(cell.metrics.topN).toBeGreaterThan(0);
    }
  });

  it('produces non-empty output at vetoThreshold=0.5 for the anime-tv-mixed archetype because the theme bridge saves it', () => {
    // ADR-0020 §what-would-change-our-mind: the cross-medium theme bridge
    // is the differentiator. With theme membership present, anime+TV
    // couples sharing zero direct tags should still get recs because
    // tragedy/revenge/super-power tags bridge across media.
    const report = parameterSweep(SCENARIO_ANIME_TV_MIXED);

    const cell = report.cells.find((c) => c.vetoThreshold === 0.5 && c.lambda === 0.5);
    expect(cell).toBeDefined();
    expect(cell!.metrics.topN).toBeGreaterThan(0);
  });

  it('carries the archetype description through to the report unchanged', () => {
    // Trivial-but-load-bearing: callers (CLI runner, formatReport) rely on
    // these fields being passed through, and a refactor that drops them
    // would silently degrade the markdown report.
    const report = parameterSweep(SCENARIO_COMPATIBLE_COUPLE);

    expect(report.archetype).toBe(SCENARIO_COMPATIBLE_COUPLE.group.archetype);
    expect(report.description).toBe(SCENARIO_COMPATIBLE_COUPLE.group.description);
  });
});
