'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Adapted from OnboardingFlow. Same picker mechanics (search + popular grid
// + multi-pick toggle that writes anchor watch_entries), with three deltas:
//   - No intro step (returning users already know the product)
//   - Media-type filter (TV / Film / Anime / All) — applied to both the
//     popular grid and the search results via the existing `mediaType`
//     arg on titles.popular / titles.search
//   - No "Continue" → / redirect; this surface is ongoing, every pick
//     auto-saves, the user navigates away when done
//
// Refactoring the two components into a shared base lands when the third
// consumer (Phase 1B pairwise/Elo refinement) needs the same grid — at
// that point the dup will be worth removing.

type MediaType = 'tv' | 'film' | 'anime';

interface TitleSummary {
  id: string;
  title: string;
  originalTitle: string | null;
  mediaType: MediaType;
  releaseYear: number | null;
  posterUrl: string | null;
  popularityScore: number | null;
}

interface TastePickerProps {
  initialPopular: TitleSummary[];
  initialAnchorIds: string[];
}

const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  tv: 'TV',
  film: 'Film',
  anime: 'Anime',
};

const MEDIA_TYPE_VALUES: ReadonlyArray<MediaType> = ['tv', 'film', 'anime'] as const;

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;
const POPULAR_LIMIT = 24;

type FilterValue = MediaType | 'all';

export function TastePicker({ initialPopular, initialAnchorIds }: TastePickerProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set(initialAnchorIds));
  const [filter, setFilter] = useState<FilterValue>('all');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const filterArg: MediaType | undefined = filter === 'all' ? undefined : filter;

  // initialPopular came from the server with no filter applied. Re-fetch
  // the popular grid via tRPC whenever filter or initial mount diverges,
  // so the user immediately sees a filtered slice when they pick TV/Film/
  // Anime. React Query keeps prior results cached so toggling the filter
  // back-and-forth is instant.
  // Skip the network round-trip on first paint when the filter is 'all' —
  // we already have initialPopular for that case. exactOptionalPropertyTypes
  // means initialData must be omitted entirely (not set to undefined) when
  // we don't have an initial value to seed.
  const popularQuery = trpc.titles.popular.useQuery(
    { mediaType: filterArg, limit: POPULAR_LIMIT },
    filter === 'all' ? { initialData: initialPopular } : {},
  );

  const searchEnabled = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;
  const searchQuery = trpc.titles.search.useQuery(
    { q: debouncedQuery, mediaType: filterArg, limit: 24 },
    { enabled: searchEnabled },
  );

  const upsertMutation = trpc.watch.upsert.useMutation();
  const removeMutation = trpc.watch.remove.useMutation();

  const handlePick = (title: TitleSummary) => {
    if (picked.has(title.id)) {
      setPicked((p) => {
        const next = new Set(p);
        next.delete(title.id);
        return next;
      });
      removeMutation.mutate({ titleId: title.id });
    } else {
      setPicked((p) => new Set(p).add(title.id));
      upsertMutation.mutate({ titleId: title.id, kind: 'anchor' });
    }
  };

  const showingSearchResults = searchEnabled;
  const titlesToShow: TitleSummary[] = showingSearchResults
    ? (searchQuery.data ?? [])
    : (popularQuery.data ?? []);
  const isLoadingResults = showingSearchResults ? searchQuery.isFetching : popularQuery.isFetching;

  const filterPillClass = (active: boolean) =>
    cn(
      'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition',
      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80',
    );

  return (
    <main className="mx-auto max-w-5xl px-6 pt-12 pb-32">
      <header className="mb-6 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Refine your taste</h1>
        <p className="mt-3 text-text-body">
          Add or remove anchors to shape your recommendations. Every pick saves automatically. More
          refinement modes — pairwise comparisons and manual ranking — arrive in a future release.
        </p>
      </header>

      <div className="mb-6 max-w-md">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any title…"
        />
      </div>

      <nav aria-label="Filter by media type" className="mb-8 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={filterPillClass(filter === 'all')}
        >
          All
        </button>
        {MEDIA_TYPE_VALUES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilter(type)}
            className={filterPillClass(filter === type)}
          >
            {MEDIA_TYPE_LABEL[type]}
          </button>
        ))}
      </nav>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {showingSearchResults
          ? isLoadingResults
            ? 'Searching…'
            : titlesToShow.length === 0
              ? `No titles match “${debouncedQuery.trim()}”`
              : 'Search results'
          : isLoadingResults
            ? 'Loading…'
            : titlesToShow.length === 0
              ? `No ${filter === 'all' ? '' : `${MEDIA_TYPE_LABEL[filter as MediaType].toLowerCase()} `}titles to show`
              : 'Popular right now'}
      </h2>

      {titlesToShow.length > 0 ? (
        <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {titlesToShow.map((title) => {
            const isPicked = picked.has(title.id);
            const mediaTypeLabel = MEDIA_TYPE_LABEL[title.mediaType] ?? title.mediaType;
            return (
              <li key={title.id}>
                <button
                  type="button"
                  onClick={() => handlePick(title)}
                  className="group block w-full text-left transition focus-visible:outline-none"
                  aria-pressed={isPicked}
                >
                  <div
                    className={cn(
                      'relative aspect-[2/3] overflow-hidden rounded-lg border-2 bg-muted transition',
                      isPicked
                        ? 'border-foreground shadow-md'
                        : 'border-transparent group-hover:border-input',
                    )}
                  >
                    {title.posterUrl ? (
                      <Image
                        src={title.posterUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 200px, (min-width: 640px) 33vw, 50vw"
                        className="object-cover"
                      />
                    ) : null}
                    {isPicked ? (
                      <span className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        ✓
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-2 truncate text-sm font-medium text-foreground">
                    {title.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {[mediaTypeLabel, title.releaseYear?.toString()]
                      .filter((s): s is string => Boolean(s))
                      .join(' · ')}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* Sticky bottom bar — picked count + Done. No required "Continue"
          here; picks auto-save and the user navigates back via Done or
          a nav click. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <p className="text-sm text-text-body">
            <span className="font-semibold text-foreground">{picked.size}</span>{' '}
            {picked.size === 1 ? 'anchor' : 'anchors'} picked
          </p>
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
          >
            Done
          </Link>
        </div>
      </div>
    </main>
  );
}
