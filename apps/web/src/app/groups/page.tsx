import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { appRouter } from '@/server/router';
import { createContext } from '@/server/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GroupCreateForm } from '@/components/group-create-form';

// Group recommendations landing page per ROADMAP M7. Lists the caller's
// groups (owned + joined) and offers an inline create form. Empty state
// nudges first-time users to create their first group; the join flow
// lives at /groups/join/[token] (reached via an invite link, not from
// here).

export default async function GroupsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  const caller = appRouter.createCaller(await createContext());
  const { groups: myGroups } = await caller.groups.list();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-6">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
          ← Home
        </Link>
      </div>

      <h1 className="text-3xl font-semibold tracking-tight">Groups</h1>
      <p className="mt-2 text-sm text-slate-600">
        Create a group to get joint recommendations with others. Members see group recs and each
        other&apos;s display name only — your library and ratings stay private.
      </p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Create a group</CardTitle>
        </CardHeader>
        <CardContent>
          <GroupCreateForm />
        </CardContent>
      </Card>

      <h2 className="mt-10 text-xl font-semibold tracking-tight">Your groups</h2>
      {myGroups.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">
          You&apos;re not in any groups yet. Create one above, or accept an invite link from a
          friend.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {myGroups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/groups/${g.id}`}
                className="block rounded-lg border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-400"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-slate-900">{g.name}</span>
                  <span className="text-xs text-slate-500">
                    {g.memberCount} {g.memberCount === 1 ? 'member' : 'members'}
                    {g.isOwner ? ' · you own' : ''}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
