# ADR-0025: Embedded video provider + cookie posture

**Status:** Accepted
**Date:** 2026-05-17
**Supersedes:** —

## What we chose

Trailer previews embed from `www.youtube.com/embed/<id>` (the standard YouTube domain), not `www.youtube-nocookie.com`. YouTube sets its own first-party-to-YouTube cookies (which are third-party from HelpME2C's perspective) on first frame load. This is disclosed in the cookie consent banner copy and acknowledged in the privacy page stub. YouTube/Google is added to the sub-processor list in ADR-0012 §8.

For Phase 1A, embedded media is treated as essential-by-product-design and is NOT gated by a separate consent toggle. The user's interaction model is: click a poster's play overlay → modal opens → iframe loads. The play-overlay click is the consenting gesture.

## What we rejected

- **Stay on `youtube-nocookie.com`** — original choice (intended privacy-enhanced mode). YouTube's bot-detection serves the "Sign in to confirm that you're not a bot" challenge on `youtube-nocookie.com` at very high rates because the domain ships zero cookies, so YouTube can't see the visitor's existing YouTube session. PR #5 added `origin=` and a visible escape hatch; the escape hatch helps but the wall still fires every time for the maintainer. Trailer previews are a core product surface — see PROJECT.md — and a near-100% failure rate on the primary use is unshippable. Confirmed via DOM inspection on 2026-05-17: the iframe shows `<div class="ytp-error-content">…Sign in to confirm that you're not a bot</div>` despite a correctly-applied `origin` param. The `origin` param is for the postMessage JS API security boundary, not bot scoring; conflating the two is a common community-advice error.
- **Click-to-play (lite-embed) pattern as the fix** — adds an extra click *inside* the modal before the trailer plays (UX regression vs. today), and does not add user-gesture gating that we don't already have: the modal-open action is itself a user gesture. Held in reserve as a fallback if the domain switch proves insufficient.
- **Add a 4th "Media embeds" consent toggle in 1A** — the legally-cleaner posture under GDPR's strict reading of "specific, informed consent." Rejected for 1A on scope grounds; queued for 1B (see "What would change our mind"). The maintainer's product framing is that trailer previews are inseparable from the value proposition; treating them as opt-in would turn the MVP into a degraded product for non-consenting users.
- **Use a different provider** (Vimeo, self-host trailer clips) — trailer availability is sourced via TMDB which keys off YouTube IDs; switching providers would require a parallel ingestion pipeline. Disproportionate to the bot-wall problem.

## Why

YouTube's bot-detection on `youtube-nocookie.com` has been ramping through 2026. Without session cookies, YouTube cannot distinguish a real user from headless automation, and serves the bot challenge defensively. The challenge is rendered inside the cross-origin iframe — JavaScript on our side cannot detect it, cannot dismiss it, and cannot retry it. The only mitigations available client-side are (a) get YouTube to trust the session, or (b) abandon the embed.

Switching to `www.youtube.com` gives YouTube the user's existing YouTube session cookie (`LOGIN_INFO`, `VISITOR_INFO1_LIVE`, `YSC`) when present. For signed-in YouTube users, this restores trailer playback. For users not signed into YouTube, the wall is still possible but less likely than on the `nocookie` domain because the visitor cookie alone provides session continuity that YouTube's bot model treats as positive signal.

The privacy cost is concrete and worth naming: every trailer view sends the user's IP, User-Agent, Referer (HelpME2C), and YouTube cookies to Google. Google can correlate this with the user's broader YouTube/Google identity. This is third-party tracking by a major ad-tech company, and it is exactly what `youtube-nocookie.com` was designed to prevent.

For Phase 1A this is acceptable because:

1. The trailer surface is core to the product (recommendation discovery flow). A degraded trailer flow undercuts the primary loop.
2. The user-base is small (pre-launch, registered users only). The aggregate privacy exposure is bounded.
3. The exposure is disclosed in the consent banner and privacy page. Informed-not-granular consent is weaker than per-category toggles but is meaningfully better than silent.
4. The escape hatch ("Open on YouTube") shipped in PR #5 is retained, so users who refuse the embed still have a path.
5. The follow-up to a proper 4th-toggle consent UX is queued for 1B and explicitly named below.

The right time to revisit is when traffic scales or when affiliate / marketing categories also need a 4th consent toggle (per ADR-0012 §4, that toggle was already planned for 1B). At that point, embedded media gets a fifth toggle (or shares the marketing category as "embedded third-party media") and defaults to off until consented.

## What would change our mind

- **Switch to `youtube.com` doesn't clear the wall for the maintainer.** Bot detection is also IP/account-driven; if the maintainer's YouTube account or IP is flagged, no domain change will help. Fallback then is the click-to-play lite-embed pattern + retaining the escape hatch, accepting that some users will see the wall and click out.
- **Public launch approaches.** ADR-0012 §6 already names public marketing launch as the trigger for lawyer review of the privacy policy. At that point, the consent posture for embedded media gets revisited as part of the broader privacy review; we should expect to add the 4th toggle and gate the iframe behind it.
- **A specific regulator issues guidance** that treats embedded video as requiring its own granular consent category (UK ICO, French CNIL, Irish DPC, EDPB). This has happened to other embed providers historically; if YouTube embeds get explicit guidance, the 4th toggle becomes immediately required.
- **PostHog session-replay captures show a non-trivial fraction of users bouncing at the bot-wall** even after the domain switch. That would indicate the IP/account-driven detection is hitting our user-base too, and we should adopt the lite-embed pattern in addition.
- **A vendor change** — if TMDB starts providing trailers from a provider other than YouTube (rare), or if a privacy-first embed provider becomes viable for film trailers.

## Phase 1B follow-up (queued)

Add a 4th "Embedded media" consent category in `lib/consent.ts` (alongside `essential` / `analytics` / `sessionReplay`). Default off. When off, `preview-modal.tsx` renders the YouTube thumbnail (`https://img.youtube.com/vi/<id>/hqdefault.jpg`) with the play overlay; clicking the overlay sets the consent and mounts the iframe (per-instance consent that also writes the category preference). This converts the implicit-consent-by-opening-the-modal model into an explicit per-user choice without breaking the discovery flow. Track alongside the marketing/affiliate toggle work scheduled for Phase 1B per ADR-0012 §4.

## Related

- ADR-0012 — privacy compliance (§4 cookie consent categories; §8 sub-processor list — both amended in the same commit as this ADR)
- PR #5 — origin param + escape hatch (insufficient on its own; retained alongside this change)
- PROJECT.md §Phase 1A scope (trailer previews as core discovery surface)
- CLAUDE.md §4 (stop-and-ask for consent flow + new cookie + ADR change — all three apply here)
