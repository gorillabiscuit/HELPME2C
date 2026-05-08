// Group-rec transparency layer per ADR-0020 §UX-transparency:
// "every group recommendation surfaces its own explanation —
// 'recommended for both because [theme overlap, predicted scores,
// agreement signal]'." The ADR notes lab studies consistently find
// that an *explained* mediocre rec feels better than an *unexplained*
// excellent rec, so this surface is load-bearing for product
// satisfaction independently of the algorithm's accuracy.
//
// Pure logic, no formatting decisions baked in. The structured
// `explainGroupRecommendation` output is what the web app renders;
// `formatRecExplanation` is a default formatter that consumers can
// either use as-is or replace with their own copy strategy.

import type {
  GroupMember,
  GroupRecommendation,
  TagThemeMembership,
  TitleTagSet,
  UserTasteVector,
} from './recommendation';
import { buildTagThemeIndex, buildTasteTheme } from './scoring';

/** One reason a single tag on the candidate contributed to a member's
 * score. `kind` distinguishes a direct tag-overlap match (the member
 * already has this tag in their taste) from a cross-medium theme bridge
 * (the member's taste connects via a shared theme). */
export interface ExplanationReason {
  readonly kind: 'direct-tag' | 'theme-bridge';
  /** The candidate's tag id that contributed. */
  readonly tagId: string;
  /** Set when `kind === 'theme-bridge'`. The theme that connects the
   * candidate's tag to one of the member's tags. */
  readonly themeId?: string;
  /** Set when `kind === 'theme-bridge'`. The member's tag(s) that
   * actually have signal in the bridging theme — surfaces *what
   * connection* the bridge is exposing, not just "some bridge happened." */
  readonly bridgedFromTagIds?: ReadonlyArray<string>;
  /** Raw score contribution from this tag. Used for sorting reasons
   * within a member's explanation (top reasons first). Same scale as
   * the underlying recommendForUser scores — comparable across reasons
   * for the same member only. */
  readonly contribution: number;
}

/** One member's view on a group rec. */
export interface PerMemberExplanation {
  readonly userId: string;
  /** Normalised 0..1 score from recommendForGroup's perUserScores. */
  readonly normalizedScore: number;
  /** All reasons (direct + bridge) that contributed, sorted by
   * contribution descending. Callers typically slice to top-N for
   * display — keeping all here so the formatter's "top N" choice can
   * vary without re-running the explanation logic. */
  readonly reasons: ReadonlyArray<ExplanationReason>;
}

/** Full structured explanation for one group rec. The web app uses this
 * to render the per-card transparency line plus per-member breakdown
 * (e.g. on hover or in an expanded view). */
export interface RecExplanation {
  readonly titleId: string;
  readonly perMember: ReadonlyArray<PerMemberExplanation>;
  /** Tag ids that EVERY member has signal in directly AND the candidate
   * carries. This is the "shared interest" copy hook — the strongest
   * group-rec story when it's present. */
  readonly sharedDirectTags: ReadonlyArray<string>;
  /** Theme ids that bridge AT LEAST TWO members through cross-medium
   * (i.e. the theme has signal in one member's taste via tag X and
   * another member's via tag Y, with both X and Y in the candidate or
   * member tastes). The "you wouldn't have found this on your own"
   * story when present. */
  readonly sharedBridgeThemes: ReadonlyArray<string>;
}

/** Per-member breakdown variant of scoreCandidate — accumulates reasons
 * instead of just summing. Keeps logic in lockstep with scoreCandidate
 * by mirroring it line-for-line. */
function explainCandidateScore(
  taste: UserTasteVector,
  candidate: TitleTagSet,
  tagThemes: ReturnType<typeof buildTagThemeIndex>,
  tasteTheme: ReturnType<typeof buildTasteTheme>,
): ExplanationReason[] {
  const reasons: ExplanationReason[] = [];
  for (const tag of candidate.tags) {
    const tasteWeight = taste.get(tag.tagId);
    if (tasteWeight !== undefined) {
      // Direct tag match — same path as scoreCandidate.
      reasons.push({
        kind: 'direct-tag',
        tagId: tag.tagId,
        contribution: tasteWeight * tag.weight,
      });
      continue;
    }
    // Cross-medium bridge — find which theme(s) the candidate's tag
    // belongs to AND which of the member's tags supply signal to those
    // themes.
    const memberships = tagThemes.get(tag.tagId);
    if (!memberships) continue;
    for (const m of memberships) {
      const themeWeight = tasteTheme.get(m.themeId);
      if (themeWeight === undefined) continue;
      const bridgedFrom = bridgingTagsFor(taste, tagThemes, m.themeId);
      reasons.push({
        kind: 'theme-bridge',
        tagId: tag.tagId,
        themeId: m.themeId,
        bridgedFromTagIds: bridgedFrom,
        contribution: themeWeight * tag.weight * (m.strength / 100),
      });
    }
  }
  // Sort descending — top contributors first so callers can slice to
  // "top N reasons."
  reasons.sort((a, b) => b.contribution - a.contribution);
  return reasons;
}

/** Find the member's tag ids that contribute signal to a specific
 * theme — used to populate `bridgedFromTagIds` so the UX can say
 * "via your interest in X" rather than just "via theme Y." */
function bridgingTagsFor(
  taste: UserTasteVector,
  tagThemes: ReturnType<typeof buildTagThemeIndex>,
  themeId: string,
): string[] {
  const bridges: string[] = [];
  for (const tagId of taste.keys()) {
    const memberships = tagThemes.get(tagId);
    if (!memberships) continue;
    if (memberships.some((m) => m.themeId === themeId)) {
      bridges.push(tagId);
    }
  }
  // Sort for reproducibility — affects "via your interest in X" UX:
  // without this, Map iteration order leaks through and the first
  // bridge tag shown depends on insertion order.
  bridges.sort();
  return bridges;
}

