import { describe, it, expect } from 'vitest';
import {
  franchiseKey,
  franchiseSpecificity,
  dedupeByFranchise,
  aggregateByFranchise,
} from './franchise';

// Fixture conventions:
//   - `row(title, extras)` builds a minimal { title } row, optionally
//     extended for the generics test. Keeps test bodies short and matches
//     the helper style used in packages/ml/src/explain.test.ts.
//   - Tests are written from the JSDoc contract in franchise.ts only —
//     not the function bodies (Approach B isolation per CLAUDE.md §8.1).
//   - Assertions favour observable behaviour (returned key string, returned
//     order/identity of rows) rather than internal arithmetic.

const row = <T extends Record<string, unknown>>(
  title: string,
  extras?: T,
): { title: string } & T => ({ title, ...(extras ?? ({} as T)) });

// ----- franchiseKey -----------------------------------------------------

describe('franchiseKey — numeric season/cour/part stripping', () => {
  it('strips trailing " Season 2"', () => {
    expect(franchiseKey('Attack on Titan Season 2')).toBe('attack on titan');
  });

  it('strips trailing " Part 3"', () => {
    expect(franchiseKey('Attack on Titan Part 3')).toBe('attack on titan');
  });

  it('strips trailing " Cour 1"', () => {
    expect(franchiseKey('Attack on Titan Cour 1')).toBe('attack on titan');
  });

  it('strips trailing " S2" short form', () => {
    expect(franchiseKey('Attack on Titan S2')).toBe('attack on titan');
  });

  it('strips season suffix without a space between marker and digit', () => {
    expect(franchiseKey('Attack on Titan Season2')).toBe('attack on titan');
  });
});

describe('franchiseKey — ordinal season stripping', () => {
  it('strips " 2nd Season"', () => {
    expect(franchiseKey('My Hero Academia 2nd Season')).toBe('my hero academia');
  });

  it('strips " 3rd Season"', () => {
    expect(franchiseKey('My Hero Academia 3rd Season')).toBe('my hero academia');
  });

  it('strips " 4th Season"', () => {
    expect(franchiseKey('My Hero Academia 4th Season')).toBe('my hero academia');
  });

  it('strips " 1st Season"', () => {
    expect(franchiseKey('My Hero Academia 1st Season')).toBe('my hero academia');
  });
});

describe('franchiseKey — roman numeral stripping', () => {
  it('strips trailing " II"', () => {
    expect(franchiseKey('Symphogear II')).toBe('symphogear');
  });

  it('strips trailing " III"', () => {
    expect(franchiseKey('Symphogear III')).toBe('symphogear');
  });

  it('strips trailing " IV"', () => {
    expect(franchiseKey('Symphogear IV')).toBe('symphogear');
  });

  it('strips trailing " V"', () => {
    expect(franchiseKey('Symphogear V')).toBe('symphogear');
  });

  it('strips trailing " X"', () => {
    expect(franchiseKey('Symphogear X')).toBe('symphogear');
  });
});

describe('franchiseKey — "Final Season/Cour/Part" stripping', () => {
  it('strips ": The Final Season"', () => {
    expect(franchiseKey('Attack on Titan: The Final Season')).toBe('attack on titan');
  });

  it('strips ": Final Season" (no "the")', () => {
    expect(franchiseKey('Attack on Titan: Final Season')).toBe('attack on titan');
  });

  it('strips " - Final Cour" (hyphen separator)', () => {
    expect(franchiseKey('Attack on Titan - Final Cour')).toBe('attack on titan');
  });

  it('strips " – Final Part" (en-dash separator)', () => {
    expect(franchiseKey('Attack on Titan – Final Part')).toBe('attack on titan');
  });

  it('strips " The Final Season" without a separator', () => {
    expect(franchiseKey('Attack on Titan The Final Season')).toBe('attack on titan');
  });

  it('strips " Final Part" without leading "the" or separator', () => {
    expect(franchiseKey('Attack on Titan Final Part')).toBe('attack on titan');
  });
});

describe('franchiseKey — year-suffix stripping', () => {
  it('strips a trailing " (2023)"', () => {
    expect(franchiseKey('Some Show (2023)')).toBe('some show');
  });

  it('strips a trailing " (2011)"', () => {
    expect(franchiseKey('Hunter x Hunter (2011)')).toBe('hunter x hunter');
  });
});

