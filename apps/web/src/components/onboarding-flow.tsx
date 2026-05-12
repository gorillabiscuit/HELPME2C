'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
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

  // Two-step flow: intro (value prop) → picker. The intro is the first thing
  // a new signed-up user sees after age-check, and it answers "what is this
  // app and what am I about to do." Returning users with anchors don't hit
  // this page at all (the server-side redirect on /onboarding sends them to
  // /taste). The intro stays in client state — there's no need to persist
  // "user dismissed intro" because the redirect already covers the case.
  const [phase, setPhase] = useState<'intro' | 'picker'>('intro');

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

  // Rated-taste model: picking a poster says "I've watched this and
  // loved it — rate it 10/10." Writes a tracking entry with
  // status=completed + rating=10. Unpicking removes the entry. The
  // user can refine the rating later from the title detail page.
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
      upsertMutation.mutate({
        titleId: title.id,
        kind: 'tracking',
        status: 'completed',
        rating: 10,
      });
    }
  };

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

      {/* Sticky bottom bar — picked count + Continue. Always available;
          no minimum-anchor gate so users who want to skip can. They can
          return to /onboarding later if they want to add more. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <p className="text-sm text-text-body">
            <span className="font-semibold text-foreground">{picked.size}</span>{' '}
            {picked.size === 1 ? 'title rated' : 'titles rated'}
          </p>
          <Button onClick={() => router.push('/')}>
            {picked.size === 0 ? 'Skip for now' : 'Continue'}
          </Button>
        </div>
      </div>
    </main>
  );
}
