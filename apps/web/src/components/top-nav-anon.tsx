import Link from 'next/link';
import { SignInButton, SignUpButton } from '@clerk/nextjs';

// Anon variant of the global nav. Server component — no Clerk client SDK
// pulled in for hydration. The Clerk button components render as plain <a>
// to the configured sign-in/up URLs (no modal), so we don't ship the heavy
// @clerk/ui bundle that <UserButton> requires.
//
// Pair: top-nav-authed.tsx. The root layout picks one based on server-side
// auth() — see layout.tsx.

export function TopNavAnon() {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2 sm:gap-6">
        <Link
          href="/"
          className="rounded text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
        >
          HelpME2C
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <SignInButton />
        <SignUpButton />
      </div>
    </header>
  );
}