describe('franchiseKey — multi-pass collapse on compound suffixes', () => {
  it('collapses "Season 3 Part 2" to the franchise root', () => {
    expect(franchiseKey('Attack on Titan Season 3 Part 2')).toBe('attack on titan');
  });

  it('collapses a year suffix combined with a season suffix', () => {
    // Two distinct strips on different passes: " Season 2" then " (2023)".
    expect(franchiseKey('Some Show Season 2 (2023)')).toBe('some show');
  });

  it('collapses "Season 2 Part 3" to the franchise root', () => {
    expect(franchiseKey('Made Up Show Season 2 Part 3')).toBe('made up show');
  });
});

describe('franchiseKey — preservation (must NOT strip)', () => {
  it('preserves "Steins;Gate" as-is', () => {
    expect(franchiseKey('Steins;Gate')).toBe('steins;gate');
  });

  it('preserves the bare trailing digit in "Steins;Gate 0"', () => {
    // The JSDoc calls out this under-dedup tradeoff explicitly — bare
    // trailing digits without a Season/Part/Cour marker stay intact.
    expect(franchiseKey('Steins;Gate 0')).toBe('steins;gate 0');
  });

  it('preserves the "Entertainment District Arc" clause after the colon', () => {
    expect(franchiseKey('Demon Slayer: Entertainment District Arc')).toBe(
      'demon slayer: entertainment district arc',
    );
  });

  it('preserves the bare trailing number in "Konosuba 2" (known tradeoff)', () => {
    // JSDoc explicitly documents this as an accepted under-dedup tradeoff
    // for v1. The real fix is a franchise_id column from AniList relations.
    expect(franchiseKey('Konosuba 2')).toBe('konosuba 2');
  });
});

describe('franchiseKey — case and whitespace handling', () => {
  it('is case-insensitive on the suffix marker', () => {
    expect(franchiseKey('Attack on Titan SEASON 2')).toBe('attack on titan');
  });

  it('is case-insensitive on a roman numeral suffix', () => {
    expect(franchiseKey('Symphogear ii')).toBe('symphogear');
  });

  it('lowercases the returned key', () => {
    expect(franchiseKey('Attack On Titan')).toBe('attack on titan');
  });

  it('trims surrounding whitespace from the input', () => {
    expect(franchiseKey('   Attack on Titan   ')).toBe('attack on titan');
  });
});

// ----- franchiseSpecificity --------------------------------------------

describe('franchiseSpecificity — series entry (specificity 0)', () => {
  it('returns 0 for a title with no suffix at all', () => {
    expect(franchiseSpecificity('Attack on Titan', 'attack on titan')).toBe(0);
  });

  it('returns 0 for a title that only differs from the key by a "(YYYY)" version suffix', () => {
    // The JSDoc pins this explicitly: "Hunter x Hunter (2011)" is still a
    // series entry — versioned, but not a season.
    expect(franchiseSpecificity('Hunter x Hunter (2011)', 'hunter x hunter')).toBe(0);
  });

  it('returns 0 regardless of input casing', () => {
    expect(franchiseSpecificity('Attack On Titan', 'attack on titan')).toBe(0);
  });
});

describe('franchiseSpecificity — numeric markers', () => {
  it('returns 2 for "Season 2"', () => {
    expect(franchiseSpecificity('Attack on Titan Season 2', 'attack on titan')).toBe(2);
  });

  it('returns 3 for "Part 3"', () => {
    expect(franchiseSpecificity('Attack on Titan Part 3', 'attack on titan')).toBe(3);
  });

  it('returns 1 for "Cour 1"', () => {
    expect(franchiseSpecificity('Attack on Titan Cour 1', 'attack on titan')).toBe(1);
  });

  it('returns 2 for "2nd Season"', () => {
    expect(franchiseSpecificity('My Hero Academia 2nd Season', 'my hero academia')).toBe(2);
  });

  it('returns 3 for "3rd Season"', () => {
    expect(franchiseSpecificity('My Hero Academia 3rd Season', 'my hero academia')).toBe(3);
  });
});

describe('franchiseSpecificity — roman numerals', () => {
  it('returns 2 for trailing " II"', () => {
    expect(franchiseSpecificity('Symphogear II', 'symphogear')).toBe(2);
  });

  it('returns 3 for trailing " III"', () => {
    expect(franchiseSpecificity('Symphogear III', 'symphogear')).toBe(3);
  });

  it('returns 4 for trailing " IV"', () => {
    expect(franchiseSpecificity('Symphogear IV', 'symphogear')).toBe(4);
  });

  it('returns 5 for trailing " V"', () => {
    expect(franchiseSpecificity('Symphogear V', 'symphogear')).toBe(5);
  });

  it('returns 10 for trailing " X"', () => {
    expect(franchiseSpecificity('Symphogear X', 'symphogear')).toBe(10);
  });
});

