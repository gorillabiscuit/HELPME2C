'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';

type SettableDefault = 'public' | 'private';

interface DefaultPrivacyFormProps {
  initialDefault: SettableDefault;
}

// Default-visibility picker for new watch entries. Existing entries are not
// updated when this changes — per-entry privacy stays the source of truth.
// Public is currently inert (no public-profile surface exists yet) and the
// helper text says so; we still record the choice so the wire is in place
// when public profiles land.
export function DefaultPrivacyForm({ initialDefault }: DefaultPrivacyFormProps) {
  const router = useRouter();
  const [value, setValue] = useState<SettableDefault>(initialDefault);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const save = trpc.me.setDefaultPrivacy.useMutation({
    onSuccess: () => {
      setSavedAt(new Date());
      router.refresh();
    },
  });

  const choose = (next: SettableDefault) => {
    if (next === value) return;
    setValue(next);
    setSavedAt(null);
    save.mutate({ defaultPrivacy: next });
  };

  return (
    <fieldset className="space-y-2">
      <legend className="sr-only">Default visibility for new entries</legend>
      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-muted">
        <input
          type="radio"
          name="default-privacy"
          value="private"
          checked={value === 'private'}
          onChange={() => choose('private')}
          className="mt-0.5"
        />
        <span className="text-sm">
          <span className="block font-medium text-foreground">Private (default)</span>
          <span className="block text-muted-foreground">
            Only you can see your watch list and ratings.
          </span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 hover:bg-muted">
        <input
          type="radio"
          name="default-privacy"
          value="public"
          checked={value === 'public'}
          onChange={() => choose('public')}
          className="mt-0.5"
        />
        <span className="text-sm">
          <span className="block font-medium text-foreground">Public</span>
          <span className="block text-muted-foreground">
            New entries will be visible to anyone with a profile link. Public profile pages
            aren&apos;t live yet — your list stays private in practice until they ship.
          </span>
        </span>
      </label>
      <div className="flex h-5 items-center text-xs">
        {save.isPending ? <span className="text-muted-foreground">Saving…</span> : null}
        {save.isError ? <span className="text-red-700">{save.error.message}</span> : null}
        {savedAt && !save.isPending && !save.isError ? (
          <span className="text-emerald-700">Saved.</span>
        ) : null}
      </div>
    </fieldset>
  );
}
