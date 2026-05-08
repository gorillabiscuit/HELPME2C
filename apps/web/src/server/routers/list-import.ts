import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { inngest, recommendUserEvent } from '@/inngest/client';
import { titles, watchEntries } from '../schema';
import { resolveInternalUserId } from '../lib/resolve-user';
import { protectedProcedure, router } from '../trpc';

// Power-user list import per ROADMAP M8. Two source-format families
// land in the same procedure shape — the caller normalises into a
// `ListImportEntry[]` shape on the client (parsing AniList GraphQL
// responses or MAL XML) and the server does title-lookup + upserts.
//
// Why client-side parsing for both: avoids a server-side XML dep
// (CLAUDE.md §4 stop-and-ask trigger) AND avoids server-side AniList
// rate-limit consumption — the user's browser hits AniList directly
// at their own IP.

const ANILIST_API = 'https://graphql.anilist.co';

// AniList list status enum mapped to ours. REPEATING gets folded into
// 'watching' since we don't model re-watches separately in v1.
const ANILIST_STATUS_MAP: Record<
  string,
  'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch'
> = {
  CURRENT: 'watching',
  COMPLETED: 'completed',
  PAUSED: 'on_hold',
  DROPPED: 'dropped',
  PLANNING: 'plan_to_watch',
  REPEATING: 'watching',
};

// AniList scoring systems → our integer 1-10. Returns null for
// unscored entries (score === 0 in any system) or unknown formats.
function normaliseAnilistScore(rawScore: number, scoreFormat: string): number | null {
  if (rawScore <= 0) return null;
  switch (scoreFormat) {
    case 'POINT_100':
      return Math.max(1, Math.min(10, Math.round(rawScore / 10)));
    case 'POINT_10_DECIMAL':
      return Math.max(1, Math.min(10, Math.round(rawScore)));
    case 'POINT_10':
      return Math.max(1, Math.min(10, Math.round(rawScore)));
    case 'POINT_5':
      // 1..5 → 2..10
      return Math.max(1, Math.min(10, Math.round(rawScore * 2)));
    case 'POINT_3':
      // 1=bad, 2=good, 3=great → 2, 6, 10 (rough linear)
      if (rawScore === 1) return 2;
      if (rawScore === 2) return 6;
      if (rawScore === 3) return 10;
      return null;
    default:
      // Unknown format — passthrough only if it falls in 1-10.
      if (rawScore >= 1 && rawScore <= 10) return Math.round(rawScore);
      return null;
  }
}

interface AnilistMediaListResponse {
  MediaListCollection: {
    user: {
      mediaListOptions: { scoreFormat: string };
    } | null;
    lists: Array<{
      entries: Array<{
        mediaId: number;
        status: string;
        score: number;
        progress: number;
      }>;
    }>;
  };
}

const MEDIA_LIST_QUERY = /* GraphQL */ `
  query ($name: String) {
    MediaListCollection(userName: $name, type: ANIME) {
      user {
        mediaListOptions {
          scoreFormat
        }
      }
      lists {
        entries {
          mediaId
          status
          score
          progress
        }
      }
    }
  }
`;

