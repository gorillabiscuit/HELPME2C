import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { appRouter } from '@/server/router';
import { createContext } from '@/server/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProvidersForm } from '@/components/providers-form';

// Settings page where the user picks the streaming services they
// subscribe to. Drives the post-ranking filter on personal recs per
// ADR-0021 ("filter, never a ranking signal"). Country defaults from
// Vercel's geo header for the catalogue lookup; until the broader
// per-user country preference lands (M5.3 follow-on), the saved
// provider set is country-agnostic — saved provider_ids match the same
// TMDB id across regions.

export default async function ProvidersSettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const requestHeaders = await headers();
  const country = (requestHeaders.get('x-vercel-ip-country') ?? 'US').toUpperCase();

  const caller = appRouter.createCaller(await createContext());
  const [{ providers }, { providerIds }] = await Promise.all([
    caller.streaming.listProviders({ country }),
    caller.streaming.listMyProviders(),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← Home
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight">Streaming services</h1>
      <p className="mt-2 text-sm text-slate-600">
        Pick the services you subscribe to. We&apos;ll filter your recommendations to titles that
        are actually available on at least one of them. Showing providers for{' '}
        <span className="font-medium text-slate-900">{country}</span>.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Your services</CardTitle>
        </CardHeader>
        <CardContent>
          {providers.length === 0 ? (
            <p className="text-sm text-slate-600">
              No streaming providers in our catalogue for {country} yet — try again after the next
              nightly sync.
            </p>
          ) : (
            <ProvidersForm providers={providers} initialSelected={providerIds} />
          )}
        </CardContent>
      </Card>
    </main>
  );
}
