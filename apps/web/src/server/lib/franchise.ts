// Franchise-dedup helpers — shared between the recommendations reader
// (apps/web/src/server/routers/recommendations.ts) and the titles.popular
// reader that backs /onboarding + /taste cold-start pickers. Same logic
// in both places; same bug fixes propagate to both.
//
// The recommendation engine itself (packages/ml) doesn't know about
// franchises — it scores titles independently. Dedup happens at read
// time so the engine stays simple and franchise rules can evolve without
// re-running offline jobs. See ADR-0008 and the inline JSDoc on
// recommendation.ts for the engine's contract.

/**
 * Normalise a title to its franchise root by stripping common season /
 * cour / part suffixes. Used so e.g. "Attack on Titan", "Attack on Titan
 * Season 2", and "Attack on Titan: The Final Season" collapse to a
 * single key.
 *
 * Returned key is always lowercased and trimmed.
 *
 * Multi-pass: strips are applied repeatedly until the title stops
 * changing, so compound suffixes like "Attack on Titan Season 3 Part 2"
 * collapse correctly ("Part 2" → "Season 3" → ""). Capped at 6 passes
 * to avoid pathological infinite loops on weird inputs.
 *
 * "Final Season" / "Final Cour" / "Final Part" is recognised in four
 * separator forms: bare space, colon (`:`), hyphen-minus (`-`), and
 * en-dash (`–`, U+2013). An optional leading "The" is allowed in each.
 *
 * Intentionally conservative — keeps colons and bare trailing numbers
 * intact, so distinct works like "Steins;Gate" vs "Steins;Gate 0" or
 * "Demon Slayer: Entertainment District Arc" don't get collapsed.
 * Tradeoff: under-dedups on titles that use bare numbers as season
 * markers (e.g. "Konosuba 2" stays distinct from "Konosuba"). Acceptable
 * for v1; the real fix is a franchise_id column populated from AniList
 * relations.
 */
export function franchiseKey(title: string): string {
  let key = title.toLowerCase().trim();
  for (let pass = 0; pass < 6; pass++) {
    const previous = key;
    key = key
      .replace(/\s*\(\d{4}\)$/, '') // " (2023)"
      .replace(/\s*[:\-–]\s*(?:the\s+)?final\s+(?:season|cour|part)$/i, '') // ": The Final Season", " - Final Cour"
      .replace(/\s+(?:the\s+)?final\s+(?:season|cour|part)$/i, '') // " The Final Season", " Final Part"
      .replace(/\s+(?:season|cour|part|s)\s*\d+$/i, '') // " Season 2", " S2", " Part 3", " Cour 1"
      .replace(/\s+\d+(?:st|nd|rd|th)\s+season$/i, '') // " 2nd Season"
      .replace(/\s+(?:ii|iii|iv|v|vi|vii|viii|ix|x)$/i, '') // " II", " III"
      .trim();
    if (key === previous) break;
  }
  return key;
}

const ROMAN_TO_INT: Record<string, number> = {
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
  x: 10,
};

/**
 * Within a franchise group, return an integer where LOWER = better
 * representative for first-time discovery.
 *
 *   0  — series entry (no season suffix; trailing `(YYYY)` doesn't count
 *        as a season — "Hunter x Hunter (2011)" is still a series entry)
 *   N  — explicit season/part/cour number (compound: max of all markers)
 *   ∞  — `Number.MAX_SAFE_INTEGER` for "Final Season" / "Final Cour" /
 *        "Final Part" (treat as last)
 *
 * Fallback: titles that differ from `key` but match none of the
 * recognised patterns return 1 (treated as a generic "season 1"). This
 * shouldn't occur in practice unless input is malformed.
 *
 * Why prefer no-suffix > S1 > S2 > … > Final: a user discovering the
 * franchise should land on the canonical entry, not on Season 3. The
 * franchise's position in the ranked list is decided by the caller
 * (recommendations uses the highest in-group engine score; popular uses
 * the highest in-group popularity).
 */
export function franchiseSpecificity(originalTitle: string, key: string): number {
  const lower = originalTitle.toLowerCase().trim();
  // Strip trailing "(2023)" first so "Hunter x Hunter (2011)" still
  // counts as a series entry, just versioned.
  const lowerNoYear = lower.replace(/\s*\(\d{4}\)$/, '');
  if (lowerNoYear === key) return 0;

  if (/(?:^|\s)(?:the\s+)?final\s+(?:season|cour|part)\b/i.test(lower)) {
    return Number.MAX_SAFE_INTEGER;
  }

  // Largest explicit numeric marker wins as the specificity. "Season 3
  // Part 2" → 3. We're picking representatives across the FAMILY of
  // entries; using max-number here keeps the ordering monotonic with
  // how franchises actually number sub-entries.
  let max = 1;
  const numPatterns = [
    /season\s*(\d+)/i,
    /part\s*(\d+)/i,
    /cour\s*(\d+)/i,
    /(\d+)(?:st|nd|rd|th)\s+season/i,
  ];
  for (const pat of numPatterns) {
    const m = lower.match(pat);
    if (m && m[1]) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n)) max = Math.max(max, n);
    }
  }

  const romanMatch = lower.match(/\s+(ii|iii|iv|v|vi|vii|viii|ix|x)$/i);
  if (romanMatch && romanMatch[1]) {
    const n = ROMAN_TO_INT[romanMatch[1].toLowerCase()];
    if (n) max = Math.max(max, n);
  }

  return max;
}

/**
 * Group rows by franchise and return one representative per franchise.
 *
 * Within a franchise, the representative is the row with the LOWEST
 * `franchiseSpecificity` — that function is ordered so series entry (0)
 * beats Season 1 beats Season 2 beats … beats Final (MAX_SAFE_INTEGER).
 * When multiple rows tie on specificity (e.g. two "Season 2" rows in
 * input), the first occurrence in `rows` wins; later ties are dropped.
 *
 * Output preserves the order in which each franchise's representative
 * first appeared in `rows`. So if rows are pre-sorted by popularity,
 * the output stays popularity-ranked.
 */
export function dedupeByFranchise<T extends { title: string }>(rows: ReadonlyArray<T>): T[] {
  // Group: franchiseKey -> { representative, specificity, position }.
  // `position` tracks the order in which the franchise first appeared
  // so the output order matches the caller's input order.
  const groups = new Map<string, { representative: T; specificity: number; position: number }>();
  rows.forEach((row, index) => {
    const key = franchiseKey(row.title);
    const specificity = franchiseSpecificity(row.title, key);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, { representative: row, specificity, position: index });
    } else if (specificity < existing.specificity) {
      // Better representative — keep position so the franchise stays at
      // its original rank, just swap which row represents it.
      existing.representative = row;
      existing.specificity = specificity;
    }
  });

  return Array.from(groups.values())
    .sort((a, b) => a.position - b.position)
    .map((g) => g.representative);
}
