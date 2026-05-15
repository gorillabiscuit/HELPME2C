import { describe, it, expect } from 'vitest';
import { findCrossMediumBridges } from './cross-medium';
import type { TagThemeMembership, TitleTagSet } from './recommendation';

// Fixture conventions:
//   - Tag IDs use namespaced slugs (`tmdb:tragedy`, `anilist:Tragedy`) to make
//     the cross-medium intent legible — the contract here is "tags absent
//     from the source bridge via shared themes."
//   - Theme IDs use kebab-case slugs to mirror the editorial schema.
//   - Weights stay in the 0-100 AniList rank-scale band per the contract.
//   - Asserts target rankings (which titleIds appear, in what order) per
//     packages/ml/CLAUDE.md. Absolute scores are only checked when the
//     contract pins them (zero contribution, exclusion).

// ---- Fixture builders -----------------------------------------------------

const title = (titleId: string, tags: ReadonlyArray<readonly [string, number]>): TitleTagSet => ({
  titleId,
  tags: tags.map(([tagId, weight]) => ({ tagId, weight })),
});

const membership = (tagId: string, themeId: string, strength: number): TagThemeMembership => ({
  tagId,
  themeId,
  strength,
});

// A reusable source title with two themed tags. Used by most of the
// bridge-positive tests so the cross-medium scenario is consistent.
const tragedyAntiheroSource = title('source', [
  ['tmdb:tragedy', 80],
  ['tmdb:antihero', 60],
]);

const tragedyAntiheroMembership: TagThemeMembership[] = [
  // Source side
  membership('tmdb:tragedy', 'tragedy', 100),
  membership('tmdb:antihero', 'antihero', 100),
  // Candidate side
  membership('anilist:Tragedy', 'tragedy', 100),
  membership('anilist:Antihero', 'antihero', 100),
];

// ---------------------------------------------------------------------------

describe('findCrossMediumBridges — degenerate inputs', () => {
  it('returns an empty result when the candidate list is empty', () => {
    const result = findCrossMediumBridges(tragedyAntiheroSource, [], tragedyAntiheroMembership);
    expect(result).toEqual([]);
  });

  it('returns an empty result when the source title has no tags', () => {
    const sourceWithNoTags = title('source', []);
    const candidates: TitleTagSet[] = [title('c1', [['anilist:Tragedy', 80]])];

    const result = findCrossMediumBridges(sourceWithNoTags, candidates, tragedyAntiheroMembership);

    expect(result).toEqual([]);
  });

  it('returns an empty result when no theme memberships are provided at all', () => {
    const candidates: TitleTagSet[] = [
      title('c1', [['anilist:Tragedy', 80]]),
      title('c2', [['anilist:Antihero', 80]]),
    ];

    const result = findCrossMediumBridges(tragedyAntiheroSource, candidates, []);

    expect(result).toEqual([]);
  });

  it('returns an empty result when source tags exist but none of them appear in any theme', () => {
    // Membership covers OTHER tags entirely; source's tags are orphans.
    const orphanMembership: TagThemeMembership[] = [
      membership('anilist:Tragedy', 'tragedy', 100),
      membership('anilist:Antihero', 'antihero', 100),
    ];
    const candidates: TitleTagSet[] = [title('c1', [['anilist:Tragedy', 80]])];

    const result = findCrossMediumBridges(tragedyAntiheroSource, candidates, orphanMembership);

    expect(result).toEqual([]);
  });
});

