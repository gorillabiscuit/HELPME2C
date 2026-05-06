import { Show } from '@clerk/nextjs';
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { appRouter } from '@/server/router';
import { DashboardHome } from '@/components/dashboard-home';
import { MarketingHero } from '@/components/marketing-hero';

export default async function HomePage() {
  const { userId } = await auth();
  const user = userId ? await currentUser() : null;

  // Signed-in but not age-verified → bounce to /age-check before rendering the
  // dashboard. Per ADR-0012 §5. Signed-out users see the marketing page normally.
  if (userId && !user?.publicMetadata?.ageVerified) {
    redirect('/age-check');
  }

  const caller = appRouter.createCaller({});
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
