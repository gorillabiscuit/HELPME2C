'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { GripVertical, Shuffle, Star } from 'lucide-react';
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

interface TasteWorkspaceProps {
  initialPopular: TitleSummary[];
  initialAnchorIds: string[];
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
export function TasteWorkspace({ initialPopular, initialAnchorIds }: TasteWorkspaceProps) {
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

      <nav aria-label="Taste workspace tabs" className="mb-6 flex gap-1 border-b border-border">
        <TabButton active={tab === 'ranked'} onClick={() => setTab('ranked')} label="Ranked" />
        <TabButton active={tab === 'compare'} onClick={() => setTab('compare')} label="Compare" />
        <TabButton active={tab === 'add'} onClick={() => setTab('add')} label="Add" />
      </nav>

      {tab === 'ranked' ? <RankedView /> : null}
      {tab === 'compare' ? <CompareView /> : null}
      {tab === 'add' ? (
        <TastePickerWrapper initialPopular={initialPopular} initialAnchorIds={initialAnchorIds} />
      ) : null}
    </main>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
}

function TabButton({ active, onClick, label }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
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

  // Local ordering state — initialised from the server data, then mutated
  // by drag operations. Server is the source of truth; we send the new
  // ordered list on drop and refetch.
  const [draftOrder, setDraftOrder] = useState<TasteEntry[] | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const entries: TasteEntry[] = draftOrder ?? tasteQuery.data ?? [];

  if (tasteQuery.isLoading) {
    return <p className="text-sm text-text-body">Loading your taste…</p>;
  }
  if (entries.length === 0) {
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
    if (!draftOrder) setDraftOrder(entries.slice());
  };

  const onDragOver = (e: React.DragEvent, overIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === overIdx) return;
    setDraftOrder((current) => {
      const list = (current ?? entries).slice();
      const [moved] = list.splice(dragIdx, 1);
      if (moved) list.splice(overIdx, 0, moved);
      setDragIdx(overIdx);
      return list;
    });
  };

  const onDrop = () => {
    if (!draftOrder) return;
    setRankedOrder.mutate({ orderedTitleIds: draftOrder.map((e) => e.titleId) });
    setDragIdx(null);
  };

  return (
    <div>
      <p className="mb-4 text-sm text-text-body">
        Drag titles up or down to reorder. Top of the list = strongest taste signal. Changes save
        automatically.
      </p>
      <ol className="divide-y divide-border rounded-lg border border-border">
        {entries.map((entry, i) => (
          <li
            key={entry.titleId}
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
            <span className="w-8 flex-none text-sm font-medium text-muted-foreground">{i + 1}</span>
            {entry.title.posterUrl ? (
              <Image
                src={entry.title.posterUrl}
                alt=""
                width={36}
                height={54}
                className="aspect-[2/3] flex-none rounded border border-border bg-muted object-cover"
              />
            ) : (
              <div className="aspect-[2/3] w-9 flex-none rounded border border-border bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{entry.title.title}</p>
              <p className="text-xs text-muted-foreground">
                {[
                  MEDIA_TYPE_LABEL[entry.title.mediaType],
                  entry.title.releaseYear?.toString(),
                  entry.rating !== null ? `${entry.rating}/10` : null,
                ]
                  .filter((s): s is string => Boolean(s))
                  .join(' · ')}
              </p>
            </div>
          </li>
        ))}
      </ol>
      {setRankedOrder.isPending ? (
        <p className="mt-2 text-xs text-muted-foreground">Saving order…</p>
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
  initialAnchorIds,
}: {
  initialPopular: TitleSummary[];
  initialAnchorIds: string[];
}) {
  return (
    <div>
      <p className="mb-4 text-sm text-text-body">
        Click any title you&apos;ve watched and loved. That records a 10/10 rating; you can refine
        the rating later from the title page or by comparing here.
      </p>
      <TastePicker initialPopular={initialPopular} initialAnchorIds={initialAnchorIds} />
    </div>
  );
}