describe('findCrossMediumBridges — bridge contract', () => {
  it('returns a single candidate that bridges strongly via one shared theme', () => {
    const candidates: TitleTagSet[] = [title('bridge', [['anilist:Tragedy', 80]])];

    const result = findCrossMediumBridges(
      tragedyAntiheroSource,
      candidates,
      tragedyAntiheroMembership,
    );

    expect(result.map((r) => r.titleId)).toEqual(['bridge']);
    expect(result[0]?.score).toBeGreaterThan(0);
    expect(result[0]?.bridgedThemes.map((t) => t.themeId)).toEqual(['tragedy']);
  });

  it('excludes a candidate whose only tag is already present in the source tag set', () => {
    // Cross-medium-only rule: the candidate's tag matches the source's tag
    // directly, so it does NOT contribute via the theme bridge — and with no
    // bridge contribution at all the candidate is excluded entirely.
    const candidates: TitleTagSet[] = [title('sameMedium', [['tmdb:tragedy', 80]])];

    const result = findCrossMediumBridges(
      tragedyAntiheroSource,
      candidates,
      tragedyAntiheroMembership,
    );

    expect(result).toEqual([]);
  });

  it('excludes a candidate with no theme overlap even when its tags are non-empty', () => {
    // Candidate has tags but none of them belong to any theme the source
    // bridges into → zero bridge score → excluded entirely (not ranked low).
    const candidates: TitleTagSet[] = [title('unrelated', [['anilist:CookingShow', 80]])];

    const result = findCrossMediumBridges(
      tragedyAntiheroSource,
      candidates,
      tragedyAntiheroMembership,
    );

    expect(result).toEqual([]);
  });

  it('excludes zero-bridge candidates while keeping the bridging candidate in the same call', () => {
    // Mixed input: one candidate bridges, one does not. Only the bridge
    // should appear in the output.
    const candidates: TitleTagSet[] = [
      title('bridge', [['anilist:Tragedy', 80]]),
      title('unrelated', [['anilist:CookingShow', 80]]),
    ];

    const result = findCrossMediumBridges(
      tragedyAntiheroSource,
      candidates,
      tragedyAntiheroMembership,
    );

    expect(result.map((r) => r.titleId)).toEqual(['bridge']);
  });

  it('ranks a candidate bridging via both source themes above one bridging via only one', () => {
    const candidates: TitleTagSet[] = [
      title('doubleBridge', [
        ['anilist:Tragedy', 80],
        ['anilist:Antihero', 80],
      ]),
      title('singleBridge', [['anilist:Tragedy', 80]]),
    ];

    const result = findCrossMediumBridges(
      tragedyAntiheroSource,
      candidates,
      tragedyAntiheroMembership,
    );

    expect(result.map((r) => r.titleId)).toEqual(['doubleBridge', 'singleBridge']);
  });

  it('ranks a full-strength bridge candidate above a half-strength bridge candidate, all else equal', () => {
    // Strength scales the contribution; with everything else equal, strength=100
    // outranks strength=50.
    const halfStrengthMembership: TagThemeMembership[] = [
      membership('tmdb:tragedy', 'tragedy', 100),
      membership('anilist:FullTragedy', 'tragedy', 100),
      membership('anilist:HalfTragedy', 'tragedy', 50),
    ];
    const source = title('source', [['tmdb:tragedy', 80]]);
    const candidates: TitleTagSet[] = [
      title('halfStrengthBridge', [['anilist:HalfTragedy', 80]]),
      title('fullStrengthBridge', [['anilist:FullTragedy', 80]]),
    ];

    const result = findCrossMediumBridges(source, candidates, halfStrengthMembership);

    expect(result.map((r) => r.titleId)).toEqual(['fullStrengthBridge', 'halfStrengthBridge']);
  });

  it('excludes a candidate whose only bridge link has strength 0', () => {
    // A strength-0 candidate-side link contributes nothing → zero bridge
    // score → excluded.
    const zeroStrengthMembership: TagThemeMembership[] = [
      membership('tmdb:tragedy', 'tragedy', 100),
      membership('anilist:ZeroBridge', 'tragedy', 0),
    ];
    const source = title('source', [['tmdb:tragedy', 80]]);
    const candidates: TitleTagSet[] = [title('zeroBridge', [['anilist:ZeroBridge', 80]])];

    const result = findCrossMediumBridges(source, candidates, zeroStrengthMembership);

    expect(result).toEqual([]);
  });
});

describe('findCrossMediumBridges — bridgedThemes payload', () => {
  it('sorts bridgedThemes by contribution descending when a candidate bridges via multiple themes', () => {
    // Set up so that the 'tragedy' theme contributes MORE than the 'antihero'
    // theme by giving the source a much larger weight on the tragedy side.
    const source = title('source', [
      ['tmdb:tragedy', 100],
      ['tmdb:antihero', 10],
    ]);
    const candidates: TitleTagSet[] = [
      title('doubleBridge', [
        ['anilist:Tragedy', 80],
        ['anilist:Antihero', 80],
      ]),
    ];

    const result = findCrossMediumBridges(source, candidates, tragedyAntiheroMembership);

    expect(result.length).toBe(1);
    const themes = result[0]?.bridgedThemes ?? [];
    expect(themes.map((t) => t.themeId)).toEqual(['tragedy', 'antihero']);
    // Sorted descending: each contribution is >= the next.
    for (let i = 1; i < themes.length; i += 1) {
      expect(themes[i - 1]!.contribution).toBeGreaterThanOrEqual(themes[i]!.contribution);
    }
  });

  it('reports a single themeId in bridgedThemes for a single-theme bridge', () => {
    const candidates: TitleTagSet[] = [title('bridge', [['anilist:Tragedy', 80]])];

    const result = findCrossMediumBridges(
      tragedyAntiheroSource,
      candidates,
      tragedyAntiheroMembership,
    );

    expect(result[0]?.bridgedThemes.map((t) => t.themeId)).toEqual(['tragedy']);
    expect(result[0]?.bridgedThemes[0]?.contribution).toBeGreaterThan(0);
  });
});

