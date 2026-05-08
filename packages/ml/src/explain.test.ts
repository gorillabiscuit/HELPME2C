import { describe, it, expect } from 'vitest';
import { explainGroupRecommendation, formatRecExplanation } from './explain';
import type {
  ExplanationReason,
  FormatterNames,
  PerMemberExplanation,
  RecExplanation,
} from './explain';
import type {
  GroupMember,
  GroupRecommendation,
  TagThemeMembership,
  TitleTagSet,
  UserTasteVector,
} from './recommendation';

// Fixture conventions:
//   - Tags `actionT`, `dramaT`, `mechaT`, `romanceT`, `thrillerT` and the
//     namespaced `tmdb:*` / `anilist:*` IDs follow recommendation.test.ts.
//   - Per packages/ml/CLAUDE.md §8.1 we assert primarily on STRUCTURE and
//     RANKINGS (reason ordering, presence/absence of entries, headline
//     priority). Absolute contribution numbers are only checked where the
//     contract pins exact arithmetic — direct-tag and theme-bridge formulas.
//   - The `taste()` and `recFor()` helpers mirror the style in
//     recommendation.test.ts so fixtures stay legible.

const taste = (entries: ReadonlyArray<readonly [string, number]>): UserTasteVector =>
  new Map<string, number>(entries);

const recFor = (
  titleId: string,
  perUser: ReadonlyArray<readonly [string, number]> = [],
  groupScore = 0,
): GroupRecommendation => ({
  titleId,
  groupScore,
  perUserScores: new Map<string, number>(perUser),
});

describe('explainGroupRecommendation — per-member structure', () => {
  it('returns one PerMemberExplanation per group member with matching userIds', () => {
    const members: GroupMember[] = [
      { userId: 'alice', taste: taste([['actionT', 100]]) },
      { userId: 'bob', taste: taste([['actionT', 80]]) },
    ];
    const candidate: TitleTagSet = {
      titleId: 't1',
      tags: [{ tagId: 'actionT', weight: 70 }],
    };
    const rec = recFor('t1', [
      ['alice', 0.9],
      ['bob', 0.8],
    ]);

    const explanation = explainGroupRecommendation(rec, members, candidate);

    expect(explanation.perMember.length).toBe(2);
    expect(explanation.perMember.map((m) => m.userId)).toEqual(['alice', 'bob']);
  });

  it('uses normalizedScore from rec.perUserScores for each member', () => {
    const members: GroupMember[] = [
      { userId: 'alice', taste: taste([['actionT', 100]]) },
      { userId: 'bob', taste: taste([['actionT', 80]]) },
    ];
    const candidate: TitleTagSet = {
      titleId: 't1',
      tags: [{ tagId: 'actionT', weight: 70 }],
    };
    const rec = recFor('t1', [
      ['alice', 0.91],
      ['bob', 0.42],
    ]);

    const explanation = explainGroupRecommendation(rec, members, candidate);

    const byId = new Map(explanation.perMember.map((m) => [m.userId, m]));
    expect(byId.get('alice')?.normalizedScore).toBe(0.91);
    expect(byId.get('bob')?.normalizedScore).toBe(0.42);
  });

  it("defaults a member's normalizedScore to 0 when their userId is missing from rec.perUserScores", () => {
    const members: GroupMember[] = [
      { userId: 'alice', taste: taste([['actionT', 100]]) },
      { userId: 'ghost', taste: taste([['actionT', 80]]) },
    ];
    const candidate: TitleTagSet = {
      titleId: 't1',
      tags: [{ tagId: 'actionT', weight: 50 }],
    };
    // Only alice has a perUser score; ghost is intentionally absent.
    const rec = recFor('t1', [['alice', 0.5]]);

    const explanation = explainGroupRecommendation(rec, members, candidate);
    const ghost = explanation.perMember.find((m) => m.userId === 'ghost');

    expect(ghost?.normalizedScore).toBe(0);
  });
});

