import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { ConsentProvider } from '@/components/consent-provider';
import { ConsentBanner } from '@/components/consent-banner';
import { ConsentPreferencesDialog } from '@/components/consent-preferences-dialog';
import { PostHogProvider } from '@/components/posthog-provider';
import { SiteFooter } from '@/components/site-footer';
import { TopNavAnon } from '@/components/top-nav-anon';
import { TopNavAuthed } from '@/components/top-nav-authed';
import { TRPCProvider } from '@/components/trpc-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'HelpME2C',
  description: 'Cross-medium recommendation engine for TV and anime.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { userId } = await auth();
  const isSignedIn = userId !== null;

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-white text-foreground antialiased">
        <ClerkProvider>
          <TRPCProvider>
            <ConsentProvider>
              <PostHogProvider>
                {isSignedIn ? <TopNavAuthed /> : <TopNavAnon />}
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
