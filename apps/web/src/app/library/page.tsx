import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { appRouter } from '@/server/router';
import { createContext } from '@/server/trpc';
import { LibraryEditDialog } from '@/components/library-edit-dialog';
import { LibraryRemoveButton } from '@/components/library-remove-button';

const STATUS_LABEL: Record<string, string> = {
  watching: 'Watching',
  completed: 'Completed',
  on_hold: 'On hold',
  dropped: 'Dropped',
  plan_to_watch: 'Plan to watch',
};

const KIND_LABEL: Record<string, string> = {
  anchor: 'Anchor',
  tracking: 'Tracking',
};

const MEDIA_TYPE_LABEL: Record<string, string> = {
  tv: 'TV',
  film: 'Film',
  anime: 'Anime',
};

export default async function LibraryPage() {
  // Phase 1A: registered users only per PROJECT.md scope.
  const { userId } = await auth();
  if (!userId) {
    redirect('/');
  }

  const caller = appRouter.createCaller(await createContext());
  const entries = await caller.watch.list();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="text-3xl font-semibold tracking-tight">Library</h1>
        <span className="text-sm text-muted-foreground">
          {entries.length === 0
            ? 'No entries yet'
            : `${entries.length} ${entries.length === 1 ? 'title' : 'titles'}`}
        </span>
      </header>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <p className="text-sm text-text-body">
            Your library is empty. Add titles by searching for them or picking from your taste
            refinement surface.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/search"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
            >
              Search
            </Link>
            <Link
              href="/taste"
              className="inline-flex items-center rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
            >
              Refine your taste
            </Link>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {entries.map(({ entry, title }) => {
            const kindLabel = KIND_LABEL[entry.kind];
            const statusLabel = entry.status ? STATUS_LABEL[entry.status] : null;
            const mediaTypeLabel = MEDIA_TYPE_LABEL[title.mediaType] ?? title.mediaType;
            return (
              <li key={entry.id} className="flex items-center gap-4 px-4 py-3">
                {title.posterUrl ? (
                  <Link
                    href={`/titles/${title.id}`}
                    className="relative aspect-[2/3] w-[60px] flex-none overflow-hidden rounded border border-border bg-muted"
                  >
                    <Image
                      src={title.posterUrl}
                      alt=""
                      fill
                      sizes="60px"
                      className="object-cover"
                    />
                  </Link>
                ) : (
                  <div className="aspect-[2/3] w-[60px] flex-none rounded border border-border bg-muted" />
                )}

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/titles/${title.id}`}
                    className="block truncate text-sm font-medium text-foreground hover:underline"
                  >
                    {title.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[mediaTypeLabel, title.releaseYear?.toString(), statusLabel ?? kindLabel]
                      .filter((s): s is string => Boolean(s))
                      .join(' · ')}
                  </p>
                </div>

                <div className="flex flex-none items-center gap-2 text-xs">
                  {entry.rating !== null ? (
                    <span className="font-medium text-foreground">{entry.rating}/10</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {/* Edit only on tracking entries — editing an anchor would
                      implicitly graduate it (kind=anchor + status=set is not
                      a meaningful state) and that promotion should be
                      explicit, not a side-effect of clicking Edit. */}
                  {entry.kind === 'tracking' ? (
                    <LibraryEditDialog
                      titleId={title.id}
                      titleText={title.title}
                      hasEpisodes={title.mediaType !== 'film'}
                      initialEntry={{
                        status: entry.status,
                        currentEpisode: entry.currentEpisode,
                        rating: entry.rating,
                        notes: entry.notes,
                        privacy: entry.privacy,
                      }}
                    />
                  ) : null}
                  <LibraryRemoveButton titleId={title.id} titleText={title.title} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