describe('franchiseSpecificity — final season/cour/part', () => {
  it('returns MAX_SAFE_INTEGER for ": The Final Season"', () => {
    expect(franchiseSpecificity('Attack on Titan: The Final Season', 'attack on titan')).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it('returns MAX_SAFE_INTEGER for " - Final Cour"', () => {
    expect(franchiseSpecificity('Attack on Titan - Final Cour', 'attack on titan')).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });

  it('returns MAX_SAFE_INTEGER for " Final Part" with no separator or leading "the"', () => {
    expect(franchiseSpecificity('Attack on Titan Final Part', 'attack on titan')).toBe(
      Number.MAX_SAFE_INTEGER,
    );
  });
});

describe('franchiseSpecificity — compound markers', () => {
  it('returns the largest numeric marker (Season 3 wins over Part 2)', () => {
    // JSDoc pins this: "Season 3 Part 2" → 3 (max across markers).
    expect(franchiseSpecificity('Attack on Titan Season 3 Part 2', 'attack on titan')).toBe(3);
  });
});

// ----- dedupeByFranchise -----------------------------------------------

describe('dedupeByFranchise — base cases', () => {
  it('returns an empty array for an empty input', () => {
    expect(dedupeByFranchise([])).toEqual([]);
  });

  it('returns the same rows (modulo identity) when there are no duplicates', () => {
    const rows = [row('Attack on Titan'), row('Steins;Gate'), row('Cowboy Bebop')];

    const result = dedupeByFranchise(rows);

    expect(result.map((r) => r.title)).toEqual(['Attack on Titan', 'Steins;Gate', 'Cowboy Bebop']);
  });
});

describe('dedupeByFranchise — collapsing multiple seasons', () => {
  it('collapses multiple seasons of the same franchise into a single row', () => {
    const rows = [
      row('Attack on Titan'),
      row('Attack on Titan Season 2'),
      row('Attack on Titan Season 3'),
    ];

    const result = dedupeByFranchise(rows);

    expect(result.length).toBe(1);
  });

  it('picks the series entry (specificity 0) as the representative when present', () => {
    const rows = [
      row('Attack on Titan'),
      row('Attack on Titan Season 2'),
      row('Attack on Titan: The Final Season'),
    ];

    const result = dedupeByFranchise(rows);

    expect(result.map((r) => r.title)).toEqual(['Attack on Titan']);
  });

  it('picks the lowest-numbered season when no series entry is present', () => {
    // JSDoc: lowest specificity wins. Season 1 < Season 2 < Final.
    const rows = [
      row('Attack on Titan Season 2'),
      row('Attack on Titan Season 1'),
      row('Attack on Titan: The Final Season'),
    ];

    const result = dedupeByFranchise(rows);

    expect(result.map((r) => r.title)).toEqual(['Attack on Titan Season 1']);
  });
});

describe('dedupeByFranchise — representative-swap with position preservation', () => {
  it('keeps the franchise at the first-seen position even when a better representative appears later', () => {
    // First-seen for "attack on titan" is Season 2 at index 1.
    // The series entry appears later at index 2 but represents the
    // franchise BETTER (specificity 0). The franchise stays at position 1
    // in the output, but the row carried is the series entry.
    const rows = [
      row('Steins;Gate'),
      row('Attack on Titan Season 2'),
      row('Attack on Titan'),
      row('Cowboy Bebop'),
    ];

    const result = dedupeByFranchise(rows);

    expect(result.map((r) => r.title)).toEqual(['Steins;Gate', 'Attack on Titan', 'Cowboy Bebop']);
  });
});

describe('dedupeByFranchise — distinct-franchise ordering', () => {
  it('preserves the insertion order of distinct franchises as they first appear', () => {
    const rows = [
      row('Cowboy Bebop'),
      row('Attack on Titan Season 2'),
      row('Steins;Gate'),
      row('Attack on Titan'),
      row('Cowboy Bebop'),
    ];

    const result = dedupeByFranchise(rows);

    expect(result.map((r) => r.title)).toEqual(['Cowboy Bebop', 'Attack on Titan', 'Steins;Gate']);
  });
});

describe('dedupeByFranchise — generic over T extends { title: string }', () => {
  it('preserves extra fields on the representative row', () => {
    type Extended = { title: string; titleId: string; score: number };
    const rows: Extended[] = [
      { title: 'Attack on Titan Season 2', titleId: 'aot-s2', score: 0.5 },
      { title: 'Attack on Titan', titleId: 'aot-s1', score: 0.9 },
    ];

    const result = dedupeByFranchise(rows);

    expect(result.length).toBe(1);
    expect(result[0]).toEqual({ title: 'Attack on Titan', titleId: 'aot-s1', score: 0.9 });
  });

  it('returns the exact reference of the chosen representative (no clone)', () => {
    type Extended = { title: string; tag: object };
    const seriesEntry: Extended = { title: 'Attack on Titan', tag: {} };
    const seasonTwo: Extended = { title: 'Attack on Titan Season 2', tag: {} };
    const rows: Extended[] = [seasonTwo, seriesEntry];

    const result = dedupeByFranchise(rows);

    expect(result[0]).toBe(seriesEntry);
  });
});

// ----- aggregateByFranchise --------------------------------------------

// Fixture builder for aggregate inputs. Keeps `titleId` and `rating`
// explicit so each test reads as a tiny table.
const rated = (
  titleId: string,
  title: string,
  rating: number,
): { titleId: string; title: string; rating: number } => ({ titleId, title, rating });

describe('aggregateByFranchise — base cases', () => {
  it('returns an empty array for an empty input', () => {
    expect(aggregateByFranchise([])).toEqual([]);
  });

  it('returns a single aggregated row for a single rated entry', () => {
    const result = aggregateByFranchise([rated('aot-s1', 'Attack on Titan', 8)]);

    expect(result.length).toBe(1);
    expect(result[0]).toEqual({
      representativeTitleId: 'aot-s1',
      meanRating: 8,
      seasonTitleIds: ['aot-s1'],
    });
  });
});

describe('aggregateByFranchise — meanRating arithmetic', () => {
  it('uses the entry rating directly when only one entry contributes', () => {
    const result = aggregateByFranchise([rated('aot-s1', 'Attack on Titan', 7)]);

    expect(result[0]?.meanRating).toBe(7);
  });

  it('returns the arithmetic mean across multiple seasons of one franchise', () => {
    const result = aggregateByFranchise([
      rated('aot-s1', 'Attack on Titan', 8),
      rated('aot-s2', 'Attack on Titan Season 2', 10),
    ]);

    expect(result.length).toBe(1);
    expect(result[0]?.meanRating).toBe(9);
  });

  it('produces a non-integer mean when the ratings do not divide evenly', () => {
    // 10 + 7 = 17, /2 = 8.5
    const result = aggregateByFranchise([
      rated('aot-s1', 'Attack on Titan', 10),
      rated('aot-s2', 'Attack on Titan Season 2', 7),
    ]);

    expect(result[0]?.meanRating).toBe(8.5);
  });

  it('computes each franchise mean independently when multiple franchises are present', () => {
    const result = aggregateByFranchise([
      rated('aot-s1', 'Attack on Titan', 8),
      rated('aot-s2', 'Attack on Titan Season 2', 10),
      rated('sg-1', 'Steins;Gate', 9),
      rated('sg-2', 'Steins;Gate', 5),
    ]);

    const byRep = new Map(result.map((r) => [r.representativeTitleId, r.meanRating]));
    expect(byRep.get('aot-s1')).toBe(9);
    expect(byRep.get('sg-1')).toBe(7);
  });
});

describe('aggregateByFranchise — representative selection', () => {
  it('picks the series entry over a numbered season as the representative', () => {
    const result = aggregateByFranchise([
      rated('aot-s2', 'Attack on Titan Season 2', 8),
      rated('aot-s1', 'Attack on Titan', 9),
    ]);

    expect(result[0]?.representativeTitleId).toBe('aot-s1');
  });

  it('picks the lowest-numbered season as the representative when no series entry is present', () => {
    const result = aggregateByFranchise([
      rated('aot-s3', 'Attack on Titan Season 3', 7),
      rated('aot-s1', 'Attack on Titan Season 1', 8),
      rated('aot-s2', 'Attack on Titan Season 2', 9),
    ]);

    expect(result[0]?.representativeTitleId).toBe('aot-s1');
  });

  it('does not pick "Final Season" as the representative when an earlier season is in the group', () => {
    // Final Season specificity = MAX_SAFE_INTEGER, so it must lose to Season 2.
    const result = aggregateByFranchise([
      rated('aot-final', 'Attack on Titan: The Final Season', 10),
      rated('aot-s2', 'Attack on Titan Season 2', 8),
    ]);

    expect(result[0]?.representativeTitleId).toBe('aot-s2');
  });

  it('picks the same representative regardless of input order', () => {
    const orderA = aggregateByFranchise([
      rated('aot-s1', 'Attack on Titan Season 1', 8),
      rated('aot-s2', 'Attack on Titan Season 2', 9),
      rated('aot-s3', 'Attack on Titan Season 3', 7),
    ]);
    const orderB = aggregateByFranchise([
      rated('aot-s3', 'Attack on Titan Season 3', 7),
      rated('aot-s2', 'Attack on Titan Season 2', 9),
      rated('aot-s1', 'Attack on Titan Season 1', 8),
    ]);

    expect(orderA[0]?.representativeTitleId).toBe('aot-s1');
    expect(orderB[0]?.representativeTitleId).toBe('aot-s1');
  });
});

describe('aggregateByFranchise — seasonTitleIds', () => {
  it('preserves every titleId from the franchise group', () => {
    const result = aggregateByFranchise([
      rated('aot-s1', 'Attack on Titan', 8),
      rated('aot-s2', 'Attack on Titan Season 2', 9),
      rated('aot-s3', 'Attack on Titan Season 3', 7),
    ]);

    expect(result[0]?.seasonTitleIds).toEqual(['aot-s1', 'aot-s2', 'aot-s3']);
  });

  it('preserves the input order of titleIds within a franchise (not the franchise-specificity order)', () => {
    // Input order is s2 → s1 → s3; seasonTitleIds must reflect that, even
    // though the representative will be s1.
    const result = aggregateByFranchise([
      rated('aot-s2', 'Attack on Titan Season 2', 9),
      rated('aot-s1', 'Attack on Titan Season 1', 8),
      rated('aot-s3', 'Attack on Titan Season 3', 7),
    ]);

    expect(result[0]?.seasonTitleIds).toEqual(['aot-s2', 'aot-s1', 'aot-s3']);
  });

  it('returns a single-element seasonTitleIds for a franchise with one entry', () => {
    const result = aggregateByFranchise([rated('sg-1', 'Steins;Gate', 9)]);

    expect(result[0]?.seasonTitleIds).toEqual(['sg-1']);
  });
});

describe('aggregateByFranchise — output ordering across franchises', () => {
  it('emits franchises in the order each franchise first appeared in the input', () => {
    const result = aggregateByFranchise([
      rated('cb-1', 'Cowboy Bebop', 9),
      rated('aot-s2', 'Attack on Titan Season 2', 8),
      rated('sg-1', 'Steins;Gate', 10),
    ]);

    expect(result.map((r) => r.representativeTitleId)).toEqual(['cb-1', 'aot-s2', 'sg-1']);
  });

  it('keeps a scattered franchise at the position of its first appearance', () => {
    // "attack on titan" first appears at index 1, even though more
    // rows for it appear at indices 3 and 4. It must stay at position 1
    // in the output.
    const result = aggregateByFranchise([
      rated('cb-1', 'Cowboy Bebop', 9),
      rated('aot-s2', 'Attack on Titan Season 2', 8),
      rated('sg-1', 'Steins;Gate', 10),
      rated('aot-s1', 'Attack on Titan', 9),
      rated('aot-s3', 'Attack on Titan Season 3', 7),
    ]);

    expect(result.length).toBe(3);
    expect(result.map((r) => r.representativeTitleId)).toEqual(['cb-1', 'aot-s1', 'sg-1']);
  });

  it('keeps the franchise position fixed even when a better representative arrives later in input', () => {
    // The franchise is anchored at index 0 (Season 2 first-seen), but
    // the series entry at index 2 wins as representative. Output[0]
    // is still the AoT row.
    const result = aggregateByFranchise([
      rated('aot-s2', 'Attack on Titan Season 2', 8),
      rated('cb-1', 'Cowboy Bebop', 9),
      rated('aot-s1', 'Attack on Titan', 10),
    ]);

    expect(result.map((r) => r.representativeTitleId)).toEqual(['aot-s1', 'cb-1']);
  });
});
