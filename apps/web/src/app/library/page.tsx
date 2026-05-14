import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { appRouter } from '@/server/router';
import { createContext } from '@/server/trpc';
import { LibraryEditDialog } from '@/components/library-edit-dialog';
import { LibraryRemoveButton } from '@/components/library-remove-button';
import { LibraryRankedView } from '@/components/library-ranked-view';
import { LibraryCompareView } from '@/components/library-compare-view';
import { RatingFace } from '@/components/rating-face';
import { cn } from '@/lib/utils';

const STATUS_LABEL: Record<string, string> = {
  watching: 'Watching',
  completed: 'Completed',
  on_hold: 'On hold',
  dropped: 'Dropped',
  plan_to_watch: 'Plan to watch',
};

const KIND_LABEL: Record<string, string> = {
  anchor: 'Favourite',
  tracking: 'Tracking',
};

const MEDIA_TYPE_LABEL: Record<string, string> = {
  tv: 'TV',
  film: 'Film',
  anime: 'Anime',
};

type ViewMode = 'all' | 'ranked' | 'compare';

const VIEW_LABEL: Record<ViewMode, string> = {
  all: 'All',
  ranked: 'Ranked',
  compare: 'Compare',
};

interface LibraryPageProps {
  searchParams: Promise<{ view?: string; filter?: string; medium?: string }>;
}

type AllFilter = 'all' | 'watched' | 'unwatched';
type Medium = 'all' | 'tv' | 'film' | 'anime';

// Library is the unified "your shows" surface. Three view modes:
//   - all (default): every tracked entry, sorted by recency. Status +
//     episode progress + rating editable per row.
//   - ranked: drag-to-reorder rank list (franchise-grouped per ADR-0023)
//   - compare: pairwise Elo refinement
//
// Merged from the separate /taste page on 2026-05-14 — Ranked and Compare
// used to be tabs on that surface, but the boundary between "my shows"
// and "my taste profile" leaked an implementation detail into the nav.
// One surface, three modes.
export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  // Phase 1A: registered users only per PROJECT.md scope.
  const { userId } = await auth();
  if (!userId) {
    redirect('/');
  }

  const params = await searchParams;
  const view: ViewMode =
    params.view === 'ranked' || params.view === 'compare' ? params.view : 'all';
  const filter: AllFilter =
    params.filter === 'watched' || params.filter === 'unwatched' ? params.filter : 'all';
  const medium: Medium =
    params.medium === 'tv' || params.medium === 'film' || params.medium === 'anime'
      ? params.medium
      : 'all';

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-6">
        <h1 className="text-4xl font-semibold tracking-tight">Library</h1>
        <p className="mt-2 text-base text-text-body">
          {view === 'all'
            ? 'Every show you’re tracking, sorted by recent activity. Update status, episode progress, or rating per row.'
            : view === 'ranked'
              ? 'Your rated shows in preference order. Drag or use the arrows to reorder. Top of the list = strongest taste signal.'
              : 'Pairwise comparison — pick the show you’d rather watch from each pair. Sharpens your ranking without you having to drag everything yourself.'}
        </p>
      </header>

      <ViewTabs current={view} />

      {view === 'all' ? <AllView filter={filter} /> : null}
      {view === 'ranked' ? <LibraryRankedView mediumFilter={medium} /> : null}
      {view === 'compare' ? <LibraryCompareView /> : null}
    </main>
  );
}

function ViewTabs({ current }: { current: ViewMode }) {
  const tabs: ViewMode[] = ['all', 'ranked', 'compare'];
  return (
    <div
      role="tablist"
      aria-label="Library view"
      className="mb-6 flex gap-1 border-b border-border"
    >
      {tabs.map((view) => {
        const href = view === 'all' ? '/library' : `/library?view=${view}`;
        const active = view === current;
        return (
          <Link
            key={view}
            href={href}
            role="tab"
            aria-selected={active}
            className={cn(
              '-mb-px rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2',
              active
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground',
            )}
          >
            {VIEW_LABEL[view]}
          </Link>
        );
      })}
    </div>
  );
}

