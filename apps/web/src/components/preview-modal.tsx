'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { ExternalLink, Maximize2, Volume2, VolumeX, X } from 'lucide-react';
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

  // The Radix dialog centres itself with translate(-50%) + top/left 50%
  // and constrains width to max-w-3xl. Those CSS rules persist when the
  // element enters fullscreen, putting only the bottom-right quadrant
  // of the modal visible inside the fullscreen viewport. Track fullscreen
  // state in React and swap to a fill-the-viewport class set so Tailwind
  // utility classes win cleanly without CSS specificity battles.
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    const handler = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const onToggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await el.requestFullscreen();
    }
  };

  // Phase 1A: YouTube trailer embeds are NOT gated by the cookie-consent
  // toggles in lib/consent.ts. The product treats opening the modal as the
  // consenting gesture (rationale + Phase 1B remediation plan in ADR-0025).
  // Don't add a consent check around the iframe without revisiting that ADR.
  //
  // Embed domain is www.youtube.com (NOT youtube-nocookie.com). The privacy-
  // enhanced domain ships zero cookies, which means YouTube can't see the
  // user's YouTube session — every embed looks anonymous and gets served the
  // "Sign in to confirm that you're not a bot" wall at high rates. Using
  // youtube.com lets YouTube reuse the visitor's existing session and
  // dramatically lowers the bot-challenge rate. Trade-off: YouTube sets its
  // own cookies on first frame. Disclosed in the consent banner; full
  // rationale in ADR-0025.
  //
  // YouTube embed params:
  //   autoplay=1, playsinline=1     — start playing, no fullscreen forced on mobile
  //   controls=0, rel=0             — hide native chrome + related-video grid
  //   modestbranding=1              — minimal YouTube branding (wordmark stays per ToS)
  //   mute=0|1                      — audio per user preference + session override
  //   enablejsapi=1                 — enables postMessage control if we ever want it
  //   origin=<our origin>           — required by the JS API (enablejsapi=1) for
  //                                   postMessage security. Computed client-side so
  //                                   we don't ship "origin=localhost" in a
  //                                   production SSR'd HTML payload — wait until
  //                                   mount, then render the iframe.
  const mute = audioOn ? 0 : 1;
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => {
    if (open) setOrigin(window.location.origin);
  }, [open]);
  const embedSrc = origin
    ? `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1&playsinline=1&controls=0&rel=0&modestbranding=1&mute=${mute}&enablejsapi=1&origin=${encodeURIComponent(origin)}`
    : null;
  const youtubeWatchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/*
          stopPropagation on both Overlay and Content is required because
          rec-card posters are wrapped in a Next.js <Link>, and React's
          synthetic events bubble through the COMPONENT tree even when
          the Portal moves the modal out of the DOM tree. Without this,
          clicking the Close button (or backdrop) inside the modal
          bubbles up to the parent Link and triggers navigation to the
          title page — the user reported "i close the trailer and it
          takes me to the title's page instead of staying on recs."
        */}
        <DialogPrimitive.Overlay
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-50 bg-black/70 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          ref={containerRef}
          aria-label={`Preview: ${titleText}`}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'fixed z-50 overflow-hidden bg-black shadow-2xl ring-1 ring-white/10',
            isFullscreen
              ? 'inset-0 flex h-screen w-screen items-center justify-center'
              : 'top-[50%] left-[50%] w-[calc(100vw-2rem)] max-w-3xl translate-x-[-50%] translate-y-[-50%] rounded-xl',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          )}
        >
          {/* Hidden title for screen readers — Radix requires DialogTitle. */}
          <DialogPrimitive.Title className="sr-only">Preview: {titleText}</DialogPrimitive.Title>

          {/* Video frame: 16:9 by default; in fullscreen, fill the viewport
              and let YouTube letterbox inside its own iframe. */}
          <div
            className={cn(
              'relative bg-black',
              isFullscreen ? 'h-full w-full' : 'aspect-video w-full',
            )}
          >
            {embedSrc ? (
              <iframe
                key={embedSrc}
                src={embedSrc}
                title={`Trailer for ${titleText}`}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : null}

            {/* Escape hatch when YouTube's bot-detection serves the "Sign
                in to confirm that you're not a bot" wall inside the
                iframe. JS can't detect that (cross-origin), so we always
                offer a direct link out. Bottom-left so it's visible
                without obscuring the player chrome. */}
            <a
              href={youtubeWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1.5 rounded-md bg-black/60 px-2.5 py-1.5 text-xs text-white transition hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Open on YouTube</span>
            </a>
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
