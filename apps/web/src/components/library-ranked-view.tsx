'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronDown, ChevronRight, ChevronUp, GripVertical, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

type MediaType = 'tv' | 'film' | 'anime';

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
interface TasteFranchise {
  franchiseKey: string;
  representative: TasteEntry;
  manualRank: number | null;
  eloScore: number | null;
  meanRating: number;
  seasonCount: number;
  seasons: TasteEntry[];
}

const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  tv: 'TV',
  film: 'Film',
  anime: 'Anime',
};

// Ranked view (formerly /taste Ranked tab — folded into library per the
// 2026-05-14 surface-merge decision). Drag-to-reorder list of the user's
// rated franchises with per-franchise + per-season Remove buttons.
//
// One row per franchise. Multi-season franchises expand to a chronological
// (release-year ASC) season list. Single-season franchises render flat.
// Drag operates on franchise rows only; within-franchise ordering is
// hidden because it's not meaningful taste signal (per ADR-0023).
export function LibraryRankedView() {
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

  const [draftOrder, setDraftOrder] = useState<TasteFranchise[] | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  // Open accordion state keyed by franchiseKey so it survives refetch.
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());

  const franchises: TasteFranchise[] = draftOrder ?? tasteQuery.data ?? [];

  if (tasteQuery.isLoading) {
    return <p className="text-sm text-text-body">Loading your taste…</p>;
  }
  if (franchises.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <p className="text-base text-text-body">
          Nothing rated yet. Add a show and give it a rating — that&apos;ll seed your taste signal.
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
        Drag titles up or down to reorder — or use the arrow buttons for keyboard access. Top of the
        list = strongest taste signal. Changes save automatically.
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