describe('explainGroupRecommendation — direct-tag reasons', () => {
  it('produces a direct-tag reason for each candidate tag the member has in their taste', () => {
    const members: GroupMember[] = [
      {
        userId: 'alice',
        taste: taste([
          ['actionT', 100],
          ['mechaT', 80],
        ]),
      },
    ];
    const candidate: TitleTagSet = {
      titleId: 't1',
      tags: [
        { tagId: 'actionT', weight: 70 },
        { tagId: 'mechaT', weight: 60 },
      ],
    };
    const rec = recFor('t1', [['alice', 1]]);

    const explanation = explainGroupRecommendation(rec, members, candidate);
    const reasons = explanation.perMember[0]?.reasons ?? [];

    const tagIds = reasons.map((r) => r.tagId).sort();
    expect(tagIds).toEqual(['actionT', 'mechaT']);
    expect(reasons.every((r) => r.kind === 'direct-tag')).toBe(true);
  });

  it('computes direct-tag contribution as tasteWeight × tagWeight', () => {
    const members: GroupMember[] = [{ userId: 'alice', taste: taste([['actionT', 100]]) }];
    const candidate: TitleTagSet = {
      titleId: 't1',
      tags: [{ tagId: 'actionT', weight: 70 }],
    };
    const rec = recFor('t1', [['alice', 1]]);

    const explanation = explainGroupRecommendation(rec, members, candidate);
    const reason = explanation.perMember[0]?.reasons[0];

    expect(reason?.kind).toBe('direct-tag');
    // tasteWeight 100 × tagWeight 70 = 7000
    expect(reason?.contribution).toBe(7000);
  });

  it('does not attach themeId or bridgedFromTagIds to direct-tag reasons', () => {
    const members: GroupMember[] = [{ userId: 'alice', taste: taste([['actionT', 100]]) }];
    const candidate: TitleTagSet = {
      titleId: 't1',
      tags: [{ tagId: 'actionT', weight: 50 }],
    };
    const themeMembership: TagThemeMembership[] = [
      { tagId: 'actionT', themeId: 'high-stakes', strength: 100 },
    ];
    const rec = recFor('t1', [['alice', 1]]);

    const explanation = explainGroupRecommendation(rec, members, candidate, themeMembership);
    const reason = explanation.perMember[0]?.reasons[0];

    expect(reason?.kind).toBe('direct-tag');
    expect(reason?.themeId).toBeUndefined();
    expect(reason?.bridgedFromTagIds).toBeUndefined();
  });
});