async function AllView({ filter }: { filter: AllFilter }) {
  const caller = appRouter.createCaller(await createContext());
  const allEntries = await caller.watch.list();

  // Watched = entries marked completed. Unwatched = everything else
  // (watching / on_hold / plan_to_watch / dropped / null status). The
  // user's "watched" mental model is "I've seen this end to end" —
  // dropped doesn't qualify (you dropped it BEFORE finishing).
  const entries = allEntries.filter(({ entry }) => {
    if (filter === 'watched') return entry.status === 'completed';
    if (filter === 'unwatched') return entry.status !== 'completed';
    return true;
  });

  if (allEntries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <p className="text-sm text-text-body">
          Your library is empty. Search for a title to add your first show.
        </p>
        <div className="mt-4 flex justify-center">
          <Link
            href="/search"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
          >
            Search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <FilterChips current={filter} />
      <p className="mb-4 text-sm text-muted-foreground">
        {entries.length} of {allEntries.length} {allEntries.length === 1 ? 'title' : 'titles'}
        {filter === 'all' ? '' : ` · ${filter}`}
      </p>
      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-text-body">
            No {filter} titles. Try a different filter or add more shows.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {entries.map(({ entry, title }) => {
            const kindLabel = KIND_LABEL[entry.kind];
            const statusLabel = entry.status ? STATUS_LABEL[entry.status] : null;
            const mediaTypeLabel = MEDIA_TYPE_LABEL[title.mediaType] ?? title.mediaType;
            return (
              <li key={entry.id} className="flex items-center gap-4 px-4 py-3">
                {title.posterUrl ? (
                  <Link
                    href={`/titles/${title.id}`}
                    className="relative aspect-[2/3] w-[60px] flex-none overflow-hidden rounded border border-border bg-muted"
                  >
                    <Image
                      src={title.posterUrl}
                      alt=""
                      fill
                      sizes="60px"
                      className="object-cover"
                    />
                  </Link>
                ) : (
                  <div className="aspect-[2/3] w-[60px] flex-none rounded border border-border bg-muted" />
                )}

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/titles/${title.id}`}
                    className="block truncate text-sm font-medium text-foreground hover:underline"
                  >
                    {title.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[mediaTypeLabel, title.releaseYear?.toString(), statusLabel ?? kindLabel]
                      .filter((s): s is string => Boolean(s))
                      .join(' · ')}
                  </p>
                </div>

                <div className="flex flex-none items-center gap-2 text-xs">
                  {entry.rating !== null ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                      <span>{entry.rating}/10</span>
                      <RatingFace rating={entry.rating} size="sm" />
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {entry.kind === 'tracking' ? (
                    <LibraryEditDialog
                      titleId={title.id}
                      titleText={title.title}
                      hasEpisodes={title.mediaType !== 'film'}
                      initialEntry={{
                        status: entry.status,
                        currentEpisode: entry.currentEpisode,
                        rating: entry.rating,
                        notes: entry.notes,
                        privacy: entry.privacy,
                      }}
                    />
                  ) : null}
                  <LibraryRemoveButton titleId={title.id} titleText={title.title} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function FilterChips({ current }: { current: AllFilter }) {
  const chips: AllFilter[] = ['all', 'watched', 'unwatched'];
  const labels: Record<AllFilter, string> = {
    all: 'All',
    watched: 'Watched',
    unwatched: 'Unwatched',
  };
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {chips.map((chip) => {
        const href = chip === 'all' ? '/library' : `/library?filter=${chip}`;
        const active = chip === current;
        return (
          <Link
            key={chip}
            href={href}
            className={cn(
              'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2',
              active
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-card text-text-body hover:bg-muted hover:text-foreground',
            )}
          >
            {labels[chip]}
          </Link>
        );
      })}
    </div>
  );
}
