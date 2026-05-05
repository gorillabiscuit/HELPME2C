import { Show } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import { appRouter } from '@/server/router';
import { DashboardHome } from '@/components/dashboard-home';
import { MarketingHero } from '@/components/marketing-hero';

export default async function HomePage() {
  const user = await currentUser();
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