describe('explainGroupRecommendation — theme-bridge reasons', () => {
  it('produces a theme-bridge reason for a candidate tag absent from taste that bridges via a theme the member has signal in', () => {
    const members: GroupMember[] = [{ userId: 'alice', taste: taste([['tmdb:tragedy', 100]]) }];
    const candidate: TitleTagSet = {
      titleId: 't1',
      tags: [{ tagId: 'anilist:Tragedy', weight: 80 }],
    };
    const themeMembership: TagThemeMembership[] = [
      { tagId: 'tmdb:tragedy', themeId: 'tragedy', strength: 100 },
      { tagId: 'anilist:Tragedy', themeId: 'tragedy', strength: 100 },
    ];
    const rec = recFor('t1', [['alice', 1]]);

    const explanation = explainGroupRecommendation(rec, members, candidate, themeMembership);
    const reasons = explanation.perMember[0]?.reasons ?? [];

    expect(reasons.length).toBe(1);
    expect(reasons[0]?.kind).toBe('theme-bridge');
    expect(reasons[0]?.tagId).toBe('anilist:Tragedy');
    expect(reasons[0]?.themeId).toBe('tragedy');
  });

  it('computes theme-bridge contribution as themeWeight × tagWeight × strength/100', () => {
    // tasteTheme[tragedy] = tasteWeight(tmdb:tragedy)=100 × strength(100)/100 = 100
    // contribution = themeWeight(100) × candidate tagWeight(80) × candidate strength(50)/100
    //              = 100 × 80 × 0.5 = 4000
    const members: GroupMember[] = [{ userId: 'alice', taste: taste([['tmdb:tragedy', 100]]) }];
    const candidate: TitleTagSet = {
      titleId: 't1',
      tags: [{ tagId: 'anilist:HalfTragedy', weight: 80 }],
    };
    const themeMembership: TagThemeMembership[] = [
      { tagId: 'tmdb:tragedy', themeId: 'tragedy', strength: 100 },
      { tagId: 'anilist:HalfTragedy', themeId: 'tragedy', strength: 50 },
    ];
    const rec = recFor('t1', [['alice', 1]]);

    const explanation = explainGroupRecommendation(rec, members, candidate, themeMembership);
    const reason = explanation.perMember[0]?.reasons[0];

    expect(reason?.kind).toBe('theme-bridge');
    expect(reason?.contribution).toBe(4000);
  });

  it("lists ALL of the member's taste tags that bridge to the same theme in bridgedFromTagIds", () => {
    // Member has THREE tags that all map into the `tragedy` theme. The
    // candidate carries one bridge tag in that theme. bridgedFromTagIds
    // must list all three of the member's own bridging tags.
    const members: GroupMember[] = [
      {
        userId: 'alice',
        taste: taste([
          ['tmdb:tragedy', 100],
          ['tmdb:grief', 50],
          ['tmdb:loss', 30],
        ]),
      },
    ];
    const candidate: TitleTagSet = {
      titleId: 't1',
      tags: [{ tagId: 'anilist:Tragedy', weight: 80 }],
    };
    const themeMembership: TagThemeMembership[] = [
      { tagId: 'tmdb:tragedy', themeId: 'tragedy', strength: 100 },
      { tagId: 'tmdb:grief', themeId: 'tragedy', strength: 100 },
      { tagId: 'tmdb:loss', themeId: 'tragedy', strength: 100 },
      { tagId: 'anilist:Tragedy', themeId: 'tragedy', strength: 100 },
    ];
    const rec = recFor('t1', [['alice', 1]]);

    const explanation = explainGroupRecommendation(rec, members, candidate, themeMembership);
    const reason = explanation.perMember[0]?.reasons[0];

    const bridges = (reason?.bridgedFromTagIds ?? []).slice().sort();
    expect(bridges).toEqual(['tmdb:grief', 'tmdb:loss', 'tmdb:tragedy']);
  });

  it('produces ONE theme-bridge reason per theme when a candidate tag belongs to multiple themes the member has signal in', () => {
    // Member has signal in themes A and B (via two distinct anchor tags).
    // Candidate carries a single bridge tag belonging to BOTH themes.
    // Result: two theme-bridge reasons for that tag — one per theme,
    // not aggregated.
    const members: GroupMember[] = [
      {
        userId: 'alice',
        taste: taste([
          ['tmdb:tragedy', 100],
          ['tmdb:antihero', 100],
        ]),
      },
    ];
    const candidate: TitleTagSet = {
      titleId: 't1',
      tags: [{ tagId: 'anilist:DoubleBridge', weight: 80 }],
    };
    const themeMembership: TagThemeMembership[] = [
      { tagId: 'tmdb:tragedy', themeId: 'tragedy', strength: 100 },
      { tagId: 'tmdb:antihero', themeId: 'antihero', strength: 100 },
      { tagId: 'anilist:DoubleBridge', themeId: 'tragedy', strength: 100 },
      { tagId: 'anilist:DoubleBridge', themeId: 'antihero', strength: 100 },
    ];
    const rec = recFor('t1', [['alice', 1]]);

    const explanation = explainGroupRecommendation(rec, members, candidate, themeMembership);
    const reasons = explanation.perMember[0]?.reasons ?? [];

    expect(reasons.length).toBe(2);
    expect(reasons.every((r) => r.kind === 'theme-bridge')).toBe(true);
    expect(reasons.every((r) => r.tagId === 'anilist:DoubleBridge')).toBe(true);
    const themeIds = reasons.map((r) => r.themeId).sort();
    expect(themeIds).toEqual(['antihero', 'tragedy']);
  });
});

