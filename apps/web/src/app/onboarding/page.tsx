import { appRouter } from '@/server/router';
import { createContext } from '@/server/trpc';
import { OnboardingFlow } from '@/components/onboarding-flow';
import { requireAgeVerified } from '@/lib/require-age-verified';

// M3 Path A — cold-start anchor capture. Reached automatically post-signup
// via `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/age-check` →
// /age-check submit → router.push('/onboarding'). Returning users can also
// visit directly to add more anchors.
//
// v1 scope is the search + popular-titles grid + multi-pick + Save loop.
// Deferred to follow-on commits (most of which depend on the M4 rec
// engine):
//   - Demographics step (region / age / gender as soft priors). Region
//     is already captured by /age-check; the additional priors land if
//     and when they materially improve the rec engine
//   - Multi-bar per-dimension confidence meter — needs the rec engine to
//     compute confidence per theme dimension
//   - Cross-cluster prompt after 3 anchors share a tight theme signature
//     — needs theme-signature analysis (also rec engine)
//   - Genre disambiguation step — could be added without the rec engine
//     using TMDB genres as buckets, but the "skip if anchors are
//     theme-diverse" branch is rec-engine-dependent
//   - "Refine your taste" swipe mode — voluntary post-onboarding entry
interface OnboardingPageProps {
  searchParams: Promise<{ start?: string }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  await requireAgeVerified();

  const caller = appRouter.createCaller(await createContext());

  // Ensure the user row exists in the DB before any mutations fire.
  // me.ensure is idempotent (ON CONFLICT DO UPDATE) — safe to call on
  // every page load. Without this, fresh sign-ups landing directly on
  // /onboarding have no user row and all mutations return 404/500.
  await caller.me.ensure();

  const [popularTitles, watchEntries, feedbackEntries, params] = await Promise.all([
    // limit 50 + server-side exclusion of watch_entries AND rec_feedback:
    // every router.refresh() after a card action re-queries and brings
    // fresh titles in at the tail, so a user who clicks "Don't know it"
    // on a row of unfamiliar shows still gets new ones to look at instead
    // of running out.
    caller.titles.popular({ limit: 50, excludeUserEntries: true, excludeRecFeedback: true }),
    caller.watch.list(),
    caller.recFeedback.list(),
    searchParams,
  ]);

  // No auto-redirect to /library here. A previous version redirected when
  // any watch entry had a rating, but TitleQuickActions calls
  // router.refresh() after every mutation — so the *first* rating during
  // an in-flight onboarding session would kick the user out of the
  // picker. The "send returning users to /library" intent is satisfied
  // by the picker reflecting their existing state plus the bottom-bar
  // Continue button (which navigates to /), so returning users still get
  // a sensible flow without breaking cold-start.

  // Pass the full per-title state so TitleQuickActions on each card
  // reflects "already on your list / already rated" — important for a
  // cold-start user who's revisiting the picker mid-flow.
  const initialEntries = watchEntries.map(({ entry, title }) => ({
    titleId: title.id,
    status: entry.status,
    rating: entry.rating,
  }));

  // Titles the user has acted on via "Not interested" (dismissed) or
  // "Don't know it" (unfamiliar). The onboarding filter needs these to
  // hide the cards after the action — neither button writes a watch
  // entry, so initialEntries alone wouldn't tell the picker to hide
  // them. Both are treated the same way at the UI: just "don't show me
  // this card again right now". The engine still treats dismissed and
  // unfamiliar differently for future recs (see recFeedback router).
  const dismissedOrUnfamiliarTitleIds = feedbackEntries
    .filter((f) => f.dismissed || f.unfamiliar)
    .map((f) => f.titleId);

  // ?start=pick → skip the intro phase. Used by:
  //   - the empty-dashboard "Pick favourites" CTA (deliberate opt-in
  //     to the picker, so we shouldn't re-show the value-prop screen)
  //   - OnboardingFlow's own "Let's go" button (so a router.refresh
  //     during the picking session doesn't bounce the user back to the
  //     intro screen).
  const initialPhase = params.start === 'pick' ? 'picker' : 'intro';

  return (
    <OnboardingFlow
      initialPopular={popularTitles}
      initialEntries={initialEntries}
      hiddenTitleIds={dismissedOrUnfamiliarTitleIds}
      initialPhase={initialPhase}
    />
  );
}
