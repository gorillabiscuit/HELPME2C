import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountDeleteForm } from '@/components/account-delete-form';

// /settings/account — DSAR self-serve surface per ADR-0012 §7.
// Article 15 + 20 (export) and Article 17 (deletion) live here. Cookie
// consent is on the always-visible banner at the page foot.

export default async function AccountSettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Home
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight">Account &amp; privacy</h1>
      <p className="mt-2 text-sm text-text-body">
        Download a copy of everything we hold on you, or permanently delete your account. Cookie and
        analytics preferences live on the banner at the foot of the page.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Download my data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-text-body">
            JSON export covering your account, watch entries, personal recommendations, connected
            services, rec feedback, group memberships, and any groups you own. Per GDPR Article 15
            (right of access) and Article 20 (right to data portability).
          </p>
          <a
            href="/api/account/export"
            download
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
          >
            Download JSON
          </a>
        </CardContent>
      </Card>

      <Card className="mt-6 border-red-200">
        <CardHeader>
          <CardTitle className="text-red-700">Delete my account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-text-body">
            Permanently removes your account from HelpME2C and from our auth provider (Clerk). All
            your data — watch entries, ratings, group memberships, owned groups — is hard-deleted
            immediately. Cascades through every linked table per ADR-0012. This cannot be undone.
          </p>
          <p className="text-sm text-text-body">
            If you own any groups, deleting your account also deletes those groups (their members
            lose access). Consider transferring ownership before deletion if that matters — though
            v1 doesn&apos;t have a transfer flow yet, so the workaround is to add a co-owner via the
            database (or just accept the cascade).
          </p>
          <AccountDeleteForm />
        </CardContent>
      </Card>
    </main>
  );
}
