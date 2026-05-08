import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { TRPCError } from '@trpc/server';
import { appRouter } from '@/server/router';
import { createContext } from '@/server/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GroupJoinButton } from '@/components/group-join-button';

interface PageProps {
  params: Promise<{ token: string }>;
}

// Invite-token landing page. Confirms the group name to the user before
// they commit, then the join button calls groups.join (which is
// idempotent — re-joining the same group via the same link is a no-op).

export default async function GroupJoinPage({ params }: PageProps) {
  const { token } = await params;

  const { userId } = await auth();
  if (!userId) {
    // Send the user to sign in first, preserving the join URL so they
    // come back here after authenticating. Clerk handles the
    // redirect_url query param via the sign-in middleware.
    redirect(`/sign-in?redirect_url=/groups/join/${encodeURIComponent(token)}`);
  }

  const caller = appRouter.createCaller(await createContext());
  let group: { id: string; name: string };
  try {
    group = await caller.groups.preview({ token });
  } catch (e) {
    if (e instanceof TRPCError && e.code === 'NOT_FOUND') notFound();
    throw e;
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle>Join {group.name}?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            By joining, the other members of <span className="font-medium">{group.name}</span> will
            see your display name in the group. They won&apos;t see your library, ratings, or
            anchors — only the group&apos;s shared recommendations.
          </p>
          <div className="flex gap-2">
            <GroupJoinButton token={token} />
            <Link
              href="/groups"
              className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