describe('explainGroupRecommendation — cross-medium-only rule', () => {
  it("emits ONLY a direct-tag reason when the candidate's tag is in the member's taste, even if that tag bridges to a theme the member has signal in", () => {
    // The cross-medium-only rule (mirrors scoreCandidate): a tag the
    // member already has in taste contributes ONLY via direct-tag, never
    // via theme-bridge — preventing double-counting.
    //
    // Setup: member's taste has BOTH tmdb:tragedy AND tmdb:grief; both
    // map to the `tragedy` theme. Candidate carries tmdb:tragedy. The
    // member has signal in the tragedy theme via tmdb:grief alone, so
    // *if the rule were violated*, a theme-bridge reason would also fire
    // for the tmdb:tragedy candidate tag. It must not.
    const members: GroupMember[] = [
      {
        userId: 'alice',
        taste: taste([
          ['tmdb:tragedy', 100],
          ['tmdb:grief', 100],
        ]),
      },
    ];
    const candidate: TitleTagSet = {
      titleId: 't1',
      tags: [{ tagId: 'tmdb:tragedy', weight: 60 }],
    };
    const themeMembership: TagThemeMembership[] = [
      { tagId: 'tmdb:tragedy', themeId: 'tragedy', strength: 100 },
      { tagId: 'tmdb:grief', themeId: 'tragedy', strength: 100 },
    ];
    const rec = recFor('t1', [['alice', 1]]);

    const explanation = explainGroupRecommendation(rec, members, candidate, themeMembership);
    const reasons = explanation.perMember[0]?.reasons ?? [];

    expect(reasons.length).toBe(1);
    expect(reasons[0]?.kind).toBe('direct-tag');
    expect(reasons.every((r) => r.kind !== 'theme-bridge')).toBe(true);
  });
});

describe('explainGroupRecommendation — reason ordering', () => {
  it('sorts reasons by contribution descending so the strongest reason is at index 0', () => {
    // Hand-computed contributions:
    //   actionT: 100 × 90 = 9000 (largest)
    //   mechaT:   80 × 70 = 5600
    //   dramaT:   30 × 40 = 1200 (smallest)
    const members: GroupMember[] = [
      {
        userId: 'alice',
        taste: taste([
          ['actionT', 100],
          ['mechaT', 80],
          ['dramaT', 30],
        ]),
      },
    ];
    const candidate: TitleTagSet = {
      titleId: 't1',
      tags: [
        { tagId: 'dramaT', weight: 40 },
        { tagId: 'actionT', weight: 90 },
        { tagId: 'mechaT', weight: 70 },
      ],
    };
    const rec = recFor('t1', [['alice', 1]]);

    const explanation = explainGroupRecommendation(rec, members, candidate);
    const reasons = explanation.perMember[0]?.reasons ?? [];

    expect(reasons.map((r) => r.tagId)).toEqual(['actionT', 'mechaT', 'dramaT']);
    expect(reasons.map((r) => r.contribution)).toEqual([9000, 5600, 1200]);
  });
});

describe('explainGroupRecommendation — sharedDirectTags', () => {
  it("returns the intersection of candidate tags with every member's taste in a 3-member group", () => {
    // Only `actionT` is in ALL three members' tastes AND on the candidate.
    // `mechaT` is on the candidate but missing from carol's taste.
    const members: GroupMember[] = [
      {
        userId: 'alice',
        taste: taste([
          ['actionT', 100],
          ['mechaT', 80],
        ]),
      },
      {
        userId: 'bob',
        taste: taste([
          ['actionT', 90],
          ['mechaT', 70],
        ]),
      },
      { userId: 'carol', taste: taste([['actionT', 50]]) },
    ];
    const candidate: TitleTagSet = {
      titleId: 't1',
      tags: [
        { tagId: 'actionT', weight: 80 },
        { tagId: 'mechaT', weight: 70 },
      ],
    };
    const rec = recFor('t1', [
      ['alice', 1],
      ['bob', 1],
      ['carol', 1],
    ]);

    const explanation = explainGroupRecommendation(rec, members, candidate);

    expect(explanation.sharedDirectTags).toEqual(['actionT']);
  });

  it('is empty when only one member is in the group', () => {
    const members: GroupMember[] = [{ userId: 'alice', taste: taste([['actionT', 100]]) }];
    const candidate: TitleTagSet = {
      titleId: 't1',
      tags: [{ tagId: 'actionT', weight: 80 }],
    };
    const rec = recFor('t1', [['alice', 1]]);

    const explanation = explainGroupRecommendation(rec, members, candidate);

    expect(explanation.sharedDirectTags).toEqual([]);
  });

  it("is empty when no candidate tag appears in every member's taste", () => {
    const members: GroupMember[] = [
      { userId: 'alice', taste: taste([['actionT', 100]]) },
      { userId: 'bob', taste: taste([['mechaT', 100]]) },
    ];
    const candidate: TitleTagSet = {
      titleId: 't1',
      tags: [
        { tagId: 'actionT', weight: 80 },
        { tagId: 'mechaT', weight: 70 },
      ],
    };
    const rec = recFor('t1', [
      ['alice', 1],
      ['bob', 1],
    ]);

    const explanation = explainGroupRecommendation(rec, members, candidate);

    expect(explanation.sharedDirectTags).toEqual([]);
  });
});

