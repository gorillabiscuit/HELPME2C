import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnilistImportForm } from '@/components/anilist-import-form';
import { MalImportForm } from '@/components/mal-import-form';

// Power-user list import page per ROADMAP M8. Two source flows in one
// place: enter your AniList username, OR upload a MAL XML export.
// Both feed the same listImport router on the server.

export default async function ImportPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Home
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight">Import your list</h1>
      <p className="mt-2 text-sm text-text-body">
        Bring your existing anime list across so HelpME2C&apos;s recommendations can learn from it.
        We&apos;ll match titles to our catalogue and add them as &lsquo;tracking&rsquo; entries with
        your status + rating preserved. Existing anchor picks stay untouched.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>From AniList</CardTitle>
        </CardHeader>
        <CardContent>
          <AnilistImportForm />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>From MyAnimeList</CardTitle>
        </CardHeader>
        <CardContent>
          <MalImportForm />
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        Only anime listed in our catalogue can be imported. Titles we don&apos;t have yet are
        skipped — re-run the import after the next nightly catalogue sync if you&apos;re missing
        recent releases.
      </p>
    </main>
  );
}
