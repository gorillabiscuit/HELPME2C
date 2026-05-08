import type { TitleTagSet } from '@helpme2c/ml';

/**
 * Group flat (titleId, tagId, weight) DB rows into the `TitleTagSet[]`
 * shape that packages/ml's recommendForUser / recommendForGroup expect.
 *
 * Shared between the personal-rec and group-rec Inngest functions
 * because both walk the same DB → ML conversion shape; duplicating
 * was an explicit acknowledgement in the M7-chunk-2 commit and is
 * extracted here now that we have two callers (the third one is the
 * eval-harness fixture builder, which lives in packages/ml and uses
 * synthetic data, so doesn't share this surface).
 *
 * The output groups every input row by titleId; each output entry
 * preserves the order in which titles first appeared in the input.
 * Tag order within a title follows input order. Both invariants are
 * stable for fixed inputs — the rec engine is order-independent so
 * neither is contractually required, but reproducibility matters for
 * tests.
 */
export function groupTagsIntoTitleSets(
  rows: ReadonlyArray<{ titleId: string; tagId: string; weight: number }>,
): TitleTagSet[] {
  const byTitle = new Map<
    string,
    { titleId: string; tags: Array<{ tagId: string; weight: number }> }
  >();
  for (const row of rows) {
    let entry = byTitle.get(row.titleId);
    if (!entry) {
      entry = { titleId: row.titleId, tags: [] };
      byTitle.set(row.titleId, entry);
    }
    entry.tags.push({ tagId: row.tagId, weight: row.weight });
  }
  return Array.from(byTitle.values());
}
