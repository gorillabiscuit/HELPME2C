import { redirect } from 'next/navigation';
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
  const [popularTitles, watchEntries, params] = await Promise.all([
    caller.titles.popular({ limit: 16 }),
    caller.watch.list(),
    searchParams,
  ]);

  // /onboarding is the first-visit funnel. Returning users who already
  // have any rated titles get the permanent refine surface — the Ranked
  // view inside Library (formerly /taste, merged 2026-05-14).
  //
  // CRITICAL: the redirect is gated on the user NOT being in an active
  // picking session (signalled by ?start=pick). Without that gate, rating
  // any single title triggers TitleQuickActions' router.refresh(), which
  // re-runs this Server Component, which sees hasAnyRating=true, and
  // bounces the user out of the picker after their first pick. The
  // OnboardingFlow client component pushes ?start=pick into the URL when
  // the user clicks "Let's go", and the marker survives router.refresh.
  const hasAnyRating = watchEntries.some(({ entry }) => entry.rating !== null);
  const isInPickerSession = params.start === 'pick';
  if (hasAnyRating && !isInPickerSession) {
    redirect('/library?view=ranked');
  }

  // Pass the full per-title state so TitleQuickActions on each card
  // reflects "already on your list / already rated" — important for a
  // cold-start user who's revisiting the picker mid-flow.
  const initialEntries = watchEntries.map(({ entry, title }) => ({
    titleId: title.id,
    status: entry.status,
    rating: entry.rating,
  }));

  // ?start=pick → skip the intro phase. Used by the empty-dashboard
  // "Pick favourites" CTA AND by OnboardingFlow itself when the user
  // clicks "Let's go" (the picker writes the marker so the redirect
  // above doesn't fire mid-pick).
  const initialPhase = params.start === 'pick' ? 'picker' : 'intro';

  return (
    <OnboardingFlow
      initialPopular={popularTitles}
      initialEntries={initialEntries}
      initialPhase={initialPhase}
    />
  );
}
