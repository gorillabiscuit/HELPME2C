import Image from 'next/image';
import Link from 'next/link';

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

interface DashboardHomeProps {
  firstName: string | null | undefined;
  recs: ReadonlyArray<RecItem>;
  recsFiltered: boolean;
}

export function DashboardHome({ firstName, recs, recsFiltered }: DashboardHomeProps) {
  const greeting = firstName ? `Welcome back, ${firstName}` : 'Welcome back';

  if (recs.length === 0) {
    // Either the user hasn't picked anchors yet, or the cron hasn't computed
    // recs for them yet. Single message covers both cases — the link to
    // /onboarding is the right action either way (a user who already
    // anchored will see "Update your picks").
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">{greeting}</h1>
        <div className="mt-8 rounded-lg border border-dashed border-slate-300 px-6 py-12 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            No recommendations yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Pick a few titles that represent your taste — anything you&apos;d recommend to a friend.
            We&apos;ll use them to start your personal recommendations.
          </p>
          <Link
            href="/onboarding"
            className="mt-4 inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Get started
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{greeting}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Based on your taste — top {recs.length}{' '}
            {recs.length === 1 ? 'recommendation' : 'recommendations'}
            {recsFiltered ? ', filtered to your services' : ''}.
          </p>
        </div>
        <Link href="/settings/providers" className="text-sm text-slate-500 hover:text-slate-900">
          Manage services →
        </Link>
      </header>

      <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {recs.map((rec) => {
          const mediaTypeLabel = MEDIA_TYPE_LABEL[rec.mediaType];
          return (
            <li key={rec.id}>
              <Link href={`/titles/${rec.id}`} className="group block">
                {rec.posterUrl ? (
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 transition group-hover:border-slate-400">
                    <Image
                      src={rec.posterUrl}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 220px, (min-width: 640px) 33vw, 50vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-[2/3] rounded-lg border border-slate-200 bg-slate-100" />
                )}
                <h3 className="mt-2 truncate text-sm font-medium text-slate-900 group-hover:underline">
                  {rec.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {[mediaTypeLabel, rec.releaseYear?.toString()]
                    .filter((s): s is string => Boolean(s))
                    .join(' · ')}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
