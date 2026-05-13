'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { Maximize2, Volume2, VolumeX, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';

interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  titleText: string;
}

// Trailer preview modal. YouTube embed with custom chrome (close,
// fullscreen, audio toggle); native YouTube controls / branding are
// hidden via embed params as far as YouTube's ToS allows (the
// 'YouTube' wordmark in the corner is required to stay).
//
// Audio default: comes from users.preview_audio_enabled; the in-modal
// toggle lets the user mute for this session without changing the
// setting. Modal close + reopen restarts at the server-stored
// preference (a session-only override is plenty for a discovery flow).
//
// Fullscreen uses the HTML5 fullscreen API on the modal content
// div, so the user gets the trailer + the custom chrome in fullscreen,
// not the iframe alone (avoids the YouTube fullscreen UI overriding).
export function PreviewModal({ open, onOpenChange, videoId, titleText }: PreviewModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Server-stored audio preference. While loading, default to enabled
  // (audio on) so the modal doesn't flash muted-then-unmuted as the
  // query resolves. The me.get query is cached by React Query so this
  // is a single fetch per session.
  const meQuery = trpc.me.get.useQuery();
  const audioPreference = meQuery.data?.previewAudioEnabled ?? true;

  // Session override — starts at the server preference each time the
  // modal opens. Reset on close so the next open reads the preference
  // fresh (handles a stale React Query cache vs a settings page change
  // in the same session).
  const [audioOn, setAudioOn] = useState(audioPreference);
  useEffect(() => {
    if (open) setAudioOn(audioPreference);
  }, [open, audioPreference]);

  const onToggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await el.requestFullscreen();
    }
  };

  // YouTube embed params:
  //   autoplay=1, playsinline=1     — start playing, no fullscreen forced on mobile
  //   controls=0, rel=0             — hide native chrome + related-video grid
  //   modestbranding=1              — minimal YouTube branding (wordmark stays per ToS)
  //   mute=0|1                      — audio per user preference + session override
  //   enablejsapi=1                 — enables postMessage control if we ever want it
  const mute = audioOn ? 0 : 1;
  const embedSrc = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&playsinline=1&controls=0&rel=0&modestbranding=1&mute=${mute}&enablejsapi=1`;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          ref={containerRef}
          aria-label={`Preview: ${titleText}`}
          className={cn(
            'fixed top-[50%] left-[50%] z-50 w-[calc(100vw-2rem)] max-w-3xl translate-x-[-50%] translate-y-[-50%]',
            'overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/10',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          )}
        >
          {/* Hidden title for screen readers — Radix requires DialogTitle. */}
          <DialogPrimitive.Title className="sr-only">Preview: {titleText}</DialogPrimitive.Title>

          {/* 16:9 video frame */}
          <div className="relative aspect-video w-full bg-black">
            <iframe
              key={embedSrc}
              src={embedSrc}
              title={`Trailer for ${titleText}`}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Custom chrome — overlay buttons in the top-right. */}
          <div className="pointer-events-none absolute top-0 right-0 flex gap-1 p-2">
            <button
              type="button"
              onClick={() => setAudioOn((v) => !v)}
              aria-label={audioOn ? 'Mute preview' : 'Unmute preview'}
              title={audioOn ? 'Mute preview' : 'Unmute preview'}
              className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-md bg-black/60 text-white transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              {audioOn ? (
                <Volume2 className="h-5 w-5" aria-hidden="true" />
              ) : (
                <VolumeX className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-label="Fullscreen"
              title="Fullscreen"
              className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-md bg-black/60 text-white transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <Maximize2 className="h-5 w-5" aria-hidden="true" />
            </button>
            <DialogPrimitive.Close
              aria-label="Close preview"
              title="Close preview"
              className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-md bg-black/60 text-white transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
