import { Show } from '@clerk/nextjs';
import { auth, currentUser } from '@clerk/nextjs/server';
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
  // privateMetadata.dbSynced after upserting the row. The dbSynced session-token
  // claim (configured in Clerk Dashboard → Sessions) projects that to the JWT
  // so we can short-circuit here without an extra Clerk API call or DB write.
  // Fallback: if the claim is missing/false (race window after first signup
  // before the webhook lands, or webhook delivery failure), me.ensure runs and
  // produces the same result idempotently. Once the JWT refreshes (~60s after
  // the webhook fires) the claim flips and this fallback is skipped on
  // subsequent renders.
  if (userId && sessionClaims?.dbSynced !== true) {
    await caller.me.ensure();
  }

  const { serverTime, mlStatus } = await caller.hello();

  return (
    <>
      <Show when="signed-out">
        <MarketingHero />
      </Show>
      <Show when="signed-in">
        <DashboardHome firstName={user?.firstName} serverTime={serverTime} mlStatus={mlStatus} />
      </Show>
    </>
  );
}
