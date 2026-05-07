import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { appRouter } from '@/server/router';
import { createContext } from '@/server/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PageProps {
  searchParams: Promise<{ q?: string | string[] }>;
}

const MEDIA_TYPE_LABEL: Record<string, string> = {
  tv: 'TV',
  film: 'Film',
  anime: 'Anime',
};

export default async function SearchPage({ searchParams }: PageProps) {
  // Phase 1A: registered users only. Same redirect-to-home pattern as
  // the title detail and library pages.
  const { userId } = await auth();
  if (!userId) {
    redirect('/');
  }

  const sp = await searchParams;
  const rawQ = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (rawQ ?? '').trim();

  // Branch on query state so the server component renders the right
  // empty/loading/results UI without needing client-side state.
  let resultsBlock: ReactNode;
  if (!q) {
    resultsBlock = (
      <p className="mt-8 text-sm text-slate-600">
        Type a title above to search the catalog of{' '}
        {/* Hardcoding the count would drift; the runtime row count is in the
            DB. Keep this generic until the search surface needs to advertise. */}
        TV shows, films, and anime.
      </p>
    );
  } else if (q.length < 2) {
    resultsBlock = (
      <p className="mt-8 text-sm text-slate-600">Type at least 2 characters to search.</p>
    );
  } else {
    // Reuses the dogfooded titles.search tRPC procedure so the server
    // page and any future client autocomplete share the same shape +
    // wildcard escaping + popularity ordering.
    const caller = appRouter.createCaller(await createContext());
    const results = await caller.titles.search({ q });

    if (results.length === 0) {
      resultsBlock = (
        <p className="mt-8 text-sm text-slate-600">No titles match &ldquo;{q}&rdquo;.</p>
      );
    } else {
      resultsBlock = (
        <ul className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((title) => {
            const mediaTypeLabel = MEDIA_TYPE_LABEL[title.mediaType] ?? title.mediaType;
            return (
              <li key={title.id}>
                <Link href={`/titles/${title.id}`} className="group block">
                  {title.posterUrl ? (
                    <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 transition group-hover:border-slate-400">
                      <Image
                        src={title.posterUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 200px, (min-width: 640px) 33vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[2/3] rounded-lg border border-slate-200 bg-slate-100" />
                  )}
                  <h3 className="mt-2 truncate text-sm font-medium text-slate-900 group-hover:underline">
                    {title.title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {[mediaTypeLabel, title.releaseYear?.toString()]
                      .filter((s): s is string => Boolean(s))
                      .join(' · ')}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      );
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Search</h1>

      {/* Plain HTML form, method=GET. Submits the query as ?q=<input>, which
          renders this same page server-side with the new param. No JS
          dependency for the basic flow. Client-side debounced autocomplete
          would be a separate component overlaid on this. */}
      <form action="/search" method="get" className="mt-6 flex gap-2">
        <Input
          name="q"
          type="search"
          defaultValue={rawQ ?? ''}
          placeholder="Game of Thrones, Squid Game…"
          autoFocus
          className="max-w-md"
        />
        <Button type="submit">Search</Button>
      </form>

      {resultsBlock}
    </main>
  );
}
