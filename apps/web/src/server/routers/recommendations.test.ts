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
