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

  // Pass the full per-title state so the Add tab's TitleQuickActions
  // reflect "already in your library / already rated" on each card.
  // (Per-tab data for Ranked / Compare lives on tRPC and is fetched
  // client-side from the workspace.)
  const initialEntries = watchEntries.map(({ entry, title }) => ({
    titleId: title.id,
    status: entry.status,
    rating: entry.rating,
  }));

  return <TasteWorkspace initialPopular={popularTitles} initialEntries={initialEntries} />;
}
