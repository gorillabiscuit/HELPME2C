'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// Mirror watch_entries.status enum. Hardcoded vs imported so this client
// component doesn't pull in @/server/* into the client bundle.
type WatchStatus = 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';

// The DB enum also has 'friends' but it isn't selectable until social
// graph (Phase 1B); same as the account-settings default-privacy form.
// Any existing 'friends' row from a future feature flag falls through to
// the radio's else-branch and shows as 'private'-selected — see preselect
// logic below.
type SettablePrivacy = 'public' | 'private';

const STATUS_OPTIONS: Array<{ value: WatchStatus; label: string }> = [
  { value: 'plan_to_watch', label: 'Plan to watch' },
  { value: 'watching', label: 'Watching' },
  { value: 'completed', label: 'Completed' },
  { value: 'on_hold', label: 'On hold' },
  { value: 'dropped', label: 'Dropped' },
];

interface InitialEntry {
  status: WatchStatus | null;
  currentEpisode: number | null;
  rating: number | null;
  notes: string | null;
  privacy: SettablePrivacy | 'friends' | null;
}

interface LibraryEditDialogProps {
  titleId: string;
  titleText: string;
  hasEpisodes: boolean;
  initialEntry: InitialEntry;
}

// Plain <select> / <textarea> styled to match the shadcn Input primitive.
// Adding proper shadcn Select / Textarea components would be a §4-adjacent
// change (new pattern + new component); the workaround keeps scope tight
// for v1.
const FIELD_BASE_CLASSES =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50';

export function LibraryEditDialog({
  titleId,
  titleText,
  hasEpisodes,
  initialEntry,
}: LibraryEditDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Form state — strings so empty string ↔ "no value" is clean to handle.
  // Initial values pull from the existing entry; if a field was null we
  // start with an empty string in the input.
  const [status, setStatus] = useState<WatchStatus>(initialEntry.status ?? 'plan_to_watch');
  const [currentEpisode, setCurrentEpisode] = useState<string>(
    initialEntry.currentEpisode?.toString() ?? '',
  );
  const [rating, setRating] = useState<string>(initialEntry.rating?.toString() ?? '');
  const [notes, setNotes] = useState<string>(initialEntry.notes ?? '');
  // 'friends' falls through to 'private' here — the friends-only path
  // isn't selectable in v1 (no social graph yet), and we don't want a
  // user with a legacy 'friends' row to accidentally promote it to
  // 'public' by saving the form without re-picking.
  const [privacy, setPrivacy] = useState<SettablePrivacy>(
    initialEntry.privacy === 'public' ? 'public' : 'private',
  );

  const upsertMutation = trpc.watch.upsert.useMutation({
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Empty-string number inputs become undefined (the upsert procedure
    // preserves fields that are undefined). Non-empty becomes the parsed
    // int. Validation (1-10 for rating, >=0 for episode) is enforced
    // server-side by the Zod schema; the HTML attributes here are
    // affordance, not gate.
    const ratingNum = rating === '' ? undefined : Number.parseInt(rating, 10);
    const episodeNum = currentEpisode === '' ? undefined : Number.parseInt(currentEpisode, 10);
    const notesValue = notes === '' ? undefined : notes;

    upsertMutation.mutate({
      titleId,
      kind: 'tracking',
      status,
      rating: ratingNum,
      currentEpisode: episodeNum,
      notes: notesValue,
      privacy,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate">Edit &ldquo;{titleText}&rdquo;</DialogTitle>
          <DialogDescription>
            Update status, rating, episode progress, or notes. To clear a value entirely, remove
            this title from your list and re-add it.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="watch-edit-status">Status</Label>
            <select
              id="watch-edit-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as WatchStatus)}
              className={cn(FIELD_BASE_CLASSES, 'cursor-pointer')}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="watch-edit-rating">Rating (1–10)</Label>
            <Input
              id="watch-edit-rating"
              type="number"
              min={1}
              max={10}
              step={1}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              placeholder="—"
            />
          </div>

          {hasEpisodes ? (
            <div className="space-y-1.5">
              <Label htmlFor="watch-edit-episode">Current episode</Label>
              <Input
                id="watch-edit-episode"
                type="number"
                min={0}
                step={1}
                value={currentEpisode}
                onChange={(e) => setCurrentEpisode(e.target.value)}
                placeholder="—"
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor="watch-edit-notes">Notes</Label>
            <textarea
              id="watch-edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={5000}
              className={cn(
                FIELD_BASE_CLASSES,
                'h-auto min-h-20 resize-y py-2 leading-relaxed placeholder:text-muted-foreground',
              )}
              placeholder="Optional — only visible to you."
            />
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium leading-none">Visibility</legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="watch-edit-privacy"
                value="private"
                checked={privacy === 'private'}
                onChange={() => setPrivacy('private')}
              />
              <span>
                Private <span className="text-muted-foreground">— only you</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name="watch-edit-privacy"
                value="public"
                checked={privacy === 'public'}
                onChange={() => setPrivacy('public')}
              />
              <span>
                Public{' '}
                <span className="text-muted-foreground">
                  — visible on your profile (profiles aren&apos;t live yet)
                </span>
              </span>
            </label>
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
