'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TitleQuickActions } from '@/components/title-quick-actions';

type WatchStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

interface TitleSummary {
  id: string;
  title: string;
  originalTitle: string | null;
  mediaType: 'tv' | 'film' | 'anime';
  releaseYear: number | null;
  posterUrl: string | null;
  popularityScore: number | null;
}

interface InitialEntry {
  titleId: string;
  status: WatchStatus | null;
  rating: number | null;
}

interface OnboardingFlowProps {
  initialPopular: TitleSummary[];
  initialEntries: InitialEntry[];
}

const MEDIA_TYPE_LABEL: Record<string, string> = {
  tv: 'TV',
  film: 'Film',
  anime: 'Anime',
};

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;

export function OnboardingFlow({ initialPopular, initialEntries }: OnboardingFlowProps) {
  const router = useRouter();

  // Two-step flow: intro (value prop) → picker. The intro is the first
  // thing a new signed-up user sees after age-check.
  const [phase, setPhase] = useState<'intro' | 'picker'>('intro');

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

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

  // Map for fast per-card state lookup, derived from the prop so it
  // refreshes when TitleQuickActions triggers router.refresh after a
  // mutation.
  const entryByTitleId = useMemo(() => {
    const m = new Map<string, { status: WatchStatus | null; rating: number | null }>();
    for (const e of initialEntries) {
      m.set(e.titleId, { status: e.status, rating: e.rating });
    }
    return m;
  }, [initialEntries]);

  // Count rated entries (status=completed with a rating). The footer
  // CTA reads "Continue" once we have any rated signal; otherwise
  // "Skip for now".
  const ratedCount = initialEntries.filter((e) => e.rating !== null).length;

  const showingSearchResults = searchEnabled;
  const titlesToShow: TitleSummary[] = showingSearchResults
    ? (searchQuery.data ?? [])
    : initialPopular;
  const isLoadingResults = showingSearchResults && searchQuery.isFetching;

  if (phase === 'intro') {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Welcome to HelpME2C</h1>
        <p className="mt-4 text-lg text-text-body">
          A recommendation engine for TV, film, and anime — designed for what to watch alone, and
          what to watch with someone else.
        </p>

        <div className="mt-12 space-y-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Step 1 · Now
            </h2>
            <p className="mt-2 text-base text-foreground">
              Rate a few shows you&apos;ve watched and loved. Each pick says &ldquo;I love
              this&rdquo; — we use that to start understanding your taste.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Step 2 · After
            </h2>
            <p className="mt-2 text-base text-foreground">
              You&apos;ll land on your personal recommendations. The more you do — rate shows, mark
              what you&apos;ve watched, love new things — the smarter the recs get. You can also
              build groups with a partner or household for joint suggestions.
            </p>
          </div>
        </div>

        <div className="mt-12 flex items-center gap-4">
          <Button size="lg" onClick={() => setPhase('picker')}>
            Let&apos;s go
          </Button>
          <Link
            href="/"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Skip for now
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 pt-12 pb-32">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight">Rate shows you&apos;ve loved</h1>
        <p className="mt-3 text-base text-text-body">
          Click a poster you&apos;ve watched and loved — that&apos;s a 10/10 rating, and it teaches
          us your taste. Five or six is plenty to start; you can refine ratings and add more anytime
          from <em>Your taste</em>.
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

      {/* Sticky bottom bar — rated count + Continue. The user can skip
          ahead with no ratings; we'd just have nothing to recommend
          until they rate something. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <p className="text-sm text-text-body">
            <span className="font-semibold text-foreground">{ratedCount}</span>{' '}
            {ratedCount === 1 ? 'title rated' : 'titles rated'}
          </p>
          <Button onClick={() => router.push('/')}>
            {ratedCount === 0 ? 'Skip for now' : 'Continue'}
          </Button>
        </div>
      </div>
    </main>
  );
}
