import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateTeamCode } from '@/lib/auth/credentials';

const createTeamSchema = z.object({
  eventId: z.string().uuid(),
  teamName: z.string().trim().min(2, 'Team name must be at least 2 characters').max(60),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.status === 401 ? 'Unauthorized' : 'Forbidden' }, { status: auth.status });
  }

  const parsed = createTeamSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const teamCode = generateTeamCode();

  const { data: team, error: teamError } = await adminClient
    .from('teams')
    .insert({
      event_id: parsed.data.eventId,
      team_name: parsed.data.teamName,
      team_code: teamCode,
      is_active: true,
    })
    .select('id, event_id, team_name, team_code, is_active, created_at')
    .single();

  if (teamError) {
    return NextResponse.json({ error: 'Failed to save team to database.' }, { status: 500 });
  }

  await adminClient.from('admin_activity_logs').insert({
    admin_user_id: auth.user.id,
    event_id: parsed.data.eventId,
    action: 'TEAM_CREATED',
    entity_type: 'team',
    entity_id: team.id,
    details: { team_name: team.team_name, team_code: teamCode },
  });

  return NextResponse.json({ team }, { status: 201 });
}