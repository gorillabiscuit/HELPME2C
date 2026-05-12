'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { Input } from '@/components/ui/input';
import { TitleQuickActions } from '@/components/title-quick-actions';
import { cn } from '@/lib/utils';

// Add-to-taste surface. Used in the /taste workspace's Add tab and as
// the picker grid on /onboarding. Same interaction model as dashboard
// rec cards (Watched it / Want to watch / Not interested) — every
// poster gets the full action panel rather than a single-click rate-10
// shortcut. Consistency over speed, per the rated-taste reframe.
//
// Poster + title text are wrapped in a Link to the title detail page,
// so users can dig into a show before deciding what to do with it.

type MediaType = 'tv' | 'film' | 'anime';
type WatchStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

interface TitleSummary {
  id: string;
  title: string;
  originalTitle: string | null;
  mediaType: MediaType;
  releaseYear: number | null;
  posterUrl: string | null;
  popularityScore: number | null;
}

interface InitialEntry {
  titleId: string;
  status: WatchStatus | null;
  rating: number | null;
}

interface TastePickerProps {
  initialPopular: TitleSummary[];
  initialEntries: InitialEntry[];
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

export function TastePicker({ initialPopular, initialEntries }: TastePickerProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState<FilterValue>('all');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const filterArg: MediaType | undefined = filter === 'all' ? undefined : filter;

  const popularQuery = trpc.titles.popular.useQuery(
    { mediaType: filterArg, limit: POPULAR_LIMIT },
    filter === 'all' ? { initialData: initialPopular } : {},
  );

  const searchEnabled = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;
  const searchQuery = trpc.titles.search.useQuery(
    { q: debouncedQuery, mediaType: filterArg, limit: 24 },
    { enabled: searchEnabled },
  );

  // Map for fast per-card state lookup. Built from the prop so it
  // refreshes when the server re-renders after a TitleQuickActions
  // mutation triggers router.refresh().
  const entryByTitleId = useMemo(() => {
    const m = new Map<string, { status: WatchStatus | null; rating: number | null }>();
    for (const e of initialEntries) {
      m.set(e.titleId, { status: e.status, rating: e.rating });
    }
    return m;
  }, [initialEntries]);

  const showingSearchResults = searchEnabled;
  const titlesToShow: TitleSummary[] = showingSearchResults
    ? (searchQuery.data ?? [])
    : (popularQuery.data ?? []);
  const isLoadingResults = showingSearchResults ? searchQuery.isFetching : popularQuery.isFetching;

  // "N rated" = entries with a non-null rating. The picker is for
  // adding taste signal; want-to-watch is added scaffolding but
  // doesn't count toward the count.
  const ratedCount = initialEntries.filter((e) => e.rating !== null).length;

  const filterPillClass = (active: boolean) =>
    cn(
      'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition',
      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80',
    );

  return (
    <div>
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
            const mediaTypeLabel = MEDIA_TYPE_LABEL[title.mediaType] ?? title.mediaType;
            const entry = entryByTitleId.get(title.id);
            return (
              <li key={title.id}>
                <Link
                  href={`/titles/${title.id}`}
                  className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-muted transition group-hover:border-input">
                    {title.posterUrl ? (
                      <Image
                        src={title.posterUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 200px, (min-width: 640px) 33vw, 50vw"
                        className="object-cover"
                      />
                    ) : null}
                  </div>
                  <h3 className="mt-2 truncate text-sm font-medium text-foreground group-hover:underline">
                    {title.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {[mediaTypeLabel, title.releaseYear?.toString()]
                      .filter((s): s is string => Boolean(s))
                      .join(' · ')}
                  </p>
                </Link>
                <TitleQuickActions
                  titleId={title.id}
                  currentState={entry ? { status: entry.status, rating: entry.rating } : null}
                  size="compact"
                />
              </li>
            );
          })}
        </ul>
      ) : null}

      <p className="mt-6 text-sm text-text-body">
        <span className="font-semibold text-foreground">{ratedCount}</span>{' '}
        {ratedCount === 1 ? 'title rated so far' : 'titles rated so far'}.
      </p>
    </div>
  );
}
