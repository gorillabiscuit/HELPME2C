import { appRouter } from '@/server/router';

export default async function HomePage() {
  const caller = appRouter.createCaller({});
  const { serverTime } = await caller.hello();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">HelpME2C</h1>
      <p className="mt-2 text-slate-600">Bootstrap placeholder.</p>
      <p className="mt-4 text-sm text-slate-500">
        Server time (via tRPC + <code>@helpme2c/shared</code>):{' '}
        <span className="font-mono">{serverTime}</span>
      </p>
    </main>
  );
}
