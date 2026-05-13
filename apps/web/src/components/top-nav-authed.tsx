'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { CreditCard, DownloadCloud, Menu, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Authed variant of the global nav. The anon variant (top-nav-anon.tsx) is
// chosen by the root layout when the user is signed-out, so anon visitors
// don't pay the @clerk/ui bundle that <UserButton> brings in.
//
// Active-state logic: '/' matches exactly (otherwise everything matches
// it via startsWith); other entries match on prefix so child routes
// (e.g. /settings/account) still highlight their parent.

interface NavItem {
  label: string;
  href: string;
}

const PRIMARY_NAV: ReadonlyArray<NavItem> = [
  { label: 'Recommendations', href: '/' },
  { label: 'Search', href: '/search' },
  { label: 'Library', href: '/library' },
  { label: 'Your taste', href: '/taste' },
  { label: 'Groups', href: '/groups' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNavAuthed() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2 sm:gap-6">
        <Link
          href="/"
          className="rounded text-sm font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
        >
          HelpME2C
        </Link>

        {/* Desktop primary nav — hidden on mobile, replaced by hamburger sheet. */}
        <nav className="hidden items-center gap-4 text-sm md:flex">
          {PRIMARY_NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded text-text-body hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2',
                  active && 'font-medium text-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2">
        {/* Mobile hamburger — only visible <md. */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="rounded-md p-2 text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <UserButton>
          <UserButton.MenuItems>
            <UserButton.Link
              label="Manage services"
              labelIcon={<CreditCard className="h-4 w-4" />}
              href="/settings/providers"
            />
            <UserButton.Link
              label="Import list"
              labelIcon={<DownloadCloud className="h-4 w-4" />}
              href="/settings/import"
            />
            <UserButton.Link
              label="Account & privacy"
              labelIcon={<ShieldCheck className="h-4 w-4" />}
              href="/settings/account"
            />
          </UserButton.MenuItems>
        </UserButton>
      </div>

      {/* Mobile sheet — slide-from-left drawer for primary nav. Settings
          still live under the avatar (which itself works on mobile). */}
      <DialogPrimitive.Root open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className={cn(
              'fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[80vw] flex-col gap-6 bg-white p-6 shadow-lg',
              'data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left',
            )}
          >
            <div className="flex items-center justify-between">
              <DialogPrimitive.Title className="text-sm font-semibold tracking-tight">
                HelpME2C
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </div>

            <nav className="flex flex-col gap-1 text-base">
              {PRIMARY_NAV.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'rounded-md px-3 py-2 text-text-body hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2',
                      active && 'bg-muted font-medium text-foreground',
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </header>
  );
}