describe('explainGroupRecommendation — sharedBridgeThemes', () => {
  it('returns themes for which AT LEAST 2 members have signal AND the candidate carries a tag', () => {
    // Theme `tragedy`: alice has tmdb:tragedy, bob has anilist:Tragedy
    //   (2-member signal). Candidate carries anilist:Tragedy (in theme).
    //   → qualifies.
    // Theme `cooking`: only carol has signal (anilist:Cooking).
    //   Candidate doesn't carry any cooking tag.
    //   → does NOT qualify.
    const members: GroupMember[] = [
      { userId: 'alice', taste: taste([['tmdb:tragedy', 100]]) },
      { userId: 'bob', taste: taste([['anilist:Tragedy', 100]]) },
      { userId: 'carol', taste: taste([['anilist:Cooking', 100]]) },
    ];
    const candidate: TitleTagSet = {
      titleId: 't1',
      tags: [{ tagId: 'anilist:Tragedy', weight: 80 }],
    };
    const themeMembership: TagThemeMembership[] = [
      { tagId: 'tmdb:tragedy', themeId: 'tragedy', strength: 100 },
      { tagId: 'anilist:Tragedy', themeId: 'tragedy', strength: 100 },
      { tagId: 'anilist:Cooking', themeId: 'cooking', strength: 100 },
    ];
    const rec = recFor('t1', [
      ['alice', 1],
      ['bob', 1],
      ['carol', 0],
    ]);

    const explanation = explainGroupRecommendation(rec, members, candidate, themeMembership);

    expect(explanation.sharedBridgeThemes).toEqual(['tragedy']);
  });

  it('is empty when the candidate carries no tag in any multi-member theme', () => {
    // Two members share the `tragedy` theme but the candidate carries
    // an unrelated tag with no theme membership at all → no qualifying
    // theme reaches the count check.
    const members: GroupMember[] = [
      { userId: 'alice', taste: taste([['tmdb:tragedy', 100]]) },
      { userId: 'bob', taste: taste([['anilist:Tragedy', 100]]) },
    ];
    const candidate: TitleTagSet = {
      titleId: 't1',
      tags: [{ tagId: 'anilist:CookingShow', weight: 80 }],
    };
    const themeMembership: TagThemeMembership[] = [
      { tagId: 'tmdb:tragedy', themeId: 'tragedy', strength: 100 },
      { tagId: 'anilist:Tragedy', themeId: 'tragedy', strength: 100 },
    ];
    const rec = recFor('t1', [
      ['alice', 0],
      ['bob', 0],
    ]);

    const explanation = explainGroupRecommendation(rec, members, candidate, themeMembership);

    expect(explanation.sharedBridgeThemes).toEqual([]);
  });
});

