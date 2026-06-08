'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  initialPhase?: 'intro' | 'picker' | 'insight' | 'dislikes' | 'dislike-insight' | 'preferences';
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
  const [phase, setPhase] = useState<
    'intro' | 'picker' | 'insight' | 'dislikes' | 'dislike-insight' | 'preferences'
  >(initialPhase);

  // Insight screen state — populated by the generateInsight mutation.
  type InsightOption = { label: string; slugs: string[] };
  type PerShowInsight = {
    titleId: string;
    titleName: string;
    posterUrl: string | null;
    question: string;
    options: InsightOption[];
  };
  const [insightShows, setInsightShows] = useState<PerShowInsight[]>([]);
  const [insightIndex, setInsightIndex] = useState(0);
  const [selectedOptionIndices, setSelectedOptionIndices] = useState<Set<number>>(new Set());
  // Accumulated slugs across all shows in the session.
  const [accumulatedSlugs, setAccumulatedSlugs] = useState<string[]>([]);
  const generateInsightMutation = trpc.preferences.generateInsight.useMutation();
  const saveInsightMutation = trpc.preferences.saveInsight.useMutation();

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

  // Dislike phase — mainstream titles for Screen 2.
  // seenDislikeIds grows on each refresh so we never show the same title twice.
  const [seenDislikeIds, setSeenDislikeIds] = useState<string[]>([]);
  const mainstreamQuery = trpc.titles.mainstream.useQuery(
    { limit: 36, excludeTitleIds: [...likedTitleIds, ...seenDislikeIds] },
    { enabled: phase === 'dislikes' },
  );

  const handleDislikeRefresh = () => {
    const currentIds = (mainstreamQuery.data ?? []).map((t) => t.id);
    setSeenDislikeIds((prev) => [...new Set([...prev, ...currentIds])]);
  };

  // Like = 10/10 rating + status:completed. Fires on poster tap.
  const likeMutation = trpc.watch.upsert.useMutation();
  const [likedLocalIds, setLikedLocalIds] = useState<Set<string>>(new Set());

  // Like grid refresh — tracks seen IDs to exclude on next fetch.
  const [seenLikeIds, setSeenLikeIds] = useState<string[]>([]);
  const [likeRefreshCount, setLikeRefreshCount] = useState(0);
  const popularRefreshQuery = trpc.titles.popular.useQuery(
    { limit: 50, excludeTitleIds: seenLikeIds },
    { enabled: likeRefreshCount > 0 },
  );
  const handleLikeRefresh = () => {
    const currentIds = (
      likeRefreshCount === 0 ? initialPopular : (popularRefreshQuery.data ?? [])
    ).map((t) => t.id);
    setSeenLikeIds((prev) => [...new Set([...prev, ...currentIds, ...Array.from(likedLocalIds)])]);
    setLikeRefreshCount((n) => n + 1);
  };
  // After first refresh, use the client query result instead of the server prop.
  const activeLikePool =
    likeRefreshCount > 0 ? (popularRefreshQuery.data ?? initialPopular) : initialPopular;
  const likePoolLoading = likeRefreshCount > 0 && popularRefreshQuery.isFetching;

  // Local set of title IDs the user skipped ("Haven't seen it").
  // Not written to the DB — just hides the card for the session.
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  const handleSkip = (titleId: string) => {
    setSkippedIds((s) => new Set(s).add(titleId));
  };

  // Dislike = 1/10 rating. Same optimistic pattern as likes — card
  // disappears immediately, mutation fires in background.
  const dislikeMutation = trpc.watch.upsert.useMutation();
  const [dislikedLocalIds, setDislikedLocalIds] = useState<Set<string>>(new Set());

  const handleDislike = (titleId: string) => {
    setDislikedLocalIds((s) => new Set(s).add(titleId));
    handleActionComplete(titleId);
    // 3 = "Didn't like it" on the 3-point scale — same value used in
    // TitleQuickActions so the rating signal is consistent across surfaces.
    dislikeMutation.mutate({ titleId, kind: 'tracking', rating: 3 });
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
    : activeLikePool;
  const isLoadingResults = (showingSearchResults && searchQuery.isFetching) || likePoolLoading;

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
  const titlesToShow = rawTitlesToShow.filter((title) => {
    if (exiting.has(title.id)) return true;
    if (likedLocalIds.has(title.id)) return false;
    if (!showingSearchResults) {
      if (hiddenIds.has(title.id)) return false;
      if (skippedIds.has(title.id)) return false;
      const entry = entryByTitleId.get(title.id);
      return !entry || (entry.status === null && entry.rating === null);
    }
    return true;
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

  // Shared insight screen — used for both like insight and dislike insight.
  if (phase === 'insight' || phase === 'dislike-insight') {
    const isDislikeInsight = phase === 'dislike-insight';
    const isLoading = generateInsightMutation.isPending || insightShows.length === 0;
    const currentShow = insightShows[insightIndex];
    const total = insightShows.length;

    const advanceOrFinish = (newSlugs: string[]) => {
      const merged = [...new Set([...accumulatedSlugs, ...newSlugs])];
      const isLast = insightIndex >= total - 1;
      if (isLast) {
        // Always save on the final show, even if merged is empty — a user who
        // picked only viewer-state options ("not in the mood") produces no
        // slugs intentionally, and that is valid (it means "don't down-weight
        // anything"). Skipping the save would leave stale data from a previous
        // onboarding run in place.
        saveInsightMutation.mutate({
          slugs: merged,
          mode: isDislikeInsight ? 'dislike' : 'like',
        });
        setAccumulatedSlugs([]);
        setPhase(isDislikeInsight ? 'preferences' : 'dislikes');
      } else {
        setAccumulatedSlugs(merged);
        setInsightIndex((n) => n + 1);
        setSelectedOptionIndices(new Set());
      }
    };

    const handleNext = () => {
      const selected = currentShow
        ? [...selectedOptionIndices]
            .flatMap((i) => currentShow.options[i]?.slugs ?? [])
            .filter((s, i, arr) => arr.indexOf(s) === i)
        : [];
      advanceOrFinish(selected);
    };

    const handleSkipAll = () => {
      saveInsightMutation.mutate({
        slugs: accumulatedSlugs,
        mode: isDislikeInsight ? 'dislike' : 'like',
      });
      setAccumulatedSlugs([]);
      setPhase(isDislikeInsight ? 'preferences' : 'dislikes');
    };

    return (
      <main className="mx-auto max-w-xl px-6 pt-10 pb-32">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-8 w-8 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Thinking about your picks…</p>
          </div>
        ) : !currentShow ? (
          <p className="text-muted-foreground">Couldn&apos;t analyse your picks.</p>
        ) : (
          <>
            {/* Progress */}
            {total > 1 && (
              <p className="mb-6 text-xs text-muted-foreground uppercase tracking-wider">
                {insightIndex + 1} of {total}
              </p>
            )}

            {/* Show poster + question */}
            <div className="flex gap-5 mb-8 items-start">
              {currentShow.posterUrl && (
                <div className="relative w-20 shrink-0 aspect-[2/3] overflow-hidden rounded-lg border border-border bg-muted">
                  <Image
                    src={currentShow.posterUrl}
                    alt={currentShow.titleName}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>
              )}
              <h1 className="text-xl font-semibold tracking-tight leading-snug pt-1">
                {currentShow.question}
              </h1>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentShow.options.map((option, i) => {
                const isSelected = selectedOptionIndices.has(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setSelectedOptionIndices((prev) => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      })
                    }
                    className={cn(
                      'w-full rounded-xl border px-5 py-4 text-left text-sm font-medium transition',
                      isSelected
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border hover:border-input',
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-xl items-center justify-between px-6 py-3">
            <button
              type="button"
              onClick={handleSkipAll}
              className="text-sm text-muted-foreground underline-offset-2 hover:underline"
            >
              Skip all
            </button>
            <Button onClick={handleNext} disabled={isLoading}>
              {selectedOptionIndices.size === 0
                ? 'Skip'
                : insightIndex >= total - 1
                  ? 'Done'
                  : 'Next'}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (phase === 'dislikes') {
    const dislikeShowingSearch = searchEnabled;
    const dislikeTitles = dislikeShowingSearch
      ? (searchQuery.data ?? []).filter((t) => !dislikedLocalIds.has(t.id))
      : (mainstreamQuery.data ?? []);
    return (
      <main className="mx-auto max-w-5xl px-6 pt-12 pb-32">
        <header className="mb-8 max-w-2xl">
          <h1 className="text-4xl font-semibold tracking-tight">What really isn&apos;t for you?</h1>
          <p className="mt-3 text-base text-text-body">
            Tap anything you&apos;ve watched and genuinely didn&apos;t enjoy. This is just as useful
            as what you love — it tells us what to avoid. Skip anything you haven&apos;t seen.
          </p>
        </header>

        <div className="mb-8 max-w-md">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search any title…"
          />
        </div>

        {mainstreamQuery.isLoading && !dislikeShowingSearch ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {dislikeTitles
              .filter((t) => !dislikedLocalIds.has(t.id) && !exiting.has(t.id))
              .map((title) => {
                const displayTitle = franchiseDisplayName(title.title);
                return (
                  <li
                    key={title.id}
                    className={cn(
                      'transition-all duration-200 ease-out',
                      exiting.has(title.id) && 'pointer-events-none scale-95 opacity-0',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleDislike(title.id)}
                      className="group relative block w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 rounded-lg"
                    >
                      <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-muted transition group-hover:border-foreground group-hover:shadow-md">
                        {title.posterUrl ? (
                          <Image
                            src={title.posterUrl}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 200px, (min-width: 640px) 33vw, 50vw"
                            className="object-cover"
                          />
                        ) : null}
                        <div className="absolute inset-0 flex items-end justify-center pb-3 opacity-0 transition group-hover:opacity-100 group-active:opacity-100 bg-gradient-to-t from-black/60 to-transparent">
                          <span className="text-sm font-semibold text-white">
                            Didn&apos;t like it ✕
                          </span>
                        </div>
                      </div>
                    </button>
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
                    <button
                      type="button"
                      onClick={() => handleSkip(title.id)}
                      className="mt-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
                    >
                      Haven&apos;t seen it
                    </button>
                  </li>
                );
              })}
          </ul>
        )}

        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <div className="flex items-center gap-4">
              <p className="text-sm text-text-body">
                <span className="font-semibold text-foreground">{dislikedLocalIds.size}</span>{' '}
                {dislikedLocalIds.size === 1 ? 'marked' : 'marked'}
              </p>
              {!dislikeShowingSearch && (
                <button
                  type="button"
                  onClick={handleDislikeRefresh}
                  disabled={mainstreamQuery.isFetching}
                  className="text-sm text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
                >
                  {mainstreamQuery.isFetching ? 'Loading…' : 'Show me different ones'}
                </button>
              )}
            </div>
            <Button
              onClick={() => {
                const dislikedArr = [...dislikedLocalIds];
                // Same 5-show cap as the like insight — see comment there.
                // dislikedArr is built from the ordered dislike grid so the
                // first 5 are the user's top picks.
                const dislikeInsightIds = dislikedArr.slice(0, 5);
                if (dislikeInsightIds.length >= 3) {
                  setSelectedOptionIndices(new Set());
                  setPhase('dislike-insight');
                  generateInsightMutation.mutate(
                    { titleIds: dislikeInsightIds, mode: 'dislike' },
                    {
                      onSuccess: (data) => {
                        setInsightShows(data ?? []);
                        setInsightIndex(0);
                        setAccumulatedSlugs([]);
                      },
                    },
                  );
                } else {
                  setPhase('preferences');
                }
              }}
            >
              {dislikedLocalIds.size === 0 ? 'None here — skip' : 'Next'}
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
        <h1 className="text-4xl font-semibold tracking-tight">Tap shows you love</h1>
        <p className="mt-3 text-base text-text-body">
          Tap a poster to say you loved it. Haven&apos;t seen it? Skip it. Pick 3 to get started — 5
          or more gives us a lot to work with.
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
            const displayTitle = franchiseDisplayName(title.title);
            const isExiting = exiting.has(title.id);
            return (
              <li
                key={title.id}
                className={cn(
                  'transition-all duration-200 ease-out',
                  isExiting && 'pointer-events-none scale-95 opacity-0',
                )}
              >
                {/* Tap the poster = loved it */}
                <button
                  type="button"
                  onClick={() => {
                    // Mark liked locally so the filter keeps it hidden
                    // even after router.refresh() re-renders the list.
                    setLikedLocalIds((s) => new Set(s).add(title.id));
                    handleActionComplete(title.id);
                    likeMutation.mutate(
                      { titleId: title.id, kind: 'tracking', status: 'completed', rating: 10 },
                      { onSuccess: () => router.refresh() },
                    );
                  }}
                  className="group relative block w-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 rounded-lg"
                >
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-muted transition group-hover:border-foreground group-hover:shadow-md">
                    {title.posterUrl ? (
                      <Image
                        src={title.posterUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 200px, (min-width: 640px) 33vw, 50vw"
                        className="object-cover"
                      />
                    ) : null}
                    <div className="absolute inset-0 flex items-end justify-center pb-3 opacity-0 transition group-hover:opacity-100 group-active:opacity-100 bg-gradient-to-t from-black/60 to-transparent">
                      <span className="text-sm font-semibold text-white">Loved it ♥</span>
                    </div>
                  </div>
                </button>
                <h3 className="mt-2 truncate text-sm font-medium text-foreground">
                  {displayTitle}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {[mediaTypeLabel, title.releaseYear?.toString()]
                    .filter((s): s is string => Boolean(s))
                    .join(' · ')}
                </p>
                <button
                  type="button"
                  onClick={() => handleSkip(title.id)}
                  className="mt-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  Haven&apos;t seen it
                </button>
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
          <div className="flex items-center gap-4">
            <p className="text-sm text-text-body">
              <span className="font-semibold text-foreground">{ratedCount}</span>{' '}
              {ratedCount === 1 ? 'picked' : 'picked'}
            </p>
            {!showingSearchResults && (
              <button
                type="button"
                onClick={handleLikeRefresh}
                disabled={likePoolLoading}
                className="text-sm text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
              >
                {likePoolLoading ? 'Loading…' : 'Show me different ones'}
              </button>
            )}
          </div>
          <Button
            onClick={() => {
              if (ratedCount === 0) {
                router.push('/');
                return;
              }
              const liked = initialEntries
                .filter((e) => e.rating !== null && e.rating >= 7)
                .map((e) => e.titleId);
              setLikedTitleIds(liked);
              setSelectedOptionIndices(new Set());
              // Generate insight if ≥3 picks — skip straight to dislikes if fewer.
              // Cap at 5: research (arXiv 2510.27342) shows query fatigue sets in
              // fast; 3–5 well-chosen questions outperform exhaustive elicitation.
              // Take the first 5 (most recently updated — initialEntries is
              // DESC-sorted by updatedAt) so we ask about the freshest picks.
              const insightIds = liked.slice(0, 5);
              if (insightIds.length >= 3) {
                setPhase('insight');
                generateInsightMutation.mutate(
                  { titleIds: insightIds, mode: 'like' },
                  {
                    onSuccess: (data) => {
                      setInsightShows(data ?? []);
                      setInsightIndex(0);
                      setAccumulatedSlugs([]);
                    },
                  },
                );
              } else {
                setPhase('dislikes');
              }
            }}
          >
            {ratedCount === 0
              ? 'Skip for now'
              : ratedCount < 3
                ? `${ratedCount} of 5 — keep going`
                : ratedCount < 5
                  ? `${ratedCount} of 5 — or continue`
                  : 'Next'}
          </Button>
        </div>
      </div>
    </main>
  );
}
