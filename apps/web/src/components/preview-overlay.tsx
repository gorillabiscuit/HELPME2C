'use client';

import { useState, type MouseEvent } from 'react';
import { Play } from 'lucide-react';
import { PreviewModal } from '@/components/preview-modal';

interface PreviewOverlayProps {
  trailerProvider: string | null;
  trailerVideoId: string | null;
  titleText: string;
}

// Absolute-positioned play overlay for any video poster. Render this
// INSIDE the poster's `relative` container — it positions itself
// top-right. Renders nothing when no trailer is known so empty buttons
// don't appear.
//
// Hover behaviour: invisible until pointer enters the parent group
// (we rely on Tailwind `group-hover:` on the parent — every consumer
// already wraps the poster in a `group` link). Touch devices have
// no hover, so on small viewports the play badge is always visible
// at lower opacity. Tap or click opens the trailer modal.
//
// The button must stop event propagation: every poster on the site
// is wrapped in a <Link> to the title detail page, and the modal
// should open in place rather than navigating.
export function PreviewOverlay({
  trailerProvider,
  trailerVideoId,
  titleText,
}: PreviewOverlayProps) {
  const [open, setOpen] = useState(false);

  if (!trailerVideoId || trailerProvider !== 'youtube') return null;

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label={`Preview ${titleText} trailer`}
        title="Preview trailer"
        className="absolute top-2 right-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white opacity-60 backdrop-blur-sm transition hover:bg-black/85 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
      >
        <Play className="h-4 w-4 fill-current" aria-hidden="true" />
      </button>
      <PreviewModal
        open={open}
        onOpenChange={setOpen}
        videoId={trailerVideoId}
        titleText={titleText}
      />
    </>
  );
}
