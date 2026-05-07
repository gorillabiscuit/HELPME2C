import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { appRouter } from '@/server/router';
import { createContext } from '@/server/trpc';
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
        <span className="text-sm text-slate-500">
          {entries.length === 0
            ? 'No entries yet'
            : `${entries.length} ${entries.length === 1 ? 'title' : 'titles'}`}
        </span>
      </header>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 px-6 py-12 text-center">
          <p className="text-sm text-slate-600">
            You haven&apos;t added any titles yet. A search-to-add surface is coming in M3 Path A;
            for now, navigate to a title via{' '}
            <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">/titles/&lt;uuid&gt;</code>{' '}
            and use the &ldquo;Add to list&rdquo; button.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
          {entries.map(({ entry, title }) => {
            const kindLabel = KIND_LABEL[entry.kind];
            const statusLabel = entry.status ? STATUS_LABEL[entry.status] : null;
            const mediaTypeLabel = MEDIA_TYPE_LABEL[title.mediaType] ?? title.mediaType;
            return (
              <li key={entry.id} className="flex items-center gap-4 px-4 py-3">
                {title.posterUrl ? (
                  <Link
                    href={`/titles/${title.id}`}
                    className="relative aspect-[2/3] w-[60px] flex-none overflow-hidden rounded border border-slate-200 bg-slate-100"
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
                  <div className="aspect-[2/3] w-[60px] flex-none rounded border border-slate-200 bg-slate-100" />
                )}

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/titles/${title.id}`}
                    className="block truncate text-sm font-medium text-slate-900 hover:underline"
                  >
                    {title.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {[mediaTypeLabel, title.releaseYear?.toString(), statusLabel ?? kindLabel]
                      .filter((s): s is string => Boolean(s))
                      .join(' · ')}
                  </p>
                </div>

                <div className="flex flex-none items-center gap-3 text-xs">
                  {entry.rating !== null ? (
                    <span className="font-medium text-slate-700">{entry.rating}/10</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
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
