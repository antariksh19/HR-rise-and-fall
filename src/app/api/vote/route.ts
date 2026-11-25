import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

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
  isStandardizedIos: z.boolean().optional().default(false),
});

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown-ip';
}

function normalizeContact(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (trimmed.includes('@')) {
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
    return emailOk ? `email:${trimmed}` : null;
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return null;
  // Normalize last 10 digits so +91 9876543210 and 9876543210 match identically
  return `phone:${digits.slice(-10)}`;
}

function hashValue(eventId: string, namespace: string, raw: string): string {
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 16) || 'hr-rf-salt';
  return crypto
    .createHash('sha256')
    .update(`${salt}:${eventId}:${namespace}:${raw}`)
    .digest('hex');
}

/** Check if this device has already voted in the current event */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('eventId');
  const clientDeviceId = searchParams.get('deviceId');
  const fingerprint = searchParams.get('fingerprint');
  const hardwareSignature = searchParams.get('hardwareSignature');
  const isStandardizedIos = searchParams.get('isStandardizedIos') === '1';

  if (!eventId) {
    return NextResponse.json({ hasVoted: false });
  }

  const cookieStore = await cookies();
  const cookieDeviceId = cookieStore.get(DEVICE_COOKIE_NAME)?.value;
  const deviceIds = [cookieDeviceId, clientDeviceId].filter(Boolean) as string[];
  const fpHash = fingerprint ? hashValue(eventId, 'fp', fingerprint) : null;
  const clientIp = getClientIp(req);
  const crossBrowserHash =
    !isStandardizedIos && hardwareSignature
      ? hashValue(eventId, 'xb', `${clientIp}|${hardwareSignature}`)
      : null;

  const adminClient = createAdminClient();
  let hasVoted = false;

  if (deviceIds.length > 0) {
    const { data } = await adminClient
      .from('votes')
      .select('id')
      .eq('event_id', eventId)
      .eq('status', 'valid')
      .in('device_id', deviceIds)
      .limit(1);
    if (data && data.length > 0) hasVoted = true;
  }

  if (!hasVoted && fpHash) {
    const { data } = await adminClient
      .from('votes')
      .select('id')
      .eq('event_id', eventId)
      .eq('status', 'valid')
      .eq('device_fingerprint_hash', fpHash)
      .limit(1);
    if (data && data.length > 0) hasVoted = true;
  }

  if (!hasVoted && crossBrowserHash) {
    const { data } = await adminClient
      .from('votes')
      .select('id')
      .eq('event_id', eventId)
      .eq('status', 'valid')
      .eq('cross_browser_hash', crossBrowserHash)
      .limit(1);
    if (data && data.length > 0) hasVoted = true;
  }

  return NextResponse.json({ hasVoted });
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

  if (eventErr || !currentEvent) {
    return NextResponse.json({ error: 'No active event found.' }, { status: 404 });
  }

  if (currentEvent.status !== 'voting_live') {
    return NextResponse.json(
      { error: 'Audience voting is not currently open.' },
      { status: 403 }
    );
  }

  const { data: targetTeam } = await adminClient
    .from('teams')
    .select('id, team_name')
    .eq('id', parsed.data.targetTeamId)
    .eq('event_id', currentEvent.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!targetTeam) {
    return NextResponse.json(
      { error: 'Selected team is not eligible for voting.' },
      { status: 400 }
    );
  }

  const cookieStore = await cookies();
  const existingCookieId = cookieStore.get(DEVICE_COOKIE_NAME)?.value;
  const canonicalDeviceId = existingCookieId || parsed.data.deviceId;
  const fpHash = hashValue(currentEvent.id, 'fp', parsed.data.fingerprint);
  const contactHash = hashValue(currentEvent.id, 'contact', normalizedContact);
  const clientIp = getClientIp(req);

  // Skip raw IP+hardware lock only on standardized iOS devices to prevent venue Wi-Fi collisions
  const crossBrowserHash = parsed.data.isStandardizedIos
    ? null
    : hashValue(currentEvent.id, 'xb', `${clientIp}|${parsed.data.hardwareSignature}`);

  const orFilters = [
    `device_id.eq.${canonicalDeviceId}`,
    `device_fingerprint_hash.eq.${fpHash}`,
    `voter_contact_hash.eq.${contactHash}`,
  ];
  if (crossBrowserHash) {
    orFilters.push(`cross_browser_hash.eq.${crossBrowserHash}`);
  }

  const { data: existingVote } = await adminClient
    .from('votes')
    .select('id')
    .eq('event_id', currentEvent.id)
    .eq('status', 'valid')
    .or(orFilters.join(','))
    .limit(1);

  if (existingVote && existingVote.length > 0) {
    return NextResponse.json(
      { error: 'A vote has already been recorded from this device or phone/email.' },
      { status: 409 }
    );
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
    if (insertErr.code === '23505') {
      return NextResponse.json(
        { error: 'A vote has already been recorded from this device or phone/email.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to record vote. Please try again.' },
      { status: 500 }
    );
  }

  const { count } = await adminClient
    .from('votes')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', currentEvent.id)
    .eq('status', 'valid');

  if (typeof count === 'number') {
    await adminClient
      .from('events')
      .update({ valid_vote_count: count })
      .eq('id', currentEvent.id);
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