'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PreviewOverlay } from '@/components/preview-overlay';
import { TitleQuickActions } from '@/components/title-quick-actions';
import { franchiseDisplayName } from '@/server/lib/franchise';
import { cn } from '@/lib/utils';

type WatchStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

interface TitleSummary {
  id: string;
  title: string;
  originalTitle: string | null;
  mediaType: 'tv' | 'film' | 'anime';
  releaseYear: number | null;
  posterUrl: string | null;
  popularityScore: number | null;
  trailerProvider: string | null;
  trailerVideoId: string | null;
}

interface InitialEntry {
  titleId: string;
  status: WatchStatus | null;
  rating: number | null;
}

interface OnboardingFlowProps {
  initialPopular: TitleSummary[];
  initialEntries: InitialEntry[];
  /** Title IDs the user has already actioned via "Not interested"
   * (dismissed) or "Don't know it" (unfamiliar). The picker hides these
   * — without it, the cards would fade out and then pop straight back
   * in, because neither action writes a watch entry. */
  hiddenTitleIds: string[];
  /** Which step to show on mount. `'intro'` is the post-signup landing
   * (value-prop screen → Let's go button → picker). `'picker'` skips
   * the intro for users arriving via a deliberate "start picking" CTA
   * elsewhere in the app (e.g. the empty-dashboard "Pick favourites"
   * button — they've already opted in by clicking). Default `'intro'`. */
  initialPhase?: 'intro' | 'picker' | 'dislikes' | 'preferences';
}

const MEDIA_TYPE_LABEL: Record<string, string> = {
  tv: 'TV',
  film: 'Film',
  anime: 'Anime',
};

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 250;
// Fade-out duration before the picker card unmounts after the user
// acts on it. Matches the CSS transition below.
const TRANSITION_OUT_MS = 220;

