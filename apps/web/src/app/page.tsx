import { auth, currentUser } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { appRouter } from '@/server/router';
import { createContext } from '@/server/trpc';
import { DashboardHome } from '@/components/dashboard-home';
import { MarketingHero } from '@/components/marketing-hero';

export default async function HomePage() {
  const { userId, sessionClaims } = await auth();
  const user = userId ? await currentUser() : null;

  // Signed-in but not age-verified → bounce to /age-check before rendering the
  // dashboard. Per ADR-0012 §5. Signed-out users see the marketing page normally.
  if (userId && !user?.publicMetadata?.ageVerified) {
    redirect('/age-check');
  }

  const caller = appRouter.createCaller(await createContext());

  // Primary path is the Clerk user.created/user.updated webhook, which sets
  // publicMetadata.dbSynced after upserting the row. Fallback runs me.ensure
  // when the JWT claim is missing — see commit 3e99816 for the full
  // explanation of the projection contract.
  if (userId && sessionClaims?.publicMetadata?.dbSynced !== true) {
    await caller.me.ensure();
  }

  // Pre-computed personal recs from the nightly Inngest job (commit 4a133cd)
  // via the recommendations.list reader (commit 959ef37). Empty array means
  // either the user has no taste signal yet (cold-start, no anchors) or the
  // cron hasn't run for them yet.
  //
  // Country comes from Vercel's geo header so the streaming-availability
  // filter (M5.4 per ADR-0021) is country-strict. Falls back to US when
  // the header is absent (local dev).
  const requestHeaders = await headers();
  const country = (requestHeaders.get('x-vercel-ip-country') ?? 'US').toUpperCase();
  const recs = userId
    ? await caller.recommendations.list({ limit: 20, country })
    : {
        items: [],
        filtered: false,
        filter: { active: false, providers: [], hiddenCount: 0 },
      };

  // Bounce signed-in users with no recs straight to /onboarding. /onboarding
  // then routes internally:
  //   - cold-start (no ratings) → renders the intro + picker
  //   - just-picked (anchors exist, recs computing) → redirects to
  //     /library?view=ranked so the user sees what they just picked
  // Without this redirect, cold-start users would see the dashboard's
  // empty state with a "Browse popular shows" CTA that points at
  // /library?view=discover — which sends them away from the structured
  // first-time flow into the general browse surface. The DashboardHome
  // empty-state branch still exists as defense in depth for any race
  // condition (its CTA is updated to /onboarding in the same PR).
  if (userId && recs.items.length === 0) {
    redirect('/onboarding');
  }

  return userId ? (
    <DashboardHome firstName={user?.firstName} recs={recs.items} filter={recs.filter} />
  ) : (
    <MarketingHero />
  );
}