/**
 * Build a structured explanation for a single group rec — what the web
 * app renders as the transparency layer on each rec card.
 *
 * Inputs:
 *   - `rec` — the GroupRecommendation row (titleId + perUserScores)
 *   - `members` — same array passed to recommendForGroup
 *   - `candidate` — the candidate's TitleTagSet (caller looks up by
 *     `rec.titleId`; passed in so this function stays pure / DB-agnostic)
 *   - `themeMembership` — same data passed to recommendForGroup;
 *     defaults to empty (single-medium groups need no bridges)
 *
 * Output: structured RecExplanation. Caller (web app) decides display
 * formatting; `formatRecExplanation` below is a default formatter.
 */
export function explainGroupRecommendation(
  rec: GroupRecommendation,
  members: ReadonlyArray<GroupMember>,
  candidate: TitleTagSet,
  themeMembership: ReadonlyArray<TagThemeMembership> = [],
): RecExplanation {
  const tagThemes = buildTagThemeIndex(themeMembership);

  const perMember: PerMemberExplanation[] = members.map((m) => {
    const tasteTheme = buildTasteTheme(m.taste, tagThemes);
    const reasons = explainCandidateScore(m.taste, candidate, tagThemes, tasteTheme);
    return {
      userId: m.userId,
      normalizedScore: rec.perUserScores.get(m.userId) ?? 0,
      reasons,
    };
  });

  // sharedDirectTags: candidate tags that EVERY member has direct signal
  // in. Strongest "shared interest" story. Only populated if 2+ members.
  // Sorted for reproducibility — order leaks into the headline ("Both
  // like X and Y" vs "Both like Y and X").
  const candidateTagIds = new Set(candidate.tags.map((t) => t.tagId));
  const sharedDirectTags: string[] =
    members.length >= 2
      ? Array.from(candidateTagIds)
          .filter((tagId) => members.every((m) => m.taste.has(tagId)))
          .sort()
      : [];

  // sharedBridgeThemes: themes that bridge at least 2 members. A theme
  // qualifies if at least 2 members have any tag with signal in that
  // theme AND the candidate carries a tag in that theme.
  const candidateBridgeThemes = new Set<string>();
  for (const tag of candidate.tags) {
    const memberships = tagThemes.get(tag.tagId);
    if (!memberships) continue;
    for (const m of memberships) candidateBridgeThemes.add(m.themeId);
  }
  const sharedBridgeThemes: string[] = [];
  for (const themeId of candidateBridgeThemes) {
    let memberCount = 0;
    for (const m of members) {
      // Member has signal in this theme if any of their taste tags
      // belongs to it. We use bridgingTagsFor to check via the
      // tagThemes index.
      if (bridgingTagsFor(m.taste, tagThemes, themeId).length > 0) {
        memberCount += 1;
        if (memberCount >= 2) break;
      }
    }
    if (memberCount >= 2) sharedBridgeThemes.push(themeId);
  }
  sharedBridgeThemes.sort();

  return {
    titleId: rec.titleId,
    perMember,
    sharedDirectTags,
    sharedBridgeThemes,
  };
}

/** Optional name maps for the formatter — let consumers swap tag/theme
 * IDs for friendly display names. Without them, the formatter falls
 * back to IDs. */
export interface FormatterNames {
  readonly tagNames?: ReadonlyMap<string, string>;
  readonly themeNames?: ReadonlyMap<string, string>;
}

/** Default formatter output. */
export interface FormattedExplanation {
  /** One-line headline suitable for a rec-card subtitle. */
  readonly headline: string;
  /** Per-member breakdown, one line each. */
  readonly perMember: ReadonlyArray<string>;
}

/**
 * Default text formatter. The web app can use this directly or write
 * its own. Naming defaults to ID-as-name when no name map is provided.
 *
 * Headline strategy (in priority order):
 *   1. If sharedDirectTags exist → "Both like {top-2 tag names}"
 *   2. Else if sharedBridgeThemes exist → "Bridges your {top-2 theme names}"
 *   3. Else → "Recommended for the group"
 *
 * Per-member: "{userId}: {top-2 reason summaries} — {score.toFixed(2)}".
 * The em-dash separator is used; an empty reasons list renders as "—".
 */
export function formatRecExplanation(
  explanation: RecExplanation,
  names: FormatterNames = {},
): FormattedExplanation {
  const tagName = (id: string) => names.tagNames?.get(id) ?? id;
  const themeName = (id: string) => names.themeNames?.get(id) ?? id;

  let headline: string;
  if (explanation.sharedDirectTags.length > 0) {
    const top = explanation.sharedDirectTags.slice(0, 2).map(tagName);
    headline = `Both like ${formatList(top)}`;
  } else if (explanation.sharedBridgeThemes.length > 0) {
    const top = explanation.sharedBridgeThemes.slice(0, 2).map(themeName);
    headline = `Bridges your ${formatList(top)}`;
  } else {
    headline = 'Recommended for the group';
  }

  const perMember = explanation.perMember.map((member) => {
    const top = member.reasons.slice(0, 2).map((r) => {
      if (r.kind === 'direct-tag') return tagName(r.tagId);
      return `${themeName(r.themeId!)} (via ${tagName((r.bridgedFromTagIds ?? [])[0] ?? r.tagId)})`;
    });
    const reasonText = top.length > 0 ? top.join(', ') : '—';
    return `${member.userId}: ${reasonText} — ${member.normalizedScore.toFixed(2)}`;
  });

  return { headline, perMember };
}

function formatList(items: ReadonlyArray<string>): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}
