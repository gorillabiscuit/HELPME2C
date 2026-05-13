import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/server/db';
import { users } from '@/server/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AccountDeleteForm } from '@/components/account-delete-form';
import { DefaultPrivacyForm } from '@/components/default-privacy-form';
import { PreviewAudioForm } from '@/components/preview-audio-form';

// /settings/account — DSAR self-serve surface per ADR-0012 §7.
// Article 15 + 20 (export) and Article 17 (deletion) live here. Cookie
// consent is on the always-visible banner at the page foot.

export default async function AccountSettingsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  // Fetch default_privacy server-side. Friends-only stays in the DB enum
  // but isn't selectable here; if a row somehow has 'friends' (e.g. set
  // via SQL by a future feature flag), treat it as 'private' for the
  // current UI — safer than silently exposing it as 'public'.
  const [userRow] = await db
    .select({
      defaultPrivacy: users.defaultPrivacy,
      previewAudioEnabled: users.previewAudioEnabled,
    })
    .from(users)
    .where(eq(users.clerkId, userId))
    .limit(1);
  const initialDefault: 'public' | 'private' =
    userRow?.defaultPrivacy === 'public' ? 'public' : 'private';
  const initialPreviewAudio = userRow?.previewAudioEnabled ?? true;

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Account &amp; privacy</h1>
      <p className="mt-2 max-w-2xl text-base text-text-body">
        Download a copy of everything we hold on you, or permanently delete your account. Cookie and
        analytics preferences live on the banner at the foot of the page.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Default visibility for new entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-text-body">
            Applies to titles you add to your list from now on. Items already on your list keep
            their current visibility — change them one at a time from each title&apos;s page.
            &ldquo;Friends only&rdquo; arrives later, with the social-graph features.
          </p>
          <DefaultPrivacyForm initialDefault={initialDefault} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Trailer previews</CardTitle>
        </CardHeader>
        <CardContent>
          <PreviewAudioForm initialEnabled={initialPreviewAudio} />
        </CardContent>
      </Card>

      <Card className="mt-6">
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
