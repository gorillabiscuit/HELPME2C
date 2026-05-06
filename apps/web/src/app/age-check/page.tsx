'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Region = 'eu' | 'row';

export default function AgeCheckPage() {
  const router = useRouter();
  const [birthDate, setBirthDate] = useState('');
  const [region, setRegion] = useState<Region>('eu');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/age-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birthDate, region }),
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
      <h1 className="text-2xl font-semibold tracking-tight">Quick verification</h1>
      <p className="mt-2 text-sm text-slate-600">
        Per GDPR / COPPA we need to confirm your age. This is self-declared and stored against your
        account — we keep the fact of verification, not your birth date.
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

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Where are you located?</legend>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="region"
              value="eu"
              checked={region === 'eu'}
              onChange={() => setRegion('eu')}
              className="mt-1"
            />
            <span>European Union, UK, or EEA</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              name="region"
              value="row"
              checked={region === 'row'}
              onChange={() => setRegion('row')}
              className="mt-1"
            />
            <span>Rest of world</span>
          </label>
        </fieldset>

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
