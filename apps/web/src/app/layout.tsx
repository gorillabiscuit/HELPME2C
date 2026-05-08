import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { ConsentProvider } from '@/components/consent-provider';
import { ConsentBanner } from '@/components/consent-banner';
import { ConsentPreferencesDialog } from '@/components/consent-preferences-dialog';
import { PostHogProvider } from '@/components/posthog-provider';
import { SiteFooter } from '@/components/site-footer';
import { TRPCProvider } from '@/components/trpc-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'HelpME2C',
  description: 'Cross-medium recommendation engine for TV and anime.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-white text-foreground antialiased">
        <ClerkProvider>
          <TRPCProvider>
            <ConsentProvider>
              <PostHogProvider>
                <header className="flex items-center justify-between border-b border-border px-6 py-3">
                  <div className="flex items-center gap-6">
                    <Link href="/" className="text-sm font-semibold tracking-tight">
                      HelpME2C
                    </Link>
                    <Show when="signed-in">
                      <nav className="flex items-center gap-4 text-sm text-text-body">
                        <Link href="/search" className="hover:text-foreground">
                          Search
                        </Link>
                        <Link href="/library" className="hover:text-foreground">
                          Library
                        </Link>
                      </nav>
                    </Show>
                  </div>
                  <div className="flex items-center gap-2">
                    <Show when="signed-out">
                      <SignInButton />
                      <SignUpButton />
                    </Show>
                    <Show when="signed-in" treatPendingAsSignedOut={false}>
                      <UserButton />
                    </Show>
                  </div>
                </header>
                <div className="flex-1">{children}</div>
                <SiteFooter />
                <ConsentBanner />
                <ConsentPreferencesDialog />
              </PostHogProvider>
            </ConsentProvider>
          </TRPCProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