describe('explainGroupRecommendation — empty edges', () => {
  it('returns empty perMember, sharedDirectTags, and sharedBridgeThemes for an empty members array', () => {
    const candidate: TitleTagSet = {
      titleId: 't1',
      tags: [{ tagId: 'actionT', weight: 80 }],
    };
    const rec = recFor('t1');

    const explanation = explainGroupRecommendation(rec, [], candidate);

    expect(explanation.perMember).toEqual([]);
    expect(explanation.sharedDirectTags).toEqual([]);
    expect(explanation.sharedBridgeThemes).toEqual([]);
  });

  it('returns an empty reasons array for a member with an empty taste vector', () => {
    const members: GroupMember[] = [{ userId: 'alice', taste: taste([]) }];
    const candidate: TitleTagSet = {
      titleId: 't1',
      tags: [{ tagId: 'actionT', weight: 80 }],
    };
    const rec = recFor('t1', [['alice', 0]]);

    const explanation = explainGroupRecommendation(rec, members, candidate);

    expect(explanation.perMember[0]?.reasons).toEqual([]);
  });

  it('returns empty reasons arrays for every member when the candidate has no tags', () => {
    const members: GroupMember[] = [
      { userId: 'alice', taste: taste([['actionT', 100]]) },
      { userId: 'bob', taste: taste([['mechaT', 100]]) },
    ];
    const candidate: TitleTagSet = { titleId: 't1', tags: [] };
    const rec = recFor('t1', [
      ['alice', 0],
      ['bob', 0],
    ]);

    const explanation = explainGroupRecommendation(rec, members, candidate);

    expect(explanation.perMember.map((m) => m.reasons.length)).toEqual([0, 0]);
    expect(explanation.sharedDirectTags).toEqual([]);
    expect(explanation.sharedBridgeThemes).toEqual([]);
  });
});

describe('formatRecExplanation — headline strategy', () => {
  it('uses "Both like {tags}" when sharedDirectTags is non-empty (priority 1)', () => {
    const explanation: RecExplanation = {
      titleId: 't1',
      perMember: [],
      sharedDirectTags: ['actionT', 'mechaT'],
      sharedBridgeThemes: ['tragedy'], // present but lower priority
    };

    const formatted = formatRecExplanation(explanation);

    expect(formatted.headline).toBe('Both like actionT and mechaT');
  });

  it('uses "Bridges your {themes}" when sharedDirectTags is empty but sharedBridgeThemes is non-empty (priority 2)', () => {
    const explanation: RecExplanation = {
      titleId: 't1',
      perMember: [],
      sharedDirectTags: [],
      sharedBridgeThemes: ['tragedy', 'antihero'],
    };

    const formatted = formatRecExplanation(explanation);

    expect(formatted.headline).toBe('Bridges your tragedy and antihero');
  });

  it('falls back to "Recommended for the group" when both shared arrays are empty (priority 3)', () => {
    const explanation: RecExplanation = {
      titleId: 't1',
      perMember: [],
      sharedDirectTags: [],
      sharedBridgeThemes: [],
    };

    const formatted = formatRecExplanation(explanation);

    expect(formatted.headline).toBe('Recommended for the group');
  });
});

describe('formatRecExplanation — naming', () => {
  it('falls back to raw tag/theme IDs in the headline when no name maps are provided', () => {
    const explanation: RecExplanation = {
      titleId: 't1',
      perMember: [],
      sharedDirectTags: ['actionT'],
      sharedBridgeThemes: [],
    };

    const formatted = formatRecExplanation(explanation);

    expect(formatted.headline).toBe('Both like actionT');
  });

  it('uses friendly tag names in the headline when tagNames map is provided', () => {
    const explanation: RecExplanation = {
      titleId: 't1',
      perMember: [],
      sharedDirectTags: ['actionT', 'mechaT'],
      sharedBridgeThemes: [],
    };
    const names: FormatterNames = {
      tagNames: new Map<string, string>([
        ['actionT', 'Action'],
        ['mechaT', 'Mecha'],
      ]),
    };

    const formatted = formatRecExplanation(explanation, names);

    expect(formatted.headline).toBe('Both like Action and Mecha');
  });

  it('uses friendly theme names in the headline when themeNames map is provided', () => {
    const explanation: RecExplanation = {
      titleId: 't1',
      perMember: [],
      sharedDirectTags: [],
      sharedBridgeThemes: ['tragedy'],
    };
    const names: FormatterNames = {
      themeNames: new Map<string, string>([['tragedy', 'Tragedy']]),
    };

    const formatted = formatRecExplanation(explanation, names);

    expect(formatted.headline).toBe('Bridges your Tragedy');
  });
});

