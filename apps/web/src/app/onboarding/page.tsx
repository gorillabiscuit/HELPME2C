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
export default async function OnboardingPage() {
  await requireAgeVerified();

  const caller = appRouter.createCaller(await createContext());
  const [popularTitles, watchEntries] = await Promise.all([
    caller.titles.popular({ limit: 16 }),
    caller.watch.list(),
  ]);

  // Pre-populate the picked set with any existing anchor entries so
  // returning users see their previous picks reflected in the grid.
  const initialAnchorIds = watchEntries
    .filter(({ entry }) => entry.kind === 'anchor')
    .map(({ title }) => title.id);

  return <OnboardingFlow initialPopular={popularTitles} initialAnchorIds={initialAnchorIds} />;
}
