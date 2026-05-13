import { describe, expect, it } from 'vitest';

// franchiseKey is internal to recommendations.ts; mirror its logic
// here for testing. If the helper grows or moves we should export it
// and import directly. For v1 the duplicate is acceptable since the
// regex set is small and stable.
function franchiseKey(title: string): string {
  let key = title.toLowerCase().trim();
  for (let pass = 0; pass < 6; pass++) {
    const previous = key;
    key = key
      .replace(/\s*\(\d{4}\)$/, '')
      .replace(/\s*[:\-–]\s*(?:the\s+)?final\s+(?:season|cour|part)$/i, '')
      .replace(/\s+(?:the\s+)?final\s+(?:season|cour|part)$/i, '')
      .replace(/\s+(?:season|cour|part|s)\s*\d+$/i, '')
      .replace(/\s+\d+(?:st|nd|rd|th)\s+season$/i, '')
      .replace(/\s+(?:ii|iii|iv|v|vi|vii|viii|ix|x)$/i, '')
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

function franchiseSpecificity(originalTitle: string, key: string): number {
  const lower = originalTitle.toLowerCase().trim();
  const lowerNoYear = lower.replace(/\s*\(\d{4}\)$/, '');
  if (lowerNoYear === key) return 0;
  if (/(?:^|\s)(?:the\s+)?final\s+(?:season|cour|part)\b/i.test(lower)) {
    return Number.MAX_SAFE_INTEGER;
  }
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

describe('franchiseKey', () => {
  it('collapses "Season N" suffix', () => {
    expect(franchiseKey('Jujutsu Kaisen')).toBe(franchiseKey('Jujutsu Kaisen Season 2'));
  });

  it('collapses "SN" abbreviation', () => {
    expect(franchiseKey('Attack on Titan')).toBe(franchiseKey('Attack on Titan S2'));
  });

  it('collapses "Part N" suffix', () => {
    expect(franchiseKey('Demon Slayer')).toBe(franchiseKey('Demon Slayer Part 3'));
  });

  it('collapses "2nd Season" suffix', () => {
    expect(franchiseKey('Mob Psycho 100')).toBe(franchiseKey('Mob Psycho 100 2nd Season'));
  });

  it('collapses trailing roman numerals', () => {
    expect(franchiseKey('Hunter x Hunter')).toBe(franchiseKey('Hunter x Hunter II'));
  });

  it('collapses trailing year in parens', () => {
    expect(franchiseKey('Hunter x Hunter')).toBe(franchiseKey('Hunter x Hunter (2011)'));
  });

  it('preserves distinct subtitles after colon', () => {
    // Different arcs of the same franchise are distinct works — the
    // user expects to see both surfaced.
    expect(franchiseKey('Demon Slayer: Entertainment District Arc')).not.toBe(
      franchiseKey('Demon Slayer: Mugen Train Arc'),
    );
  });

  it('preserves bare trailing numbers (e.g. Steins;Gate 0)', () => {
    // "0" here is a distinct prequel film, not "Season 0".
    expect(franchiseKey('Steins;Gate')).not.toBe(franchiseKey('Steins;Gate 0'));
  });

  it('preserves case-insensitive matching', () => {
    expect(franchiseKey('JUJUTSU KAISEN season 2')).toBe(franchiseKey('jujutsu kaisen'));
  });

  it('collapses compound "Season N Part M" via multi-pass', () => {
    expect(franchiseKey('Attack on Titan Season 3 Part 2')).toBe(franchiseKey('Attack on Titan'));
  });

  it('collapses "Final Season"', () => {
    expect(franchiseKey('Attack on Titan Final Season')).toBe(franchiseKey('Attack on Titan'));
  });

  it('collapses "Final Season Part N"', () => {
    expect(franchiseKey('Attack on Titan Final Season Part 2')).toBe(
      franchiseKey('Attack on Titan'),
    );
  });

  it('collapses "The Final Season" prefix variant', () => {
    expect(franchiseKey('Attack on Titan: The Final Season')).toBe(franchiseKey('Attack on Titan'));
  });

  it('collapses ": The Final Season" with later Part suffix', () => {
    expect(franchiseKey('Attack on Titan: The Final Season Part 1')).toBe(
      franchiseKey('Attack on Titan'),
    );
  });
});

describe('franchiseSpecificity', () => {
  // Returns the integer that ranks within-franchise entries — lower
  // is a better representative (the entry-point title a new viewer
  // should land on).

  it('returns 0 for the series entry (no suffix)', () => {
    const t = 'Attack on Titan';
    expect(franchiseSpecificity(t, franchiseKey(t))).toBe(0);
  });

  it('returns 0 for a series entry with year suffix only', () => {
    const t = 'Hunter x Hunter (2011)';
    expect(franchiseSpecificity(t, franchiseKey(t))).toBe(0);
  });

  it('returns the season number for "Season N"', () => {
    const t = 'Jujutsu Kaisen Season 2';
    expect(franchiseSpecificity(t, franchiseKey(t))).toBe(2);
  });

  it('returns the highest number in compound "Season N Part M"', () => {
    const t = 'Attack on Titan Season 3 Part 2';
    expect(franchiseSpecificity(t, franchiseKey(t))).toBe(3);
  });

  it('returns the roman numeral value for "X II"', () => {
    const t = 'Hunter x Hunter II';
    expect(franchiseSpecificity(t, franchiseKey(t))).toBe(2);
  });

  it('returns ordinal for "X 2nd Season"', () => {
    const t = 'Mob Psycho 100 2nd Season';
    expect(franchiseSpecificity(t, franchiseKey(t))).toBe(2);
  });

  it('returns MAX_SAFE_INTEGER for "Final Season"', () => {
    const t = 'Attack on Titan Final Season';
    expect(franchiseSpecificity(t, franchiseKey(t))).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('returns MAX_SAFE_INTEGER for ": The Final Season Part N"', () => {
    const t = 'Attack on Titan: The Final Season Part 1';
    expect(franchiseSpecificity(t, franchiseKey(t))).toBe(Number.MAX_SAFE_INTEGER);
  });

  // Representative-picking sanity: when grouping a franchise, the
  // entry-point title (lowest specificity) wins.
  it('ranks Season 1 below Season 3 Part 2', () => {
    const a = 'Attack on Titan';
    const b = 'Attack on Titan Season 3 Part 2';
    expect(franchiseSpecificity(a, franchiseKey(a))).toBeLessThan(
      franchiseSpecificity(b, franchiseKey(b)),
    );
  });

  it('ranks Season 1 below the Final Season', () => {
    const s1 = 'Attack on Titan Season 1';
    const fin = 'Attack on Titan Final Season';
    expect(franchiseSpecificity(s1, franchiseKey(s1))).toBeLessThan(
      franchiseSpecificity(fin, franchiseKey(fin)),
    );
  });
});
