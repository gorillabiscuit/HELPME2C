'use client';

import { useCallback, useState } from 'react';
import { trpc } from '@/lib/trpc';

interface NoveltySliderProps {
  /** Initial value 0–1. Defaults to 0.3 if not set. */
  initialValue?: number | null | undefined;
  /** Called optimistically on every drag change. */
  onChange?: (value: number) => void;
  /** If true, renders a compact inline version (recs page).
   *  If false (default), renders the full onboarding card version. */
  compact?: boolean;
}

const LABELS = [
  { value: 0, label: 'Familiar', description: "Popular shows everyone's talking about" },
  { value: 0.5, label: 'Mixed', description: 'A blend of crowd-pleasers and hidden gems' },
  {
    value: 1,
    label: 'Adventurous',
    description: 'Critically acclaimed deep cuts from around the world',
  },
];

function getLabelForValue(value: number) {
  if (value <= 0.2) return LABELS[0];
  if (value >= 0.8) return LABELS[2];
  return LABELS[1];
}

export function NoveltySlider({ initialValue, onChange, compact = false }: NoveltySliderProps) {
  const [value, setValue] = useState<number>(initialValue ?? 0.3);
  const [isSaving, setIsSaving] = useState(false);
  const saveNovelty = trpc.preferences.saveNovelty.useMutation();

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = parseFloat(e.target.value);
      setValue(next);
      onChange?.(next);
    },
    [onChange],
  );

  const handleCommit = useCallback(async () => {
    setIsSaving(true);
    await saveNovelty.mutateAsync({ novelty: value });
    setIsSaving(false);
  }, [saveNovelty, value]);

  // getLabelForValue always returns one of the three LABELS entries.
  // The non-null assertion is safe: value is always 0–1 so a match exists.

  const current = getLabelForValue(value)!;

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-1">
        <span className="shrink-0 text-xs text-muted-foreground">Familiar</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={value}
          onChange={handleChange}
          onMouseUp={handleCommit}
          onTouchEnd={handleCommit}
          className="h-1.5 w-full cursor-pointer accent-primary"
          aria-label="Novelty preference"
        />
        <span className="shrink-0 text-xs text-muted-foreground">Adventurous</span>
        <span className="ml-1 shrink-0 text-xs font-medium text-primary">
          {isSaving ? '…' : current.label}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">How adventurous are you feeling?</h2>
        <p className="text-sm text-muted-foreground">
          We can lean toward shows everyone knows, or surface critically acclaimed deep cuts from
          around the world. You can change this any time.
        </p>
      </div>

      <div className="space-y-4">
        {/* Track with emoji anchors */}
        <div className="flex items-center justify-between text-lg" aria-hidden>
          <span>🍿</span>
          <span>🌍</span>
        </div>

        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={value}
          onChange={handleChange}
          onMouseUp={handleCommit}
          onTouchEnd={handleCommit}
          className="h-2 w-full cursor-pointer accent-primary"
          aria-label="Novelty preference — 0 is familiar, 1 is adventurous"
        />

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Familiar</span>
          <span>Mixed</span>
          <span>Adventurous</span>
        </div>

        {/* Live description */}
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 transition-all">
          <p className="text-sm font-medium">{current.label}</p>
          <p className="text-sm text-muted-foreground">{current.description}</p>
        </div>
      </div>

      {/* Example titles at extremes */}
      <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
        <div className="rounded-md border border-border p-3">
          <p className="mb-1 font-medium text-foreground">🍿 Familiar examples</p>
          <p>Breaking Bad, Stranger Things, Game of Thrones</p>
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="mb-1 font-medium text-foreground">🌍 Adventurous examples</p>
          <p>Stalker, Yi Yi, 4 Months 3 Weeks and 2 Days, Jeanne Dielman</p>
        </div>
      </div>
    </div>
  );
}
