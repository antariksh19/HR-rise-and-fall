import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isIP } from 'node:net';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { hashVoteIdentity, normalizeContact } from '@/lib/voting/identity';

const DEVICE_COOKIE_NAME = 'hr_rf_device_id';

const voteSchema = z.object({
  targetTeamId: z.string().uuid('Invalid team selection.'),
  voterName: z
    .string()
    .trim()
    .min(2, 'Please enter your name (at least 2 characters).')
    .max(60, 'Name must be under 60 characters.'),
  voterContact: z
    .string()
    .trim()
    .min(5, 'Please enter a valid phone number or email.')
    .max(100, 'Contact value is too long.'),
  deviceId: z.string().min(6).max(128),
  fingerprint: z.string().min(8).max(128),
  hardwareSignature: z.string().min(8).max(128),
});

function getClientIp(req: Request): string | null {
  if (process.env.NODE_ENV !== 'production') {
    return '127.0.0.1';
  }

  const candidates = [
    req.headers.get('x-real-ip'),
    req.headers.get('x-vercel-forwarded-for'),
    req.headers.get('x-forwarded-for'),
  ];

  for (const header of candidates) {
    const candidate = header
      ?.split(',')
      .map((value) => value.trim())
      .find((value) => isIP(value));
    if (candidate) return candidate;
  }

  return null;
}

function isStandardizedIosRequest(req: Request): boolean {
  const userAgent = req.headers.get('user-agent') || '';
  const platform = req.headers.get('sec-ch-ua-platform') || '';
  return /iphone|ipad|ipod/i.test(userAgent) || /^"?iOS"?$/i.test(platform);
}

async function findExistingVote(
  eventId: string,
  identities: Array<{ column: string; value: string | null }>
): Promise<boolean> {
  const adminClient = createAdminClient();
  for (const identity of identities) {
    if (!identity.value) continue;
    const { data, error } = await adminClient
      .from('votes')
      .select('id')
      .eq('event_id', eventId)
      .eq('status', 'valid')
      .eq(identity.column, identity.value)
      .limit(1);
    if (error) throw new Error('Failed to check vote eligibility.');
    if (data?.length) return true;
  }
  return false;
}

/** Check if this device has already voted in the current event */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const parsedQuery = z
    .object({
      eventId: z.string().uuid(),
      deviceId: z.string().min(6).max(128).optional(),
      fingerprint: z.string().min(8).max(128).optional(),
      hardwareSignature: z.string().min(8).max(128).optional(),
    })
    .safeParse({
      eventId: searchParams.get('eventId'),
      deviceId: searchParams.get('deviceId') || undefined,
      fingerprint: searchParams.get('fingerprint') || undefined,
      hardwareSignature: searchParams.get('hardwareSignature') || undefined,
    });

  if (!parsedQuery.success) {
    return NextResponse.json({ error: 'Invalid device verification request.' }, { status: 400 });
  }

  const { eventId, deviceId, fingerprint, hardwareSignature } = parsedQuery.data;
  const cookieStore = await cookies();
  const cookieDeviceId = cookieStore.get(DEVICE_COOKIE_NAME)?.value;
  const clientIp = getClientIp(req);
  const fpHash = fingerprint ? hashVoteIdentity(eventId, 'fp', fingerprint) : null;
  const crossBrowserHash =
    !isStandardizedIosRequest(req) && clientIp && hardwareSignature
      ? hashVoteIdentity(eventId, 'xb', `${clientIp}|${hardwareSignature}`)
      : null;

  try {
    const hasVoted = await findExistingVote(eventId, [
      { column: 'device_id', value: cookieDeviceId || null },
      { column: 'device_id', value: deviceId || null },
      { column: 'device_fingerprint_hash', value: fpHash },
      { column: 'cross_browser_hash', value: crossBrowserHash },
    ]);
    return NextResponse.json({ hasVoted });
  } catch {
    return NextResponse.json({ error: 'Unable to verify device eligibility.' }, { status: 500 });
  }
}

