// Eval harness — drives recommendForGroup against synthetic scenarios,
// computes metrics, and supports parameter sweeps.
//
// Per ADR-0020 §required-before-code: this is the offline instrument
// that calibrates (vetoThreshold, lambda) against the five archetypes
// before the algorithm gets surfaced to users. Anything calling this
// is research tooling — no user-facing code consumes the harness output.

import { recommendForGroup, type GroupScoreParams } from '../recommendation';
import { computeMetrics } from './metrics';
import {
  EVAL_TOP_N,
  type EvalMetrics,
  type SweepCell,
  type SweepReport,
  type SyntheticScenario,
} from './types';

/**
 * Score one scenario with one (vetoThreshold, lambda) point and compute
 * its metrics. Returns the metrics block — most callers will want
 * parameterSweep instead.
 */
export function evaluateScenario(
  scenario: SyntheticScenario,
  params: GroupScoreParams,
  limit: number = EVAL_TOP_N,
): EvalMetrics {
  const output = recommendForGroup(
    scenario.group.members,
    scenario.candidates,
    params,
    scenario.themeMembership,
    limit,
  );
  return computeMetrics(
    output,
    scenario.candidates.length,
    scenario.candidates,
    scenario.themeMembership,
  );
}

/**
 * Run a parameter sweep over a (vetoThreshold × lambda) grid for one
 * scenario. Returns a structured report — callable from tests, the CLI
 * runner, or future CI gates.
 *
 * The grid is the cartesian product of `thresholds` × `lambdas`. Default
 * to a 4×4 grid covering the interesting range per ADR-0020:
 *   thresholds: 0, 0.25, 0.5, 0.75
 *   lambdas:    0, 0.25, 0.5, 1.0
 *
 * 16 cells per scenario, 5 scenarios = 80 evaluations. Each evaluation
 * is O(members × candidates) — fast enough to run on every CI build if
 * we wire it as a regression gate later.
 *
 * **Caller note**: if you compare metrics across cells with different
 * `lambda` values at the same threshold, prefer a generous `limit`
 * (above your candidate count). Lambda only re-ranks survivors, but if
 * the limit truncates, two lambdas can produce different top-N sets and
 * the metrics become not-quite-comparable. The default `EVAL_TOP_N=20`
 * is fine for the synthetic fixtures (14 candidates, never truncates)
 * but bite if someone runs the harness on a real catalog without
 * raising the limit.
 */
export function parameterSweep(
  scenario: SyntheticScenario,
  thresholds: ReadonlyArray<number> = [0, 0.25, 0.5, 0.75],
  lambdas: ReadonlyArray<number> = [0, 0.25, 0.5, 1.0],
  limit: number = EVAL_TOP_N,
): SweepReport {
  const cells: SweepCell[] = [];
  for (const vetoThreshold of thresholds) {
    for (const lambda of lambdas) {
      const metrics = evaluateScenario(scenario, { vetoThreshold, lambda }, limit);
      cells.push({ vetoThreshold, lambda, metrics });
    }
  }
  return {
    archetype: scenario.group.archetype,
    description: scenario.group.description,
    cells,
  };
}

/**
 * Sweep all scenarios and return the array of reports. Convenience
 * wrapper for "run the full eval suite."
 */
export function fullSweep(
  scenarios: ReadonlyArray<SyntheticScenario>,
  thresholds?: ReadonlyArray<number>,
  lambdas?: ReadonlyArray<number>,
  limit?: number,
): ReadonlyArray<SweepReport> {
  return scenarios.map((s) => parameterSweep(s, thresholds, lambdas, limit));
}

/**
 * Stringify one report as a human-readable markdown block. Useful for
 * dumping to stdout from a CLI runner or pasting into an ADR follow-up.
 *
 * Format mirrors a typical "one-page report" — header + per-cell row
 * showing the headline metrics. Use `formatFullSweep` for multi-scenario
 * runs.
 */
export function formatReport(report: SweepReport): string {
  const lines: string[] = [];
  lines.push(`## ${report.archetype}`);
  lines.push('');
  lines.push(`_${report.description}_`);
  lines.push('');
  lines.push('| veto | λ | topN | excluded | mean | min | meanStddev | all-≥0.7 | themes |');
  lines.push('|-----:|---:|----:|--------:|------:|----:|----------:|--------:|-------:|');
  for (const cell of report.cells) {
    const m = cell.metrics;
    lines.push(
      `| ${cell.vetoThreshold.toFixed(2)} | ${cell.lambda.toFixed(2)} | ${m.topN} | ${m.vetoCount} | ${m.meanScore.toFixed(3)} | ${m.minScore.toFixed(3)} | ${m.meanStddev.toFixed(3)} | ${m.allHappyCount} | ${m.themeDiversity} |`,
    );
  }
  return lines.join('\n');
}

/** Stringify a full sweep across multiple scenarios as one markdown doc. */
export function formatFullSweep(reports: ReadonlyArray<SweepReport>): string {
  return reports.map((r) => formatReport(r)).join('\n\n');
}
