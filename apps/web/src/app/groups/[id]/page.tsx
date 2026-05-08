import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { appRouter } from '@/server/router';
import { createContext } from '@/server/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GroupInviteShare } from '@/components/group-invite-share';
import { GroupMemberList } from '@/components/group-member-list';
import { GroupOwnerActions } from '@/components/group-owner-actions';

const idSchema = z.string().uuid();

interface PageProps {
  params: Promise<{ id: string }>;
}

const MEDIA_TYPE_LABEL: Record<'tv' | 'film' | 'anime', string> = {
  tv: 'TV',
  film: 'Film',
  anime: 'Anime',
};

function formatScore(s: number): string {
  return (s * 100).toFixed(0);
}

export default async function GroupDetailPage({ params }: PageProps) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();

  const { userId } = await auth();
  if (!userId) redirect('/');

  const caller = appRouter.createCaller(await createContext());

  let group: Awaited<ReturnType<typeof caller.groups.get>>;
  try {
    group = await caller.groups.get({ id });
  } catch (e) {
    // 404 covers both "doesn't exist" and "you're not a member" — same
    // shape so we don't leak group existence to non-members.
    if (e instanceof TRPCError && e.code === 'NOT_FOUND') notFound();
    throw e;
  }

  // Build the absolute join URL on the server using the request host so
  // it works in dev, preview, and prod without env-var coupling.
  //
  // Proto comes from x-forwarded-proto (Vercel sets this on every prod
  // request) so we don't have to second-guess. Falls back to host-based
  // detection for non-Vercel deploys: localhost / 127.* / 0.0.0.0 → http,
  // anything else → https. Without that fallback, custom-domain dev
  // setups would generate broken https:// links.
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') ?? 'localhost:3000';
  const forwardedProto = requestHeaders.get('x-forwarded-proto');
  const isLocalHost =
    host.startsWith('localhost') || host.startsWith('127.') || host.startsWith('0.0.0.0');
  const proto = forwardedProto ?? (isLocalHost ? 'http' : 'https');
  const inviteUrl = group.inviteToken
    ? `${proto}://${host}/groups/join/${group.inviteToken}`
    : null;

  const top = group.recs.items.slice(0, 20);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-6">
        <Link href="/groups" className="text-sm text-slate-500 hover:text-slate-900">
          ← All groups
        </Link>
      </div>

      <header className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{group.name}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
            {group.isOwner ? ' · you own this group' : ''}
          </p>
        </div>
        {group.isOwner ? <GroupOwnerActions groupId={group.id} /> : null}
      </header>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <GroupMemberList groupId={group.id} members={group.members} isOwner={group.isOwner} />
        </CardContent>
      </Card>

      {inviteUrl ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Invite link</CardTitle>
          </CardHeader>
          <CardContent>
            <GroupInviteShare groupId={group.id} initialUrl={inviteUrl} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-baseline justify-between">
          <CardTitle>Group recommendations</CardTitle>
          {group.recs.computedAt ? (
            <span className="text-xs font-normal text-slate-400">
              Computed {group.recs.computedAt.toUTCString()}
            </span>
          ) : null}
        </CardHeader>
        <CardContent>
          {top.length === 0 ? (
            <p className="text-sm text-slate-600">
              No group recs yet. Either everyone&apos;s tastes are too different (the algorithm
              honestly excludes things one of you would dislike), or the recompute hasn&apos;t
              landed yet — try refreshing in a moment.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
              {top.map((rec) => {
                const mediaTypeLabel = MEDIA_TYPE_LABEL[rec.mediaType];
                return (
                  <li key={rec.id}>
                    <Link href={`/titles/${rec.id}`} className="group block">
                      {rec.posterUrl ? (
                        <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-slate-200 bg-slate-100 transition group-hover:border-slate-400">
                          <Image
                            src={rec.posterUrl}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 220px, (min-width: 640px) 33vw, 50vw"
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-[2/3] rounded-lg border border-slate-200 bg-slate-100" />
                      )}
                      <h3 className="mt-2 truncate text-sm font-medium text-slate-900 group-hover:underline">
                        {rec.title}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {[mediaTypeLabel, rec.releaseYear?.toString()]
                          .filter((s): s is string => Boolean(s))
                          .join(' · ')}
                      </p>
                    </Link>
                    {/* Per-member transparency — tiny pills with each
                        member's normalised 0..100 score. The only cross-
                        member data that's exposed per ROADMAP M7 privacy. */}
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {group.members.map((m) => {
                        const score = rec.perUserScores[m.userId];
                        if (score === undefined) return null;
                        return (
                          <span
                            key={m.userId}
                            className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600"
                            title={`${m.displayName ?? 'Member'}: ${formatScore(score)}/100`}
                          >
                            <span className="font-medium">
                              {m.displayName ?? m.userId.slice(0, 4)}
                            </span>
                            <span className="ml-1 text-slate-500">{formatScore(score)}</span>
                          </span>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