describe('findCrossMediumBridges — ranking + limit', () => {
  it('breaks score ties deterministically by titleId ASC regardless of input order', () => {
    // Two candidates with identical tag sets → identical score → tie-break
    // by titleId ASC. Run with both input orderings to lock stability.
    const orderA: TitleTagSet[] = [
      title('zebra', [['anilist:Tragedy', 80]]),
      title('apple', [['anilist:Tragedy', 80]]),
    ];
    const orderB: TitleTagSet[] = [
      title('apple', [['anilist:Tragedy', 80]]),
      title('zebra', [['anilist:Tragedy', 80]]),
    ];

    const resA = findCrossMediumBridges(
      tragedyAntiheroSource,
      orderA,
      tragedyAntiheroMembership,
    ).map((r) => r.titleId);
    const resB = findCrossMediumBridges(
      tragedyAntiheroSource,
      orderB,
      tragedyAntiheroMembership,
    ).map((r) => r.titleId);

    expect(resA).toEqual(['apple', 'zebra']);
    expect(resB).toEqual(['apple', 'zebra']);
  });

  it('caps the result length at the explicit limit argument', () => {
    // Five bridging candidates; limit=2 should keep only the top-2 by score
    // (here a deterministic id-based ordering since all scores are equal).
    const candidates: TitleTagSet[] = [
      title('a', [['anilist:Tragedy', 80]]),
      title('b', [['anilist:Tragedy', 80]]),
      title('c', [['anilist:Tragedy', 80]]),
      title('d', [['anilist:Tragedy', 80]]),
      title('e', [['anilist:Tragedy', 80]]),
    ];

    const result = findCrossMediumBridges(
      tragedyAntiheroSource,
      candidates,
      tragedyAntiheroMembership,
      2,
    );

    expect(result.length).toBe(2);
    expect(result.map((r) => r.titleId)).toEqual(['a', 'b']);
  });

  it('defaults to a 6-item cap when limit is omitted', () => {
    // Build 8 bridging candidates so we can see the default cap.
    const candidates: TitleTagSet[] = Array.from({ length: 8 }, (_, i) =>
      title(`t${i}`, [['anilist:Tragedy', 80]]),
    );

    const result = findCrossMediumBridges(
      tragedyAntiheroSource,
      candidates,
      tragedyAntiheroMembership,
    );

    expect(result.length).toBe(6);
  });

  it('returns the same ordering across repeated calls with identical inputs', () => {
    const candidates: TitleTagSet[] = [
      title('c', [['anilist:Tragedy', 80]]),
      title('a', [['anilist:Antihero', 80]]),
      title('b', [
        ['anilist:Tragedy', 80],
        ['anilist:Antihero', 80],
      ]),
    ];

    const first = findCrossMediumBridges(
      tragedyAntiheroSource,
      candidates,
      tragedyAntiheroMembership,
    ).map((r) => r.titleId);
    const second = findCrossMediumBridges(
      tragedyAntiheroSource,
      candidates,
      tragedyAntiheroMembership,
    ).map((r) => r.titleId);

    expect(second).toEqual(first);
  });

  it('ignores in-source candidate tags when ranking — they neither contribute nor block other bridge tags', () => {
    // Candidate A has only an in-source tag → zero bridge contribution → excluded.
    // Candidate B has the same in-source tag AND a real bridge tag → must
    // appear (the in-source tag is ignored, the bridge tag carries it).
    const candidates: TitleTagSet[] = [
      title('sameMediumOnly', [['tmdb:tragedy', 80]]),
      title('sameMediumPlusBridge', [
        ['tmdb:tragedy', 80],
        ['anilist:Antihero', 80],
      ]),
    ];

    const result = findCrossMediumBridges(
      tragedyAntiheroSource,
      candidates,
      tragedyAntiheroMembership,
    );

    expect(result.map((r) => r.titleId)).toEqual(['sameMediumPlusBridge']);
    expect(result[0]?.bridgedThemes.map((t) => t.themeId)).toEqual(['antihero']);
  });
});
