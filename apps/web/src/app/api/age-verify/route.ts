import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { z } from 'zod';
import { isOldEnough, thresholdFor } from '@/lib/age-gate';

const schema = z.object({
  birthDate: z.string().refine((s) => !Number.isNaN(new Date(s).getTime()), 'Invalid date'),
  region: z.enum(['eu', 'row']),
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
  await client.users.updateUser(userId, {
    publicMetadata: {
      ageVerified: true,
      ageVerifiedAt: new Date().toISOString(),
      region: parsed.data.region,
    },
  });

  return NextResponse.json({ ok: true });
}
