'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronDown, ChevronRight, ChevronUp, GripVertical, Shuffle, Star, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { TastePicker } from '@/components/taste-picker';
import { cn } from '@/lib/utils';

type MediaType = 'tv' | 'film' | 'anime';
type Tab = 'ranked' | 'compare' | 'add';

interface TitleSummary {
  id: string;
  title: string;
  originalTitle: string | null;
  mediaType: MediaType;
  releaseYear: number | null;
  posterUrl: string | null;
  popularityScore: number | null;
  trailerProvider: string | null;
  trailerVideoId: string | null;
}

interface TasteEntry {
  titleId: string;
  rating: number | null;
  eloScore: number | null;
  manualRank: number | null;
  title: {
    id: string;
    title: string;
    mediaType: MediaType;
    releaseYear: number | null;
    posterUrl: string | null;
  };
}

// Franchise-grouped taste shape returned by watch.taste per ADR-0023.
// One row per franchise; each carries the canonical representative's
// display data + the seasons list (sorted chronologically).
interface TasteFranchise {
  franchiseKey: string;
  representative: TasteEntry;
  manualRank: number | null;
  eloScore: number | null;
  meanRating: number;
  seasonCount: number;
  seasons: TasteEntry[];
}

type WatchStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

interface InitialEntry {
  titleId: string;
  status: WatchStatus | null;
  rating: number | null;
}

interface TasteWorkspaceProps {
  initialPopular: TitleSummary[];
  initialEntries: InitialEntry[];
}

const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  tv: 'TV',
  film: 'Film',
  anime: 'Anime',
};

// Three-mode taste workspace. Tabs:
//   - Ranked: drag-to-reorder list of rated titles (manual_rank).
//   - Compare: pairwise comparisons (Elo updater).
//   - Add: search + popular grid, click to add as rating=10.
//
// All three operate on the same watch_entries data; reads come from
// trpc.watch.taste, writes go via setRankedOrder / recordPairwise /
// watch.upsert respectively.
export function TasteWorkspace({ initialPopular, initialEntries }: TasteWorkspaceProps) {
  const [tab, setTab] = useState<Tab>('ranked');

  return (
    <main className="mx-auto max-w-5xl px-6 pt-12 pb-32">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight">Your taste</h1>
        <p className="mt-3 text-base text-text-body">
          Every rating, ranking, and comparison here refines what we recommend. Three ways to shape
          it: drag titles up or down, compare them head-to-head, or add new ones you&apos;ve loved.
        </p>
      </header>

      <div
        role="tablist"
        aria-label="Taste workspace"
        className="mb-6 flex gap-1 border-b border-border"
      >
        <TabButton
          tab="ranked"
          active={tab === 'ranked'}
          onClick={() => setTab('ranked')}
          label="Ranked"
        />
        <TabButton
          tab="compare"
          active={tab === 'compare'}
          onClick={() => setTab('compare')}
          label="Compare"
        />
        <TabButton tab="add" active={tab === 'add'} onClick={() => setTab('add')} label="Add" />
      </div>

      <div
        role="tabpanel"
        id="tabpanel-ranked"
        aria-labelledby="tab-ranked"
        hidden={tab !== 'ranked'}
      >
        {tab === 'ranked' ? <RankedView /> : null}
      </div>
      <div
        role="tabpanel"
        id="tabpanel-compare"
        aria-labelledby="tab-compare"
        hidden={tab !== 'compare'}
      >
        {tab === 'compare' ? <CompareView /> : null}
      </div>
      <div role="tabpanel" id="tabpanel-add" aria-labelledby="tab-add" hidden={tab !== 'add'}>
        {tab === 'add' ? (
          <TastePickerWrapper initialPopular={initialPopular} initialEntries={initialEntries} />
        ) : null}
      </div>
    </main>
  );
}

interface TabButtonProps {
  tab: Tab;
  active: boolean;
  onClick: () => void;
  label: string;
}

