import { appRouter } from '@/server/router';
import { createContext } from '@/server/trpc';
import { TastePicker } from '@/components/taste-picker';
import { requireAgeVerified } from '@/lib/require-age-verified';

// /taste — permanent home for taste refinement. Mounted after a user has
// finished cold-start onboarding (/onboarding redirects here once anchors
// exist). The current surface is the same picker grid as /onboarding plus
// a media-type filter — pairwise/Elo and manual drag-and-drop arrive in
// Phase 1B per the roadmap.
export default async function TastePage() {
  await requireAgeVerified();

  const caller = appRouter.createCaller(await createContext());
  const [popularTitles, watchEntries] = await Promise.all([
    caller.titles.popular({ limit: 24 }),
    caller.watch.list(),
  ]);

  const initialAnchorIds = watchEntries
    .filter(({ entry }) => entry.kind === 'anchor')
    .map(({ title }) => title.id);

  return <TastePicker initialPopular={popularTitles} initialAnchorIds={initialAnchorIds} />;
}
