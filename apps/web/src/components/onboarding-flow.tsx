'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TitleSummary {
  id: string;
  title: string;
  originalTitle: string | null;
  mediaType: 'tv' | 'film' | 'anime';
  releaseYear: number | null;
  posterUrl: string | null;
  popularityScore: number | null;
}

interface OnboardingFlowProps {
  initialPopular: TitleSummary[];
  initialAnchorIds: string[];
}

const MEDIA_TYPE_LABEL: Record<string, string> = {
  tv: 'TV',
  film: 'Film',
  anime: 'Anime',
};

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;

export function OnboardingFlow({ initialPopular, initialAnchorIds }: OnboardingFlowProps) {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set(initialAnchorIds));

  // Debounce the search input so we don't fire a tRPC query on every
  // keystroke. setTimeout here is for input debounce, not retry — the
  // §3 ban on setTimeout is specifically about retry loops.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const searchEnabled = debouncedQuery.trim().length >= MIN_QUERY_LENGTH;
  const searchQuery = trpc.titles.search.useQuery(
    { q: debouncedQuery, limit: 24 },
    { enabled: searchEnabled },
  );

  const upsertMutation = trpc.watch.upsert.useMutation();
  const removeMutation = trpc.watch.remove.useMutation();

  const handlePick = (title: TitleSummary) => {
    if (picked.has(title.id)) {
      // Optimistic toggle off; mutation runs in background. Page reload
      // would resync if the mutation ever failed.
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
    : initialPopular;
  const isLoadingResults = showingSearchResults && searchQuery.isFetching;

  return (
    <main className="mx-auto max-w-5xl px-6 pt-12 pb-32">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">Tell us what you love</h1>
        <p className="mt-3 text-text-body">
          Pick a few titles that represent your taste — anything you&apos;d recommend to a friend.
          We&apos;ll use these as <em>anchors</em> for your personal recommendations. Five or six is
          plenty; you can always add more later.
        </p>
      </header>

      <div className="mb-8 max-w-md">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any title…"
          autoFocus
        />
      </div>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {showingSearchResults
          ? isLoadingResults
            ? 'Searching…'
            : titlesToShow.length === 0
              ? `No titles match “${debouncedQuery.trim()}”`
              : 'Search results'
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
                  className={cn(
                    'group block w-full text-left transition focus-visible:outline-none',
                    isPicked && 'opacity-100',
                  )}
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
                      <span className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
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

      {/* Sticky bottom bar — picked count + Continue. Always available;
          no minimum-anchor gate so users who want to skip can. They can
          return to /onboarding later if they want to add more. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <p className="text-sm text-text-body">
            <span className="font-semibold text-foreground">{picked.size}</span>{' '}
            {picked.size === 1 ? 'anchor' : 'anchors'} picked
          </p>
          <Button onClick={() => router.push('/')}>
            {picked.size === 0 ? 'Skip for now' : 'Continue'}
          </Button>
        </div>
      </div>
    </main>
  );
}
