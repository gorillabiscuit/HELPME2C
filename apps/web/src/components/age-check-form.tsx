'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { COUNTRIES, isEuCountry } from '@/lib/countries';

interface AgeCheckFormProps {
  // ISO-3166-1 alpha-2 from Vercel's x-vercel-ip-country header, uppercased,
  // or null when no header is set (local dev, scrapers, some corp proxies).
  // Pre-selects the country dropdown when present.
  initialCountry: string | null;
}

// Default country fallback when no IP signal is available. 'US' is the
// largest-by-internet-users entry in COUNTRIES, so it minimises the
// number of users who land on a wrong default and have to change it.
// EU users with no IP signal will see 'US' and pick their country — the
// derived region for that pick gates the stricter 16+ threshold.
const DEFAULT_COUNTRY = 'US';

export function AgeCheckForm({ initialCountry }: AgeCheckFormProps) {
  const router = useRouter();
  // Use IP-default if it's a country we know about; otherwise fall back
  // to DEFAULT_COUNTRY. (IP can return codes outside our curated 60,
  // e.g. very small island nations — better to show a familiar default
  // than a code the user doesn't recognise.)
  const initialKnown =
    initialCountry && COUNTRIES.some((c) => c.code === initialCountry)
      ? initialCountry
      : DEFAULT_COUNTRY;

  const [birthDate, setBirthDate] = useState('');
  const [country, setCountry] = useState(initialKnown);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Browser back-forward cache (bfcache) will otherwise restore this
  // page's in-memory snapshot when the user navigates back from
  // /onboarding — skipping the server-side ageVerified check in
  // app/age-check/page.tsx entirely. router.refresh() forces a fresh
  // RSC fetch which re-runs the redirect.
  useEffect(() => {
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        router.refresh();
      }
    }
    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // Server derives region (eu/row) from country, but we send both so
      // older bundles (cached page) that only know region still work
      // during the rollout. region here is informational; server can
      // recompute from country if it disagrees.
      const region = isEuCountry(country) ? 'eu' : 'row';
      const res = await fetch('/api/age-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthDate, region, country }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Verification failed.');
        setSubmitting(false);
        return;
      }
      router.push('/onboarding');
    } catch {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Quick verification</h1>
      <p className="mt-3 text-base text-text-body">
        Per privacy regulations we need to confirm your age and where you&apos;re watching from. We
        keep the fact of verification and your country (so we can show you what&apos;s streamable
        where you are); we don&apos;t keep your birth date.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="birth-date">Date of birth</Label>
          <Input
            id="birth-date"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            required
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <select
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            required
            className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            {isEuCountry(country)
              ? 'You must be 16 or older (EU/EEA/UK/CH).'
              : 'You must be 13 or older.'}
          </p>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting || !birthDate} className="w-full">
          {submitting ? 'Verifying…' : 'Continue'}
        </Button>
      </form>
    </main>
  );
}
