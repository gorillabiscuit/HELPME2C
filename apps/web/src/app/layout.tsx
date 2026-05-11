import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { ConsentProvider } from '@/components/consent-provider';
import { ConsentBanner } from '@/components/consent-banner';
import { ConsentPreferencesDialog } from '@/components/consent-preferences-dialog';
import { PostHogProvider } from '@/components/posthog-provider';
import { SiteFooter } from '@/components/site-footer';
import { TopNav } from '@/components/top-nav';
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
                <TopNav />
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