/** Cast an audience ballot (4-layer zero-error duplicate protection) */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = voteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid vote payload.' },
      { status: 400 }
    );
  }

  const normalizedContact = normalizeContact(parsed.data.voterContact);
  if (!normalizedContact) {
    return NextResponse.json(
      { error: 'Enter a valid 10-digit phone number or email address.' },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();

  const { data: currentEvent, error: eventErr } = await adminClient
    .from('events')
    .select('id, status')
    .eq('is_current', true)
    .single();

  if (eventErr && eventErr.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Unable to load the active event.' }, { status: 500 });
  }
  if (!currentEvent) {
    return NextResponse.json({ error: 'No active event found.' }, { status: 404 });
  }

  if (currentEvent.status !== 'voting_live') {
    return NextResponse.json(
      { error: 'Audience voting is not currently open.' },
      { status: 403 }
    );
  }

  const { data: targetTeam, error: targetErr } = await adminClient
    .from('teams')
    .select('id, team_name')
    .eq('id', parsed.data.targetTeamId)
    .eq('event_id', currentEvent.id)
    .eq('is_active', true)
    .maybeSingle();

  if (targetErr) {
    return NextResponse.json({ error: 'Unable to verify the selected team.' }, { status: 500 });
  }
  if (!targetTeam) {
    return NextResponse.json(
      { error: 'Selected team is not eligible for voting.' },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const existingCookieId = cookieStore.get(DEVICE_COOKIE_NAME)?.value;
  const canonicalDeviceId = existingCookieId || parsed.data.deviceId;
  const fpHash = hashVoteIdentity(currentEvent.id, 'fp', parsed.data.fingerprint);
  const contactHash = hashVoteIdentity(currentEvent.id, 'contact', normalizedContact);
  const clientIp = getClientIp(req);
  const isIos = isStandardizedIosRequest(req);

  const crossBrowserHash =
    !isIos && clientIp
      ? hashVoteIdentity(currentEvent.id, 'xb', `${clientIp}|${parsed.data.hardwareSignature}`)
      : null;

  try {
    const alreadyVoted = await findExistingVote(currentEvent.id, [
      { column: 'device_id', value: existingCookieId || null },
      { column: 'device_id', value: parsed.data.deviceId },
      { column: 'device_fingerprint_hash', value: fpHash },
      { column: 'cross_browser_hash', value: crossBrowserHash },
      { column: 'voter_contact_hash', value: contactHash },
    ]);
    if (alreadyVoted) {
      return NextResponse.json(
        { error: 'A vote has already been recorded from this device or phone/email.' },
        { status: 409 }
      );
    }
  } catch {
    return NextResponse.json({ error: 'Unable to verify vote eligibility.' }, { status: 500 });
  }

  const { error: insertErr } = await adminClient.from('votes').insert({
    event_id: currentEvent.id,
    voter_team_id: null,
    target_team_id: targetTeam.id,
    voter_name: parsed.data.voterName,
    voter_contact_hash: contactHash,
    device_id: canonicalDeviceId,
    device_fingerprint_hash: fpHash,
    cross_browser_hash: crossBrowserHash,
    voter_type: 'audience',
    status: 'valid',
  });

  if (insertErr) {
    if (insertErr.code === '23505' || insertErr.message.includes('VOTING_NOT_LIVE')) {
      return NextResponse.json(
        {
          error:
            insertErr.code === '23505'
              ? 'A vote has already been recorded from this device or phone/email.'
              : 'Audience voting has closed.',
        },
        { status: insertErr.code === '23505' ? 409 : 403 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to record vote. Please try again.' },
      { status: 500 }
    );
  }

  const response = NextResponse.json({
    voted: true,
    teamName: targetTeam.team_name,
    voterName: parsed.data.voterName,
  });

  response.cookies.set(DEVICE_COOKIE_NAME, canonicalDeviceId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}