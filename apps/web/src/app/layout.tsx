import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import './globals.css';

export const metadata: Metadata = {
  title: 'HelpME2C',
  description: 'Cross-medium recommendation engine for TV and anime.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <ClerkProvider>
          <header className="flex items-center justify-between border-b border-slate-200 px-6 py-3">
            <span className="text-sm font-semibold tracking-tight">HelpME2C</span>
            <div className="flex items-center gap-2">
              <Show when="signed-out">
                <SignInButton />
                <SignUpButton />
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
