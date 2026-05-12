import Image from 'next/image';
import Link from 'next/link';
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
  const greeting = firstName ? `Welcome back, ${firstName}` : 'Welcome back';

  if (recs.length === 0) {
    // Two narrow cases this covers: (1) cold-start user with no anchors,
    // (2) just-picked user inside the ~30s debounce before the rec
    // recompute writes back. Copy speaks to both. /onboarding is the
    // intended landing for (1); it auto-redirects to /taste for (2)
    // because that's the page that explains what to do next.
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">{greeting}</h1>
        <div className="mt-8 rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Let&apos;s get to know your taste
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-body">
            Pick a few titles you&apos;d recommend to a friend. We use them as anchors to build your
            personal recommendations. If you just picked, give us a moment.
          </p>
          <Link
            href="/onboarding"
            className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
          >
            Pick titles
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">{greeting}</h1>
        <p className="mt-2 text-sm text-text-body">
          Based on your taste — top {recs.length}{' '}
          {recs.length === 1 ? 'recommendation' : 'recommendations'}.
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

      {/* Visually-hidden landmark for screen readers — the rec grid is the
          page's main content but had no semantic boundary between the
          h1 greeting and the per-card h3 titles. sr-only keeps the
          visual hierarchy unchanged. */}
      <h2 className="sr-only">Recommendations</h2>

      <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
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
              </Link>
              <RecCardActions titleId={rec.id} />
            </li>
          );
        })}
      </ul>
    </main>
  );
}
