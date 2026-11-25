import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('rename'), teamName: z.string().trim().min(2).max(60) }),
  z.object({ action: z.literal('archive') }),
  z.object({ action: z.literal('unarchive') }),
  z.object({ action: z.literal('delete_permanent') }),
]);

export async function PATCH(
  req: Request,
  context: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  }

  const { teamId } = await context.params;
  const parsed = actionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: team } = await adminClient
    .from('teams')
    .select('id, event_id, team_name, team_code, is_active')
    .eq('id', teamId)
    .single();

  if (!team) {
    return NextResponse.json({ error: 'Team not found.' }, { status: 404 });
  }

  // 1. Rename Team
  if (parsed.data.action === 'rename') {
    const { data: updated, error } = await adminClient
      .from('teams')
      .update({ team_name: parsed.data.teamName, updated_at: new Date().toISOString() })
      .eq('id', teamId)
      .select('id, event_id, team_name, team_code, is_active, created_at')
      .single();

    if (error) return NextResponse.json({ error: 'Failed to update team name.' }, { status: 500 });

    await adminClient.from('admin_activity_logs').insert({
      admin_user_id: auth.user.id,
      event_id: team.event_id,
      action: 'TEAM_EDITED',
      entity_type: 'team',
      entity_id: team.id,
      details: { previous_name: team.team_name, new_name: parsed.data.teamName },
    });

    return NextResponse.json({ team: updated });
  }

  // Archive (Soft-Disable) Team
  if (parsed.data.action === 'archive') {
    const { error } = await adminClient
      .from('teams')
      .update({
        is_active: false,
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamId);

    if (error) return NextResponse.json({ error: 'Failed to archive team.' }, { status: 500 });

    await adminClient.from('admin_activity_logs').insert({
      admin_user_id: auth.user.id,
      event_id: team.event_id,
      action: 'TEAM_ARCHIVED',
      entity_type: 'team',
      entity_id: team.id,
      details: { team_name: team.team_name, team_code: team.team_code },
    });

    return NextResponse.json({ archived: true, teamId });
  }

  // Unarchive (Restore) Team
  if (parsed.data.action === 'unarchive') {
    const { data: restored, error } = await adminClient
      .from('teams')
      .update({
        is_active: true,
        archived_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamId)
      .select('id, event_id, team_name, team_code, is_active, created_at')
      .single();

    if (error) return NextResponse.json({ error: 'Failed to unarchive team.' }, { status: 500 });

    await adminClient.from('admin_activity_logs').insert({
      admin_user_id: auth.user.id,
      event_id: team.event_id,
      action: 'TEAM_UNARCHIVED',
      entity_type: 'team',
      entity_id: team.id,
      details: { team_name: team.team_name, team_code: team.team_code },
    });

    return NextResponse.json({ team: restored });
  }

  // Permanently Delete Team
  if (parsed.data.action === 'delete_permanent') {
    const { error: targetVotesError } = await adminClient
      .from('votes')
      .delete()
      .eq('target_team_id', teamId);
    if (targetVotesError) {
      return NextResponse.json({ error: 'Failed to remove votes for this team.' }, { status: 500 });
    }

    const { error: voterVotesError } = await adminClient
      .from('votes')
      .delete()
      .eq('voter_team_id', teamId);
    if (voterVotesError) {
      return NextResponse.json({ error: 'Failed to remove votes cast by this team.' }, { status: 500 });
    }

    const { error: delError } = await adminClient
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (delError) {
      return NextResponse.json({ error: 'Failed to permanently delete team.' }, { status: 500 });
    }

    await adminClient.from('admin_activity_logs').insert({
      admin_user_id: auth.user.id,
      event_id: team.event_id,
      action: 'TEAM_DELETED_PERMANENTLY',
      entity_type: 'team',
      entity_id: team.id,
      details: { team_name: team.team_name, team_code: team.team_code },
    });

    return NextResponse.json({ deleted: true, teamId });
  }

  return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
}