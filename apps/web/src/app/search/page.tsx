import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { appRouter } from '@/server/router';
import { createContext } from '@/server/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PageProps {
  searchParams: Promise<{ q?: string | string[]; type?: string | string[] }>;
}

type MediaType = 'tv' | 'film' | 'anime';

const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  tv: 'TV',
  film: 'Film',
  anime: 'Anime',
};

const MEDIA_TYPE_VALUES: readonly MediaType[] = ['tv', 'film', 'anime'] as const;

function isMediaType(value: string | undefined): value is MediaType {
  return value !== undefined && (MEDIA_TYPE_VALUES as readonly string[]).includes(value);
}

// Build the /search URL with q + (optional) type. Used by the filter
// pills so clicking one preserves the current query.
function searchHref(q: string, type: MediaType | undefined): string {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  const qs = params.toString();
  return qs ? `/search?${qs}` : '/search';
}

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
  const rawType = Array.isArray(sp.type) ? sp.type[0] : sp.type;
  // Silently drop invalid `type` values (e.g. /search?type=cartoon) rather
  // than 400-ing — the filter is a UX nicety, not a contract.
  const mediaType = isMediaType(rawType) ? rawType : undefined;

  // Branch on query state so the server component renders the right
  // empty/loading/results UI without needing client-side state.
  let resultsBlock: ReactNode;
  if (!q) {
    resultsBlock = (
      <p className="mt-8 text-sm text-text-body">
        Type a title above to search the catalog of{' '}
        {/* Hardcoding the count would drift; the runtime row count is in the
            DB. Keep this generic until the search surface needs to advertise. */}
        TV shows, films, and anime.
      </p>
    );
  } else if (q.length < 2) {
    resultsBlock = (
      <p className="mt-8 text-sm text-text-body">Type at least 2 characters to search.</p>
    );
  } else {
    // Reuses the dogfooded titles.search tRPC procedure so the server
    // page and any future client autocomplete share the same shape +
    // wildcard escaping + popularity ordering.
    const caller = appRouter.createCaller(await createContext());
    const results = await caller.titles.search({ q, mediaType });

    if (results.length === 0) {
      resultsBlock = (
        <p className="mt-8 text-sm text-text-body">
          No {mediaType ? `${MEDIA_TYPE_LABEL[mediaType].toLowerCase()} ` : ''}titles match &ldquo;
          {q}&rdquo;
          {mediaType ? ' — try a different filter' : ''}.
        </p>
      );
    } else {
      resultsBlock = (
        <ul className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((title) => {
            const mediaTypeLabel = MEDIA_TYPE_LABEL[title.mediaType];
            return (
              <li key={title.id}>
                <Link href={`/titles/${title.id}`} className="group block">
                  {title.posterUrl ? (
                    <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-muted transition group-hover:border-input">
                      <Image
                        src={title.posterUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 200px, (min-width: 640px) 33vw, 50vw"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-[2/3] rounded-lg border border-border bg-muted" />
                  )}
                  <h3 className="mt-2 truncate text-sm font-medium text-foreground group-hover:underline">
                    {title.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
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

  // Filter-pill button helper — server-rendered link, active state set by
  // comparing to the resolved `mediaType`.
  const filterPillClass = (active: boolean) =>
    cn(
      'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium transition',
      active ? 'bg-primary text-white' : 'bg-muted text-foreground hover:bg-muted',
    );

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Search</h1>

      {/* Plain HTML form, method=GET. Submits the query as ?q=<input> +
          ?type=<hidden>, which renders this same page server-side with
          the new params. The hidden input preserves the active filter
          across query submissions; clicking a filter pill is its own
          link-based navigation that preserves the current q. */}
      <form action="/search" method="get" className="mt-6 flex gap-2">
        <Input
          name="q"
          type="search"
          defaultValue={rawQ ?? ''}
          placeholder="Game of Thrones, Squid Game…"
          autoFocus
          className="max-w-md"
        />
        {mediaType ? <input type="hidden" name="type" value={mediaType} /> : null}
        <Button type="submit">Search</Button>
      </form>

      <nav aria-label="Filter by media type" className="mt-4 flex flex-wrap gap-2">
        <Link href={searchHref(q, undefined)} className={filterPillClass(!mediaType)}>
          All
        </Link>
        {MEDIA_TYPE_VALUES.map((type) => (
          <Link
            key={type}
            href={searchHref(q, type)}
            className={filterPillClass(mediaType === type)}
          >
            {MEDIA_TYPE_LABEL[type]}
          </Link>
        ))}
      </nav>

      {resultsBlock}
    </main>
  );
}