function TabButton({ tab, active, onClick, label }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${tab}`}
      aria-selected={active}
      aria-controls={`tabpanel-${tab}`}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={cn(
        '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2',
        active
          ? 'border-foreground text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

// ---------------------------------------------------------------------
// Ranked view — drag-to-reorder list of rated entries.
// ---------------------------------------------------------------------
function RankedView() {
  const router = useRouter();
  const tasteQuery = trpc.watch.taste.useQuery();
  const setRankedOrder = trpc.watch.setRankedOrder.useMutation({
    onSuccess: () => {
      router.refresh();
      tasteQuery.refetch();
    },
  });
  const removeMany = trpc.watch.removeMany.useMutation({
    onSuccess: () => {
      router.refresh();
      tasteQuery.refetch();
    },
  });

  // Local ordering state mirrors the franchise-level list. Drag-and-
  // reorder operates on franchises, NOT on individual seasons — the
  // setRankedOrder mutation sends each franchise's representative
  // titleId. Per-season seasons stay sorted chronologically inside
  // each accordion regardless of drag.
  const [draftOrder, setDraftOrder] = useState<TasteFranchise[] | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  // Which franchise rows are expanded. Keyed by franchiseKey so the
  // open state survives a refetch that swaps the array identity.
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());

  const franchises: TasteFranchise[] = draftOrder ?? tasteQuery.data ?? [];

  if (tasteQuery.isLoading) {
    return <p className="text-sm text-text-body">Loading your taste…</p>;
  }
  if (franchises.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <p className="text-base text-text-body">
          Nothing rated yet. Head to the <strong>Add</strong> tab to pick a few titles you&apos;ve
          watched and loved — that&apos;ll seed your taste.
        </p>
      </div>
    );
  }

  const onDragStart = (idx: number) => {
    setDragIdx(idx);
    if (!draftOrder) setDraftOrder(franchises.slice());
  };

  const onDragOver = (e: React.DragEvent, overIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === overIdx) return;
    setDraftOrder((current) => {
      const list = (current ?? franchises).slice();
      const [moved] = list.splice(dragIdx, 1);
      if (moved) list.splice(overIdx, 0, moved);
      setDragIdx(overIdx);
      return list;
    });
  };

  const commitOrder = (next: TasteFranchise[]) => {
    setRankedOrder.mutate({ orderedTitleIds: next.map((f) => f.representative.titleId) });
  };

  const onDrop = () => {
    if (!draftOrder) return;
    commitOrder(draftOrder);
    setDragIdx(null);
  };

  const moveBy = (idx: number, delta: -1 | 1) => {
    const target = idx + delta;
    if (target < 0 || target >= franchises.length) return;
    const next = franchises.slice();
    const moved = next[idx];
    const swap = next[target];
    if (!moved || !swap) return;
    next[idx] = swap;
    next[target] = moved;
    setDraftOrder(next);
    commitOrder(next);
  };

  const toggleOpen = (key: string) => {
    setOpenKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const removeFranchise = (f: TasteFranchise) => {
    const titleList = f.seasons.map((s) => s.title.title).join(', ');
    const label =
      f.seasonCount > 1
        ? `${f.representative.title.title} (${f.seasonCount} seasons)`
        : f.representative.title.title;
    if (!confirm(`Remove ${label} from your taste? This deletes:\n\n${titleList}`)) return;
    removeMany.mutate({ titleIds: f.seasons.map((s) => s.titleId) });
  };

  const removeSeason = (season: TasteEntry) => {
    if (!confirm(`Remove ${season.title.title} from your taste?`)) return;
    removeMany.mutate({ titleIds: [season.titleId] });
  };

  return (
    <div>
      <p className="mb-4 text-sm text-text-body">
        Drag titles up or down to reorder — or use the arrow buttons on each row for keyboard
        access. Top of the list = strongest taste signal. Changes save automatically.
      </p>
      <ol className="divide-y divide-border rounded-lg border border-border">
        {franchises.map((f, i) => {
          const isOpen = openKeys.has(f.franchiseKey);
          const hasMultiple = f.seasonCount > 1;
          const meanLabel =
            f.meanRating > 0
              ? f.meanRating === Math.round(f.meanRating)
                ? `${f.meanRating}/10`
                : `${f.meanRating.toFixed(1)}/10`
              : null;
          return (
            <li key={f.franchiseKey} className="bg-card">
              <div
                draggable
                onDragStart={() => onDragStart(i)}
                onDragOver={(e) => onDragOver(e, i)}
                onDrop={onDrop}
                onDragEnd={() => setDragIdx(null)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 transition-colors',
                  dragIdx === i ? 'bg-muted opacity-70' : 'hover:bg-muted/40',
                )}
              >
                <GripVertical
                  className="h-4 w-4 flex-none cursor-grab text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="w-8 flex-none text-sm font-medium text-muted-foreground">
                  {i + 1}
                </span>
                {f.representative.title.posterUrl ? (
                  <Image
                    src={f.representative.title.posterUrl}
                    alt=""
                    width={36}
                    height={54}
                    className="aspect-[2/3] flex-none rounded border border-border bg-muted object-cover"
                  />
                ) : (
                  <div className="aspect-[2/3] w-9 flex-none rounded border border-border bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {f.representative.title.title}
                    {hasMultiple ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        · {f.seasonCount} seasons
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      MEDIA_TYPE_LABEL[f.representative.title.mediaType],
                      f.representative.title.releaseYear?.toString(),
                      meanLabel,
                    ]
                      .filter((s): s is string => Boolean(s))
                      .join(' · ')}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-1">
                  {hasMultiple ? (
                    <button
                      type="button"
                      onClick={() => toggleOpen(f.franchiseKey)}
                      aria-label={
                        isOpen
                          ? `Collapse ${f.representative.title.title}`
                          : `Expand ${f.representative.title.title}`
                      }
                      aria-expanded={isOpen}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => moveBy(i, -1)}
                    disabled={i === 0 || setRankedOrder.isPending}
                    aria-label={`Move ${f.representative.title.title} up`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-30"
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBy(i, 1)}
                    disabled={i === franchises.length - 1 || setRankedOrder.isPending}
                    aria-label={`Move ${f.representative.title.title} down`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-30"
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFranchise(f)}
                    disabled={removeMany.isPending}
                    aria-label={`Remove ${f.representative.title.title}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-30"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
              {hasMultiple && isOpen ? (
                <ul className="border-t border-border bg-muted/30">
                  {f.seasons.map((season) => (
                    <li
                      key={season.titleId}
                      className="flex items-center gap-3 px-3 py-2 pl-14 text-sm"
                    >
                      {season.title.posterUrl ? (
                        <Image
                          src={season.title.posterUrl}
                          alt=""
                          width={28}
                          height={42}
                          className="aspect-[2/3] flex-none rounded border border-border bg-muted object-cover"
                        />
                      ) : (
                        <div className="aspect-[2/3] w-7 flex-none rounded border border-border bg-muted" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">{season.title.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {[
                            season.title.releaseYear?.toString(),
                            season.rating !== null ? `${season.rating}/10` : null,
                          ]
                            .filter((s): s is string => Boolean(s))
                            .join(' · ')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSeason(season)}
                        disabled={removeMany.isPending}
                        aria-label={`Remove ${season.title.title}`}
                        className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-30"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>
      {setRankedOrder.isPending || removeMany.isPending ? (
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
          Saving…
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------
// Compare view — pairwise (which do you prefer, A or B?). Updates Elo.
// ---------------------------------------------------------------------
function CompareView() {
  const pairQuery = trpc.watch.getPairwisePair.useQuery(undefined, { refetchOnMount: 'always' });
  const recordPairwise = trpc.watch.recordPairwise.useMutation({
    onSuccess: () => pairQuery.refetch(),
  });

  if (pairQuery.isLoading) {
    return <p className="text-sm text-text-body">Loading a pair…</p>;
  }

  const pair = pairQuery.data;
  if (!pair) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <p className="text-base text-text-body">
          Comparison needs at least two rated titles. Head to <strong>Add</strong> first and rate a
          few you&apos;ve watched — then come back here.
        </p>
      </div>
    );
  }

  const onPick = (winnerTitleId: string, loserTitleId: string) => {
    recordPairwise.mutate({ winnerTitleId, loserTitleId });
  };

  return (
    <div>
      <p className="mb-6 text-sm text-text-body">
        Which one do you prefer? Click the poster you&apos;d rather watch — we&apos;ll use that to
        adjust your ranking. Keep going for as long as you want.
      </p>
      <div className="grid grid-cols-2 gap-6">
        <ComparisonCard
          title={pair.a.title}
          onPick={() => onPick(pair.a.titleId, pair.b.titleId)}
          disabled={recordPairwise.isPending}
        />
        <ComparisonCard
          title={pair.b.title}
          onPick={() => onPick(pair.b.titleId, pair.a.titleId)}
          disabled={recordPairwise.isPending}
        />
      </div>
      <div className="mt-6 flex items-center justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => pairQuery.refetch()}
          disabled={recordPairwise.isPending || pairQuery.isFetching}
        >
          <Shuffle className="h-4 w-4" aria-hidden="true" />
          Skip this pair
        </Button>
      </div>
    </div>
  );
}

interface ComparisonCardProps {
  title: {
    id: string;
    title: string;
    mediaType: MediaType;
    releaseYear: number | null;
    posterUrl: string | null;
  };
  onPick: () => void;
  disabled: boolean;
}

function ComparisonCard({ title, onPick, disabled }: ComparisonCardProps) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className="group block w-full rounded-lg text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 disabled:opacity-50"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg border-2 border-border bg-muted transition group-hover:border-foreground group-hover:shadow-md">
        {title.posterUrl ? (
          <Image
            src={title.posterUrl}
            alt=""
            fill
            sizes="(min-width: 640px) 320px, 50vw"
            className="object-cover"
          />
        ) : null}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-black/60 py-3 text-sm font-medium text-white opacity-0 transition group-hover:opacity-100">
          <Star className="mr-1 h-4 w-4" aria-hidden="true" />
          Pick this one
        </div>
      </div>
      <h3 className="mt-3 text-base font-semibold text-foreground">{title.title}</h3>
      <p className="text-sm text-muted-foreground">
        {[MEDIA_TYPE_LABEL[title.mediaType], title.releaseYear?.toString()]
          .filter((s): s is string => Boolean(s))
          .join(' · ')}
      </p>
    </button>
  );
}

// ---------------------------------------------------------------------
// Add view — wraps the existing TastePicker (search + popular grid).
// ---------------------------------------------------------------------
function TastePickerWrapper({
  initialPopular,
  initialEntries,
}: {
  initialPopular: TitleSummary[];
  initialEntries: InitialEntry[];
}) {
  return (
    <div>
      <p className="mb-4 text-sm text-text-body">
        Click any title you&apos;ve watched and loved. That records a 10/10 rating; you can refine
        the rating later from the title page or by comparing here.
      </p>
      <TastePicker initialPopular={initialPopular} initialEntries={initialEntries} />
    </div>
  );
}
