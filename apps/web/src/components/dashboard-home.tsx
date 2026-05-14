import Image from 'next/image';
import Link from 'next/link';
import { Star, Users } from 'lucide-react';
import { FirstVisitCallout } from '@/components/first-visit-callout';
import { PreviewOverlay } from '@/components/preview-overlay';
import { RecCardActions } from '@/components/rec-card-actions';

type MediaType = 'tv' | 'film' | 'anime';

const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  tv: 'TV',
  film: 'Film',
  anime: 'Anime',
};

interface RecItem {
  id: string;
  title: string;
  mediaType: MediaType;
  releaseYear: number | null;
  posterUrl: string | null;
  trailerProvider: string | null;
  trailerVideoId: string | null;
  reasonHint: string | null;
}

interface FilterProvider {
  providerId: string;
  providerName: string;
  providerLogoUrl: string | null;
}

interface FilterContext {
  active: boolean;
  providers: ReadonlyArray<FilterProvider>;
  hiddenCount: number;
}

interface DashboardHomeProps {
  firstName: string | null | undefined;
  recs: ReadonlyArray<RecItem>;
  filter: FilterContext;
}

export function DashboardHome({ firstName, recs, filter }: DashboardHomeProps) {
  const greetingSuffix = firstName ? `, ${firstName}` : '';

  if (recs.length === 0) {
    // Two narrow cases this covers: (1) cold-start user with no
    // favourites, (2) just-picked user inside the ~30s debounce before
    // the rec recompute writes back. /onboarding is the intended
    // landing for (1); it auto-redirects to /taste for (2) because
    // that's the page that explains what to do next.
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-base text-muted-foreground">Welcome{greetingSuffix}.</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">Your recommendations</h1>
        <div className="mt-10 rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Let&apos;s get to know your taste
          </h2>
          <p className="mx-auto mt-3 max-w-md text-base text-text-body">
            Pick a few titles you&apos;d recommend to a friend. We&apos;ll use them as the starting
            point for your personal recommendations. If you just picked, give us a moment.
          </p>
          <Link
            href="/library?view=discover"
            className="mt-6 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
          >
            Browse popular shows
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10">
        <p className="text-base text-muted-foreground">Welcome back{greetingSuffix}.</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">Your recommendations</h1>
        <p className="mt-3 max-w-2xl text-base text-text-body">
          {recs.length} {recs.length === 1 ? 'title' : 'titles'} picked for you based on what
          you&apos;ve rated and watched. Every action — <em>Watched it</em>, <em>Want to watch</em>,{' '}
          <em>Not interested</em> — refines what we suggest.
        </p>

        {filter.active ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs text-text-body">
            <span className="font-medium text-foreground">Filtering by:</span>
            {filter.providers.map((p) => (
              <span
                key={p.providerId}
                className="inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 ring-1 ring-border"
              >
                {p.providerLogoUrl ? (
                  <Image
                    src={p.providerLogoUrl}
                    alt=""
                    width={14}
                    height={14}
                    className="rounded-sm bg-white"
                  />
                ) : null}
                <span className="text-foreground">{p.providerName}</span>
              </span>
            ))}
            {filter.hiddenCount > 0 ? (
              <span className="text-muted-foreground">
                · {filter.hiddenCount} {filter.hiddenCount === 1 ? 'rec' : 'recs'} hidden
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      <FirstVisitCallout />

      {/* Promote the moat (Groups) + the taste-shaping surface side-by-side
          on the dashboard. These were buried in a nav cluster before — now
          they're prominent calls to action where new users will actually
          notice them. Two cards instead of nav links: people scan cards. */}
      <section
        aria-label="Get more out of HelpME2C"
        className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <Link
          href="/groups"
          className="group flex items-start gap-4 rounded-lg border border-border bg-white p-5 transition hover:border-input hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-primary/10 text-primary">
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold text-foreground">
              Watching with someone?
            </span>
            <span className="mt-1 block text-sm text-text-body">
              Build a group to get recommendations everyone in the room will enjoy.
            </span>
          </span>
        </Link>
        <Link
          href="/library?view=discover"
          className="group flex items-start gap-4 rounded-lg border border-border bg-white p-5 transition hover:border-input hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
        >
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-md bg-primary/10 text-primary">
            <Star className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-base font-semibold text-foreground">Want better recs?</span>
            <span className="mt-1 block text-sm text-text-body">
              Rate more shows — browse popular titles and tell us which ones you&apos;ve loved or
              hated.
            </span>
          </span>
        </Link>
      </section>

      <ul
        aria-label="Recommendations"
        className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4"
      >
        {recs.map((rec, i) => {
          const mediaTypeLabel = MEDIA_TYPE_LABEL[rec.mediaType];
          return (
            <li key={rec.id}>
              {/* Poster + meta link to title page; the per-rec action row
                  below sits OUTSIDE the link so its buttons don't navigate. */}
              <Link
                href={`/titles/${rec.id}`}
                className="group block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
              >
                {rec.posterUrl ? (
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-border bg-muted transition group-hover:border-input">
                    <Image
                      src={rec.posterUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 220px, (min-width: 640px) 33vw, 50vw"
                      className="object-cover"
                      // First row (4 cards on lg, 3 on sm, 2 on mobile) is
                      // above the fold on most viewports — preload for LCP.
                      priority={i < 4}
                    />
                    <PreviewOverlay
                      trailerProvider={rec.trailerProvider}
                      trailerVideoId={rec.trailerVideoId}
                      titleText={rec.title}
                    />
                  </div>
                ) : (
                  <div className="aspect-[2/3] rounded-lg border border-border bg-muted" />
                )}
                <h3 className="mt-2 truncate text-sm font-medium text-foreground group-hover:underline">
                  {rec.title}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {[mediaTypeLabel, rec.releaseYear?.toString()]
                    .filter((s): s is string => Boolean(s))
                    .join(' · ')}
                </p>
                {rec.reasonHint ? (
                  <p className="mt-1 line-clamp-2 text-xs italic text-text-body">
                    {rec.reasonHint}
                  </p>
                ) : null}
              </Link>
              <RecCardActions titleId={rec.id} />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
