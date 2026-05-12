import { appRouter } from '@/server/router';
import { createContext } from '@/server/trpc';
import { TasteWorkspace } from '@/components/taste-workspace';
import { requireAgeVerified } from '@/lib/require-age-verified';

// /taste — permanent home for taste refinement under the rated-taste
// model. Three modes (tabs): Ranked (drag-to-reorder), Compare (pairwise
// Elo), Add (search + popular grid). The page itself is a thin server
// component that fetches the popular grid + pre-filled ratings; the
// TasteWorkspace client component handles tab state and per-tab data.
export default async function TastePage() {
  await requireAgeVerified();

  const caller = appRouter.createCaller(await createContext());
  const [popularTitles, watchEntries] = await Promise.all([
    caller.titles.popular({ limit: 24 }),
    caller.watch.list(),
  ]);

  // Pre-fill the Add tab's picker with already-rated titles so the user
  // sees their existing picks highlighted. (Per-tab data for Ranked /
  // Compare lives on tRPC and is fetched client-side from the workspace.)
  const initialRatedIds = watchEntries
    .filter(({ entry }) => entry.rating !== null)
    .map(({ title }) => title.id);

  return <TasteWorkspace initialPopular={popularTitles} initialAnchorIds={initialRatedIds} />;
}
