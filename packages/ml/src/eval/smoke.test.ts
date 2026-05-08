// Structural smoke test — runs the full sweep across all 5 ADR-0020
// archetypes and asserts the output shape and metric ranges. The
// research-grade "is this parameter point correct?" judgment lives in
// eval-harness.test.ts (sub-agent-authored) + the human-eyes one-page
// report.
//
// To produce a printed report, import `fullSweep` + `formatFullSweep`
// from a non-test script — keeping the markdown out of committed test
// output.

import { describe, expect, it } from 'vitest';
import { ALL_SCENARIOS, formatFullSweep, fullSweep } from './index';

describe('eval harness smoke', () => {
  it('runs the full sweep across all 5 archetypes without crashing', () => {
    const reports = fullSweep(ALL_SCENARIOS);

    expect(reports).toHaveLength(ALL_SCENARIOS.length);
    for (const report of reports) {
      // Default sweep is 4 thresholds × 4 lambdas = 16 cells per archetype.
      expect(report.cells).toHaveLength(16);
      for (const cell of report.cells) {
        expect(cell.metrics.topN).toBeGreaterThanOrEqual(0);
        expect(cell.metrics.meanScore).toBeGreaterThanOrEqual(0);
        expect(cell.metrics.meanScore).toBeLessThanOrEqual(1);
        expect(cell.metrics.minScore).toBeGreaterThanOrEqual(0);
        expect(cell.metrics.minScore).toBeLessThanOrEqual(1);
        expect(cell.metrics.meanStddev).toBeGreaterThanOrEqual(0);
        expect(cell.metrics.allHappyCount).toBeGreaterThanOrEqual(0);
        expect(cell.metrics.themeDiversity).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('formats the sweep as non-empty markdown', () => {
    const reports = fullSweep(ALL_SCENARIOS);
    const md = formatFullSweep(reports);
    expect(md.length).toBeGreaterThan(0);
    // Each archetype's section header should appear.
    for (const report of reports) {
      expect(md).toContain(`## ${report.archetype}`);
    }
  });
});
