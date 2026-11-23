import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateSecurePassword, generateTeamCode, teamCodeToEmail } from '@/lib/auth/credentials';

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
  const plainPassword = generateSecurePassword(12);

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email: teamCodeToEmail(teamCode),
    password: plainPassword,
    email_confirm: true,
    user_metadata: { role: 'team', team_code: teamCode },
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'Failed to provision team login account.' }, { status: 500 });
  }

  const { data: team, error: teamError } = await adminClient
    .from('teams')
    .insert({
      event_id: parsed.data.eventId,
      team_name: parsed.data.teamName,
      team_code: teamCode,
      auth_user_id: authData.user.id,
      is_active: true,
    })
    .select('id, event_id, team_name, team_code, is_active, has_voted, created_at')
    .single();

  if (teamError) {
    await adminClient.auth.admin.deleteUser(authData.user.id);
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

  return NextResponse.json(
    {
      team,
      credentials: { loginId: teamCode, password: plainPassword },
    },
    { status: 201 }
  );
}