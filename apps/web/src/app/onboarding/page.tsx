export default function OnboardingPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Welcome</h1>
      <p className="mt-2 text-slate-600">
        Onboarding flow coming in M4 — anchor capture, demographics, taste profile bootstrap.
      </p>
      <p className="mt-4 text-sm text-slate-500">
        For now, this is the post-signup landing per{' '}
        <code>NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL</code>.
      </p>
    </main>
  );
}
