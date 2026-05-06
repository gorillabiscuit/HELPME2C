import { requireAgeVerified } from '@/lib/require-age-verified';

export default async function OnboardingPage() {
  await requireAgeVerified();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Welcome</h1>
      <p className="mt-2 text-slate-600">
        Onboarding flow coming in M4 — anchor capture, demographics, taste profile bootstrap.
      </p>
      <p className="mt-4 text-sm text-slate-500">
        Post-signup landing per <code>NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL</code>; access
        gated behind the age-check at <code>/age-check</code> per ADR-0012 §5.
      </p>
    </main>
  );
}