describe('formatRecExplanation — list formatting', () => {
  it('formats a single-item list as just the item ("X")', () => {
    const explanation: RecExplanation = {
      titleId: 't1',
      perMember: [],
      sharedDirectTags: ['actionT'],
      sharedBridgeThemes: [],
    };

    const formatted = formatRecExplanation(explanation);

    expect(formatted.headline).toBe('Both like actionT');
  });

  it('formats a two-item list as "X and Y"', () => {
    const explanation: RecExplanation = {
      titleId: 't1',
      perMember: [],
      sharedDirectTags: ['actionT', 'mechaT'],
      sharedBridgeThemes: [],
    };

    const formatted = formatRecExplanation(explanation);

    expect(formatted.headline).toBe('Both like actionT and mechaT');
  });

  it('truncates 3+ shared tags down to top-2 in the headline (slice before formatList)', () => {
    // Three items in sharedDirectTags. The headline should ONLY include
    // the top-2 because the formatter slices to 2 before formatting.
    // Result: "X and Y" not "X, Y, and Z".
    const explanation: RecExplanation = {
      titleId: 't1',
      perMember: [],
      sharedDirectTags: ['actionT', 'mechaT', 'dramaT'],
      sharedBridgeThemes: [],
    };

    const formatted = formatRecExplanation(explanation);

    expect(formatted.headline).toBe('Both like actionT and mechaT');
  });
});

describe('formatRecExplanation — per-member lines', () => {
  const directReason = (tagId: string, contribution: number): ExplanationReason => ({
    kind: 'direct-tag',
    tagId,
    contribution,
  });
  const bridgeReason = (
    tagId: string,
    themeId: string,
    bridgedFromTagIds: ReadonlyArray<string>,
    contribution: number,
  ): ExplanationReason => ({
    kind: 'theme-bridge',
    tagId,
    themeId,
    bridgedFromTagIds,
    contribution,
  });

  it('formats a per-member line as "{userId}: {top-2 reasons} — {score.toFixed(2)}"', () => {
    const member: PerMemberExplanation = {
      userId: 'alice',
      normalizedScore: 0.876,
      reasons: [directReason('actionT', 9000), directReason('mechaT', 5600)],
    };
    const explanation: RecExplanation = {
      titleId: 't1',
      perMember: [member],
      sharedDirectTags: [],
      sharedBridgeThemes: [],
    };

    const formatted = formatRecExplanation(explanation);

    expect(formatted.perMember[0]).toBe('alice: actionT, mechaT — 0.88');
  });

  it("renders direct-tag reasons as just the tag's friendly name when tagNames is provided", () => {
    const member: PerMemberExplanation = {
      userId: 'alice',
      normalizedScore: 1,
      reasons: [directReason('actionT', 9000)],
    };
    const explanation: RecExplanation = {
      titleId: 't1',
      perMember: [member],
      sharedDirectTags: [],
      sharedBridgeThemes: [],
    };
    const names: FormatterNames = {
      tagNames: new Map<string, string>([['actionT', 'Action']]),
    };

    const formatted = formatRecExplanation(explanation, names);

    expect(formatted.perMember[0]).toBe('alice: Action — 1.00');
  });

  it('renders theme-bridge reasons as "{themeName} (via {bridgedFromTagName})"', () => {
    const member: PerMemberExplanation = {
      userId: 'alice',
      normalizedScore: 0.5,
      reasons: [bridgeReason('anilist:Tragedy', 'tragedy', ['tmdb:tragedy'], 4000)],
    };
    const explanation: RecExplanation = {
      titleId: 't1',
      perMember: [member],
      sharedDirectTags: [],
      sharedBridgeThemes: [],
    };
    const names: FormatterNames = {
      tagNames: new Map<string, string>([['tmdb:tragedy', 'Tragedy (TV)']]),
      themeNames: new Map<string, string>([['tragedy', 'Tragedy']]),
    };

    const formatted = formatRecExplanation(explanation, names);

    expect(formatted.perMember[0]).toBe('alice: Tragedy (via Tragedy (TV)) — 0.50');
  });

  it('renders an em-dash placeholder when a member has no reasons', () => {
    const member: PerMemberExplanation = {
      userId: 'ghost',
      normalizedScore: 0,
      reasons: [],
    };
    const explanation: RecExplanation = {
      titleId: 't1',
      perMember: [member],
      sharedDirectTags: [],
      sharedBridgeThemes: [],
    };

    const formatted = formatRecExplanation(explanation);

    expect(formatted.perMember[0]).toBe('ghost: — — 0.00');
  });
});