export const listImportRouter = router({
  // Imports an AniList user's anime list. Server-side fetch (vs client-side
  // direct-from-browser) keeps the API path consistent with our existing
  // anilist-sync helpers and gives us a single place to reason about
  // AniList rate limits (90 req/min — one user import is one GraphQL
  // call, well under).
  fromAnilist: protectedProcedure
    .input(z.object({ username: z.string().min(1).max(40) }))
    .mutation(async ({ ctx, input }) => {
      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'user row missing' });
      }

      const res = await fetch(ANILIST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query: MEDIA_LIST_QUERY, variables: { name: input.username } }),
      });
      if (!res.ok) {
        // 404 = unknown username; surface that as a clear client message.
        if (res.status === 404) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'AniList user not found' });
        }
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `AniList responded ${res.status}`,
        });
      }
      const json = (await res.json()) as {
        data?: AnilistMediaListResponse;
        errors?: Array<{ message: string }>;
      };
      if (json.errors && json.errors.length > 0) {
        // AniList returns "User not found" as a GraphQL error rather than
        // an HTTP 404. Map that to a clean NOT_FOUND.
        const msg = json.errors.map((e) => e.message).join('; ');
        if (msg.toLowerCase().includes('not found')) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'AniList user not found' });
        }
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: msg });
      }
      if (!json.data) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const collection = json.data.MediaListCollection;
      const scoreFormat = collection.user?.mediaListOptions.scoreFormat ?? 'POINT_10';
      const allEntries = collection.lists.flatMap((l) => l.entries);

      // Look up titles by AniList mediaId in one IN-list query.
      const mediaIds = allEntries.map((e) => String(e.mediaId));
      if (mediaIds.length === 0) {
        return { imported: 0, skipped: 0, total: 0 };
      }
      const titleRows = await ctx.db
        .select({ id: titles.id, externalId: titles.externalId })
        .from(titles)
        .where(and(eq(titles.source, 'anilist')));
      // Build a lookup map; filter to just the IDs we need.
      const idByExternalId = new Map<string, string>();
      const wantedSet = new Set(mediaIds);
      for (const row of titleRows) {
        if (wantedSet.has(row.externalId)) idByExternalId.set(row.externalId, row.id);
      }

      let imported = 0;
      let skipped = 0;
      for (const entry of allEntries) {
        const ourTitleId = idByExternalId.get(String(entry.mediaId));
        if (!ourTitleId) {
          skipped += 1;
          continue;
        }
        const status = ANILIST_STATUS_MAP[entry.status];
        if (!status) {
          skipped += 1;
          continue;
        }
        const rating = normaliseAnilistScore(entry.score, scoreFormat);
        const currentEpisode = entry.progress > 0 ? entry.progress : null;

        // Upsert as 'tracking' kind. Don't clobber an existing anchor —
        // the user's anchor picks are deliberate and shouldn't be
        // overwritten by a bulk import.
        const [existing] = await ctx.db
          .select({ kind: watchEntries.kind })
          .from(watchEntries)
          .where(and(eq(watchEntries.userId, internalUserId), eq(watchEntries.titleId, ourTitleId)))
          .limit(1);

        if (existing?.kind === 'anchor') {
          // Existing anchor — preserve. Count as imported (we did the
          // work of finding+matching it) but don't write.
          imported += 1;
          continue;
        }

        await ctx.db
          .insert(watchEntries)
          .values({
            userId: internalUserId,
            titleId: ourTitleId,
            kind: 'tracking',
            status,
            rating,
            currentEpisode,
          })
          .onConflictDoUpdate({
            target: [watchEntries.userId, watchEntries.titleId],
            set: { status, rating, currentEpisode, updatedAt: new Date() },
          });
        imported += 1;
      }

      // Trigger personal rec recompute so the new ratings flow into the
      // user's taste vector at the next request (vs waiting for nightly
      // cron).
      if (imported > 0) {
        await inngest.send(recommendUserEvent.create({ userId: internalUserId }));
      }

      return { imported, skipped, total: allEntries.length };
    }),

  // Pre-parsed entries from a MAL XML file. The browser parses MAL's
  // <myanimelist><anime>...</anime></myanimelist> XML via DOMParser
  // and POSTs the normalised entries here. Title lookup is by
  // titles.id_mal (populated during the AniList sync — see chunk A).
  fromMal: protectedProcedure
    .input(
      z.object({
        entries: z
          .array(
            z.object({
              malId: z.number().int().positive(),
              status: z.enum(['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch']),
              rating: z.number().int().min(1).max(10).nullable(),
              currentEpisode: z.number().int().min(0).nullable(),
            }),
          )
          .max(10000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const internalUserId = await resolveInternalUserId(ctx.db, ctx.userId);
      if (!internalUserId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'user row missing' });
      }

      if (input.entries.length === 0) {
        return { imported: 0, skipped: 0, total: 0 };
      }

      // Lookup titles by id_mal in one query.
      const malIds = input.entries.map((e) => e.malId);
      const titleRows = await ctx.db
        .select({ id: titles.id, idMal: titles.idMal })
        .from(titles)
        .where(eq(titles.source, 'anilist'));
      const idByMalId = new Map<number, string>();
      const wantedSet = new Set(malIds);
      for (const row of titleRows) {
        if (row.idMal !== null && wantedSet.has(row.idMal)) {
          idByMalId.set(row.idMal, row.id);
        }
      }

      let imported = 0;
      let skipped = 0;
      for (const entry of input.entries) {
        const ourTitleId = idByMalId.get(entry.malId);
        if (!ourTitleId) {
          skipped += 1;
          continue;
        }

        const [existing] = await ctx.db
          .select({ kind: watchEntries.kind })
          .from(watchEntries)
          .where(and(eq(watchEntries.userId, internalUserId), eq(watchEntries.titleId, ourTitleId)))
          .limit(1);

        if (existing?.kind === 'anchor') {
          imported += 1;
          continue;
        }

        await ctx.db
          .insert(watchEntries)
          .values({
            userId: internalUserId,
            titleId: ourTitleId,
            kind: 'tracking',
            status: entry.status,
            rating: entry.rating,
            currentEpisode: entry.currentEpisode,
          })
          .onConflictDoUpdate({
            target: [watchEntries.userId, watchEntries.titleId],
            set: {
              status: entry.status,
              rating: entry.rating,
              currentEpisode: entry.currentEpisode,
              updatedAt: new Date(),
            },
          });
        imported += 1;
      }

      if (imported > 0) {
        await inngest.send(recommendUserEvent.create({ userId: internalUserId }));
      }

      return { imported, skipped, total: input.entries.length };
    }),
});
