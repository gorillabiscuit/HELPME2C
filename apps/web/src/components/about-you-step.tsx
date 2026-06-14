'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface AboutYouStepProps {
  onComplete: () => void;
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

const CURRENT_YEAR = new Date().getFullYear();

const AFFINITY_OPTIONS: { value: string; label: string }[] = [
  { value: 'anime', label: 'Anime' },
  { value: 'k_drama', label: 'K-Drama' },
  { value: 'j_drama', label: 'J-Drama' },
  { value: 'c_drama', label: 'C-Drama' },
  { value: 'bollywood', label: 'Bollywood' },
  { value: 'nollywood', label: 'Nollywood' },
  { value: 'latin_american', label: 'Latin American' },
  { value: 'french_cinema', label: 'French Cinema' },
  { value: 'nordic_noir', label: 'Nordic Noir' },
  { value: 'british_drama', label: 'British Drama' },
  { value: 'turkish_drama', label: 'Turkish Drama' },
  { value: 'middle_eastern', label: 'Middle Eastern' },
  { value: 'southeast_asian', label: 'Southeast Asian' },
];

// ISO 3166-1 alpha-2 codes for the most common countries by user base.
const COUNTRIES: { code: string; label: string }[] = [
  { code: 'AU', label: 'Australia' },
  { code: 'AT', label: 'Austria' },
  { code: 'BE', label: 'Belgium' },
  { code: 'BR', label: 'Brazil' },
  { code: 'CA', label: 'Canada' },
  { code: 'CN', label: 'China' },
  { code: 'CZ', label: 'Czech Republic' },
  { code: 'DK', label: 'Denmark' },
  { code: 'FI', label: 'Finland' },
  { code: 'FR', label: 'France' },
  { code: 'DE', label: 'Germany' },
  { code: 'GR', label: 'Greece' },
  { code: 'HK', label: 'Hong Kong' },
  { code: 'HU', label: 'Hungary' },
  { code: 'IN', label: 'India' },
  { code: 'ID', label: 'Indonesia' },
  { code: 'IE', label: 'Ireland' },
  { code: 'IL', label: 'Israel' },
  { code: 'IT', label: 'Italy' },
  { code: 'JP', label: 'Japan' },
  { code: 'KR', label: 'South Korea' },
  { code: 'MX', label: 'Mexico' },
  { code: 'NL', label: 'Netherlands' },
  { code: 'NZ', label: 'New Zealand' },
  { code: 'NO', label: 'Norway' },
  { code: 'PH', label: 'Philippines' },
  { code: 'PL', label: 'Poland' },
  { code: 'PT', label: 'Portugal' },
  { code: 'RO', label: 'Romania' },
  { code: 'RU', label: 'Russia' },
  { code: 'SA', label: 'Saudi Arabia' },
  { code: 'SG', label: 'Singapore' },
  { code: 'ZA', label: 'South Africa' },
  { code: 'ES', label: 'Spain' },
  { code: 'SE', label: 'Sweden' },
  { code: 'CH', label: 'Switzerland' },
  { code: 'TW', label: 'Taiwan' },
  { code: 'TH', label: 'Thailand' },
  { code: 'TR', label: 'Turkey' },
  { code: 'UA', label: 'Ukraine' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'US', label: 'United States' },
  { code: 'VN', label: 'Vietnam' },
];

export function AboutYouStep({ onComplete }: AboutYouStepProps) {
  const [gender, setGender] = useState<string | null>(null);
  const [birthYear, setBirthYear] = useState('');
  const [country, setCountry] = useState('');
  const [contentAffinities, setContentAffinities] = useState<string[]>([]);
  const [filterProviders, setFilterProviders] = useState(false);
  const [saving, setSaving] = useState(false);

  const updateProfile = trpc.me.updateProfile.useMutation();

  const birthYearNum = parseInt(birthYear, 10);
  const birthYearValid = birthYear === '' || (birthYearNum >= 1900 && birthYearNum <= CURRENT_YEAR);

  async function handleContinue() {
    setSaving(true);
    await updateProfile.mutateAsync({
      ...(gender
        ? { gender: gender as 'male' | 'female' | 'non-binary' | 'prefer_not_to_say' }
        : {}),
      ...(birthYear && birthYearValid ? { birthYear: birthYearNum } : {}),
      ...(country ? { country } : {}),
      ...(contentAffinities.length > 0 ? { contentAffinities: contentAffinities as never } : {}),
      filterProviders,
    });
    setSaving(false);
    onComplete();
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">A little about you</h2>
        <p className="text-sm text-muted-foreground">
          Helps us personalise recommendations. Everything here is optional.
        </p>
      </div>

      {/* Gender */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Gender</p>
        <div className="grid grid-cols-2 gap-2">
          {GENDER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setGender(gender === opt.value ? null : opt.value)}
              className={[
                'rounded-lg border px-4 py-2.5 text-sm transition-colors',
                gender === opt.value
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background hover:bg-muted',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Birth year */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Birth year</p>
        <input
          type="number"
          inputMode="numeric"
          placeholder="e.g. 1990"
          min={1900}
          max={CURRENT_YEAR}
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value)}
          className={[
            'w-full rounded-lg border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary',
            !birthYearValid ? 'border-destructive focus:ring-destructive' : 'border-border',
          ].join(' ')}
        />
        {!birthYearValid && (
          <p className="text-xs text-destructive">Enter a year between 1900 and {CURRENT_YEAR}</p>
        )}
      </div>

      {/* Country */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Country</p>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select your country</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Regional content affinities */}
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Any regional film or TV traditions you feel at home with?</p>
          <p className="text-xs text-muted-foreground">Select as many as apply — helps if your tastes go beyond your current country.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {AFFINITY_OPTIONS.map((opt) => {
            const selected = contentAffinities.includes(opt.value);
            return (
              <button
                key={opt.value}
                onClick={() =>
                  setContentAffinities((prev) =>
                    selected ? prev.filter((v) => v !== opt.value) : [...prev, opt.value],
                  )
                }
                className={[
                  'rounded-full border px-3 py-1.5 text-sm transition-colors',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:bg-muted',
                ].join(' ')}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Streaming filter toggle */}
      <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Only show what I can watch right now</p>
            <p className="text-sm text-muted-foreground">
              When on, we filter recommendations to titles available on your connected streaming
              services.
            </p>
          </div>
          <button
            role="switch"
            aria-checked={filterProviders}
            onClick={() => setFilterProviders((v) => !v)}
            className={[
              'mt-0.5 h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors',
              filterProviders ? 'bg-primary' : 'bg-input',
            ].join(' ')}
          >
            <span
              className={[
                'block h-5 w-5 rounded-full bg-background shadow-sm transition-transform',
                filterProviders ? 'translate-x-5' : 'translate-x-0.5',
              ].join(' ')}
            />
          </button>
        </div>

        {filterProviders ? (
          <p className="text-xs text-muted-foreground border-t border-border pt-3">
            You'll only see titles you can stream today. You can change this in Settings at any
            time.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground border-t border-border pt-3">
            You'll discover titles from any service — including ones you don't subscribe to yet. If
            something catches your eye, we'll show you where to watch it.
          </p>
        )}
      </div>

      <button
        onClick={handleContinue}
        disabled={saving || !birthYearValid}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Continue'}
      </button>

      <button
        onClick={onComplete}
        className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Skip for now
      </button>
    </div>
  );
}
