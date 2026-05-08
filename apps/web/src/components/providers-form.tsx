'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';

interface Provider {
  providerId: string;
  providerName: string;
  providerLogoUrl: string | null;
  titleCount: number;
}

interface ProvidersFormProps {
  providers: Provider[];
  initialSelected: string[];
}

// Toggle-pill picker for streaming services. Click a pill to toggle, then
// hit Save — the mutation replaces the user's full selection in one shot
// (matches the streaming.saveProviders contract). We avoid auto-save on
// every click to make "I'm browsing the catalogue" not write garbage.
export function ProvidersForm({ providers, initialSelected }: ProvidersFormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));
  const [, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const save = trpc.streaming.saveProviders.useMutation({
    onSuccess: () => {
      setSavedAt(new Date());
      // Refresh server components — recs on the dashboard should re-filter.
      startTransition(() => router.refresh());
    },
  });

  const toggle = (providerId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
    setSavedAt(null);
  };

  const onSave = () => {
    save.mutate({ providerIds: Array.from(selected) });
  };

  const dirty =
    selected.size !== initialSelected.length ||
    Array.from(selected).some((id) => !initialSelected.includes(id));

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {providers.map((p) => {
          const isSelected = selected.has(p.providerId);
          return (
            <button
              key={p.providerId}
              type="button"
              onClick={() => toggle(p.providerId)}
              aria-pressed={isSelected}
              className={
                'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ' +
                (isSelected
                  ? 'border-slate-900 bg-slate-900 text-white hover:bg-slate-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50')
              }
              title={`${p.providerName} (${p.titleCount} titles)`}
            >
              {p.providerLogoUrl ? (
                <Image
                  src={p.providerLogoUrl}
                  alt=""
                  width={20}
                  height={20}
                  className="rounded-sm bg-white"
                />
              ) : null}
              <span>{p.providerName}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center gap-3">
        <Button onClick={onSave} disabled={!dirty || save.isPending}>
          {save.isPending ? 'Saving…' : 'Save'}
        </Button>
        {selected.size > 0 ? (
          <span className="text-sm text-slate-500">
            {selected.size} {selected.size === 1 ? 'service' : 'services'} selected
          </span>
        ) : (
          <span className="text-sm text-slate-500">
            Nothing selected — recs aren&apos;t filtered.
          </span>
        )}
        {savedAt && !save.isPending ? (
          <span className="text-sm text-emerald-600">Saved.</span>
        ) : null}
      </div>
    </div>
  );
}
