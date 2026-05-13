'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface PreviewAudioFormProps {
  initialEnabled: boolean;
}

// Toggle for the trailer-preview audio default. The modal itself has a
// session-only mute button; this is the persistent server preference
// that the modal reads on each open.
export function PreviewAudioForm({ initialEnabled }: PreviewAudioFormProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const save = trpc.me.setPreviewAudioEnabled.useMutation({
    onSuccess: () => {
      setSavedAt(new Date());
      router.refresh();
    },
  });

  const onToggle = (next: boolean) => {
    setEnabled(next);
    setSavedAt(null);
    save.mutate({ enabled: next });
  };

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <Label htmlFor="preview-audio" className="text-sm font-medium text-foreground">
          Audio on by default
        </Label>
        <p className="text-sm text-muted-foreground">
          When you open a trailer preview, audio plays automatically. Turn this off if you&apos;d
          rather browse silently — you can still unmute per-preview from the modal.
        </p>
      </div>
      <div className="flex flex-none items-center gap-3 pt-1">
        <Switch
          id="preview-audio"
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={save.isPending}
          aria-label="Audio on by default"
        />
      </div>
      {save.isError ? (
        <p className="basis-full text-xs text-red-700" role="alert">
          {save.error.message}
        </p>
      ) : null}
      {savedAt && !save.isPending && !save.isError ? (
        <p className="basis-full text-xs text-emerald-700">Saved.</p>
      ) : null}
    </div>
  );
}