export function OnboardingFlow({
  initialPopular,
  initialEntries,
  hiddenTitleIds,
  initialPhase = 'intro',
}: OnboardingFlowProps) {
  const router = useRouter();

  // Two-step flow: intro (value prop) → picker. The intro is the first
  // thing a new signed-up user sees after age-check; entries from
  // "Pick favourites" pass initialPhase='picker' to skip it.
  const [phase, setPhase] = useState<'intro' | 'picker' | 'dislikes' | 'preferences'>(initialPhase);

  // IDs of titles the user liked in Screen 1 — passed to the mainstream
  // query so the dislike grid doesn't show titles they've already rated.
  const [likedTitleIds, setLikedTitleIds] = useState<string[]>([]);

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Titles being faded out — held briefly so the CSS transition runs
  // before the parent re-render with new server state removes them.
  const [exiting, setExiting] = useState<Set<string>>(new Set());

  const handleActionComplete = (titleId: string) => {
    setExiting((s) => new Set(s).add(titleId));
    // setTimeout here is for animation timing, not retry — §3 ban is
    // specifically about retry loops.
    setTimeout(() => {
      setExiting((s) => {
        const next = new Set(s);
        next.delete(titleId);
        return next;
      });
    }, TRANSITION_OUT_MS);
  };

  // Debounce the search input so we don't fire a tRPC query on every
  // keystroke. setTimeout here is for input debounce, not retry — the
  // §3 ban on setTimeout is specifically about retry loops.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // Dislike phase — mainstream titles (sorted by vote count) for Screen 2.
  // Only fetched when the user reaches the dislikes phase.
  const mainstreamQuery = trpc.titles.mainstream.useQuery(
    { limit: 36, excludeTitleIds: likedTitleIds },
    { enabled: phase === 'dislikes' },
  );

  // Write a 1/10 dislike rating. Uses the same watch.upsert path as likes
  // but with rating:1 — the bipolar formula maps this to a strong negative
  // weight in the taste vector.
  const dislikeMutation = trpc.watch.upsert.useMutation();
  const [dislikedIds, setDislikedIds] = useState<Set<string>>(new Set());

  const handleDislike = (titleId: string) => {
    if (dislikedIds.has(titleId)) return;
    setDislikedIds((s) => new Set(s).add(titleId));
    dislikeMutation.mutate({ titleId, kind: 'tracking', rating: 1 });
  };

  // Screen 3 — feature preference state. Each axis is null (not answered),
  // -1 (left option chosen), or +1 (right option chosen).
  const [prefs, setPrefs] = useState<{
    tone: number | null;
    pacing: number | null;
    ending: number | null;
    intensity: number | null;
    complexity: number | null;
    moral: number | null;
    violenceVeto: boolean | null;
    sexualContentVeto: boolean | null;
  }>({
    tone: null,
    pacing: null,
    ending: null,
    intensity: null,
    complexity: null,
    moral: null,
    violenceVeto: null,
    sexualContentVeto: null,
  });
  const prefsMutation = trpc.preferences.upsert.useMutation();

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
  const rawTitlesToShow: TitleSummary[] = showingSearchResults
    ? (searchQuery.data ?? [])
    : initialPopular;
  const isLoadingResults = showingSearchResults && searchQuery.isFetching;

  // Hide titles the user has already rated/added from the popular grid
  // so each action makes room for a new title to rate. Mid-fade cards
  // (`exiting`) stay rendered until their transition finishes. Search
  // results are not filtered — if a user explicitly searched a title
  // they already rated, they want to see it.
  //
  // hiddenIds captures titles actioned via "Not interested" / "Don't
  // know it" — neither writes a watch entry, so the entry-based check
  // alone wouldn't hide them.
  const hiddenIds = useMemo(() => new Set(hiddenTitleIds), [hiddenTitleIds]);
  const titlesToShow = showingSearchResults
    ? rawTitlesToShow
    : rawTitlesToShow.filter((title) => {
        if (exiting.has(title.id)) return true;
        if (hiddenIds.has(title.id)) return false;
        const entry = entryByTitleId.get(title.id);
        return !entry || entry.status === null;
      });

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
          <Button
            size="lg"
            onClick={() => {
              // Set client state first (instant UI swap to picker), then
              // push the ?start=pick marker into the URL. The Server
              // Component (apps/web/src/app/onboarding/page.tsx) reads
              // that marker to set initialPhase='picker' — so when a
              // rating triggers TitleQuickActions' router.refresh(),
              // the server re-renders with initialPhase='picker' and
              // the user stays on the picker instead of being bounced
              // back to the intro screen.
              setPhase('picker');
              router.replace('/onboarding?start=pick');
            }}
          >
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

  if (phase === 'dislikes') {
    const dislikeTitles = mainstreamQuery.data ?? [];
    return (
      <main className="mx-auto max-w-5xl px-6 pt-12 pb-32">
        <header className="mb-8 max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight">What really isn&apos;t for you?</h1>
          <p className="mt-3 text-base text-text-body">
            Tap anything you&apos;ve watched and genuinely didn&apos;t enjoy. This is just as useful
            as what you love — it tells us what to avoid. Skip anything you haven&apos;t seen.
          </p>
        </header>

        {mainstreamQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {dislikeTitles.map((title) => {
              const isDisliked = dislikedIds.has(title.id);
              const displayTitle = franchiseDisplayName(title.title);
              return (
                <li key={title.id}>
                  <button
                    type="button"
                    onClick={() => handleDislike(title.id)}
                    className="group w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 rounded-lg"
                  >
                    <div
                      className={cn(
                        'relative aspect-[2/3] overflow-hidden rounded-lg border bg-muted transition',
                        isDisliked
                          ? 'border-destructive ring-2 ring-destructive'
                          : 'border-border group-hover:border-input',
                      )}
                    >
                      {title.posterUrl ? (
                        <Image
                          src={title.posterUrl}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 200px, (min-width: 640px) 33vw, 50vw"
                          className={cn('object-cover transition', isDisliked && 'opacity-60')}
                        />
                      ) : null}
                      {isDisliked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-destructive/20">
                          <span className="text-3xl">✕</span>
                        </div>
                      )}
                    </div>
                    <h3 className="mt-2 truncate text-sm font-medium text-foreground">
                      {displayTitle}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {[
                        MEDIA_TYPE_LABEL[title.mediaType] ?? title.mediaType,
                        title.releaseYear?.toString(),
                      ]
                        .filter((s): s is string => Boolean(s))
                        .join(' · ')}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <p className="text-sm text-text-body">
              <span className="font-semibold text-foreground">{dislikedIds.size}</span>{' '}
              {dislikedIds.size === 1 ? 'title marked' : 'titles marked'}
            </p>
            <Button onClick={() => setPhase('preferences')}>
              {dislikedIds.size === 0
                ? 'Skip — what do you like watching?'
                : 'Next — a few quick questions'}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (phase === 'preferences') {
    const answeredCount = Object.values(prefs).filter((v) => v !== null).length;

    const axes: Array<{
      key: keyof typeof prefs;
      left: string;
      right: string;
    }> = [
      { key: 'tone', left: 'Dark and brooding', right: 'Light and playful' },
      { key: 'pacing', left: 'Slow and atmospheric', right: 'Fast-paced and propulsive' },
      { key: 'ending', left: 'Downbeat or ambiguous', right: 'Uplifting resolution' },
      { key: 'intensity', left: 'Cosy and easy-going', right: 'Emotionally intense' },
      { key: 'complexity', left: 'Straightforward story', right: 'Complex structure or ideas' },
      { key: 'moral', left: 'Clear heroes and villains', right: 'Morally grey protagonists' },
    ];

    return (
      <main className="mx-auto max-w-2xl px-6 pt-12 pb-32">
        <header className="mb-10 max-w-xl">
          <h1 className="text-4xl font-semibold tracking-tight">A few quick questions</h1>
          <p className="mt-3 text-base text-text-body">
            Pick whichever option fits you better. Skip anything you don&apos;t have a strong
            feeling about.
          </p>
        </header>

        <div className="space-y-4">
          {axes.map(({ key, left, right }) => {
            const val = prefs[key] as number | null;
            return (
              <div key={key} className="rounded-xl border border-border p-4">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPrefs((p) => ({ ...p, [key]: -1 }))}
                    className={cn(
                      'rounded-lg border px-4 py-3 text-sm font-medium text-left transition',
                      val === -1
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border hover:border-input',
                    )}
                  >
                    {left}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrefs((p) => ({ ...p, [key]: 1 }))}
                    className={cn(
                      'rounded-lg border px-4 py-3 text-sm font-medium text-left transition',
                      val === 1
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border hover:border-input',
                    )}
                  >
                    {right}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Content vetoes — checkboxes, not forced choice */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Content I&apos;d rather avoid
            </p>
            {(
              [
                { key: 'violenceVeto' as const, label: 'Graphic violence' },
                { key: 'sexualContentVeto' as const, label: 'Sexual content' },
              ] as const
            ).map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs[key] === true}
                  onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked || null }))}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
            <p className="text-sm text-text-body">
              <span className="font-semibold text-foreground">{answeredCount}</span> of{' '}
              {axes.length + 2} answered
            </p>
            <Button
              onClick={() => {
                if (answeredCount > 0) {
                  prefsMutation.mutate(prefs);
                }
                router.push('/');
              }}
            >
              {answeredCount === 0 ? 'Skip for now' : 'Show me my recs'}
            </Button>
          </div>
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
          us your taste. Pick 3 to get started; 5 is great, 10 is plenty. You can refine ratings and
          add more anytime from <em>Your taste</em>.
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
            // In onboarding the user is rating "the show" not "the season".
            // Strip season suffixes for display so "My Hero Academia 2nd
            // Season" reads as "My Hero Academia". The rec engine already
            // rolls ratings up by franchise, so storing against this
            // specific titleId is fine — only the display needed fixing.
            const displayTitle = franchiseDisplayName(title.title);
            const entry = entryByTitleId.get(title.id);
            const isExiting = exiting.has(title.id);
            return (
              <li
                key={title.id}
                className={cn(
                  'transition-all duration-200 ease-out',
                  isExiting && 'pointer-events-none scale-95 opacity-0',
                )}
              >
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
                    <PreviewOverlay
                      trailerProvider={title.trailerProvider}
                      trailerVideoId={title.trailerVideoId}
                      titleText={displayTitle}
                    />
                  </div>
                  <h3 className="mt-2 truncate text-sm font-medium text-foreground group-hover:underline">
                    {displayTitle}
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
                  onActionComplete={() => handleActionComplete(title.id)}
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
          <Button
            onClick={() => {
              if (ratedCount === 0) {
                router.push('/');
                return;
              }
              // Capture the IDs of titles rated positively so the dislike
              // grid can exclude them.
              const liked = initialEntries
                .filter((e) => e.rating !== null && e.rating >= 7)
                .map((e) => e.titleId);
              setLikedTitleIds(liked);
              setPhase('dislikes');
            }}
          >
            {ratedCount === 0
              ? 'Skip for now'
              : ratedCount < 3
                ? 'Continue'
                : "Next — what don't you like?"}
          </Button>
        </div>
      </div>
    </main>
  );
}
