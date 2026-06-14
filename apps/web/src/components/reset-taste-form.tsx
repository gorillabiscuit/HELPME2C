'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

// Taste-reset form for /settings/account.
//
// Deletes all watch entries, the user preference vector, rec feedback,
// computed recommendations, and pairwise comparisons — a full taste
// clean-slate. Account settings (privacy, audio prefs, country) and
// group memberships are untouched.
//
// "Redo onboarding" is on by default because the whole point of
// resetting taste data is usually to rebuild the profile; without
// re-onboarding the dashboard would show zero recs until the user
// manually adds shows.
export function ResetTasteForm() {
  const router = useRouter();
  const redoId = useId();
  const confirmId = useId();

  const [redoOnboarding, setRedoOnboarding] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetMutation = trpc.me.resetTasteData.useMutation({
    onSuccess: () => {
      if (redoOnboarding) {
        // Replace so back-button doesn't land on settings mid-reset.
        router.replace('/onboarding?start=pick');
      } else {
        router.refresh();
      }
    },
    onError: (e) => {
      setError(e.message ?? 'Something went wrong — please try again.');
    },
  });

  const onReset = () => {
    setError(null);
    resetMutation.mutate();
  };

  return (
    <div className="space-y-4">
      {/* Redo onboarding toggle */}
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={redoId} className="cursor-pointer space-y-0.5">
          <span>Re-do onboarding after reset</span>
          <span className="block text-xs font-normal text-muted-foreground">
            Takes you through the taste picker again so your recommendations are rebuilt straight
            away. Recommended.
          </span>
        </Label>
        <Switch id={redoId} checked={redoOnboarding} onCheckedChange={setRedoOnboarding} />
      </div>

      {/* Confirmation checkbox */}
      <label
        htmlFor={confirmId}
        className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-muted/40 px-3 py-2.5 text-sm"
      >
        <input
          id={confirmId}
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-destructive"
        />
        <span>
          I understand this will permanently delete my watch history and preference data.{' '}
          <span className="text-muted-foreground">
            Account settings and group memberships are not affected.
          </span>
        </span>
      </label>

      <Button
        type="button"
        variant="destructive"
        onClick={onReset}
        disabled={!confirmed || resetMutation.isPending}
      >
        {resetMutation.isPending ? 'Resetting…' : 'Reset my taste data'}
      </Button>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
