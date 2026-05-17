import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';
import { isOldEnough, thresholdFor } from '@/lib/age-gate';

const schema = z.object({
  birthDate: z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), 'Invalid date'),
  region: z.enum(['eu', 'row']),
  // ISO-3166-1 alpha-2. Validated shape-only here; we don't gate on
  // "is this a real country" because both the Vercel IP-default
  // (x-vercel-ip-country) and the static dropdown list produce valid
  // codes. Optional during the rollout so cached older-client bundles
  // still work; the cold-start research handoff treats country as
  // SHOULD-ASK rather than MUST-ASK.
  country: z
    .string()
    .regex(/^[A-Z]{2}$/, 'Invalid country code')
    .optional(),
});

// POST /api/age-verify
// Per ADR-0012 §5: validates birth date against regional threshold, writes
// only the fact of verification (no birth date stored). Self-declared region
// is the legal shield; misrepresentation transfers risk to the user.
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    // Malformed JSON body — surface as a 400 rather than throwing.
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const birthDate = new Date(parsed.data.birthDate);
  const isEU = parsed.data.region === 'eu';

  if (!isOldEnough(birthDate, isEU)) {
    return NextResponse.json(
      {
        error: `You must be ${thresholdFor(isEU)} or older to use HelpME2C${isEU ? ' in the EU' : ''}.`,
      },
      { status: 403 },
    );
  }

  const client = await clerkClient();
  // Preserve other public_metadata fields (dbSynced, future additions) by
  // reading existing metadata first and merging — Clerk's updateUser
  // replaces publicMetadata wholesale.
  const existing = await client.users.getUser(userId);
  await client.users.updateUser(userId, {
    publicMetadata: {
      ...existing.publicMetadata,
      ageVerified: true,
      ageVerifiedAt: new Date().toISOString(),
      region: parsed.data.region,
      ...(parsed.data.country ? { country: parsed.data.country } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
