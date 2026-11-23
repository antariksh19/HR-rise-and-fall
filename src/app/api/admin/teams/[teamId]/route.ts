import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateSecurePassword } from '@/lib/auth/credentials';

const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('rename'), teamName: z.string().trim().min(2).max(60) }),
  z.object({ action: z.literal('reset_password') }),
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
    .select('id, event_id, team_name, team_code, auth_user_id, is_active')
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
      .select('id, event_id, team_name, team_code, is_active, has_voted, created_at')
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

  // 2. Reset Team Password
  if (parsed.data.action === 'reset_password') {
    if (!team.auth_user_id || !team.is_active) {
      return NextResponse.json({ error: 'Cannot reset credentials for an archived team.' }, { status: 400 });
    }

    const newPassword = generateSecurePassword(12);
    const { error } = await adminClient.auth.admin.updateUserById(team.auth_user_id, {
      password: newPassword,
    });

    if (error) return NextResponse.json({ error: 'Failed to reset team password.' }, { status: 500 });

    await adminClient.from('admin_activity_logs').insert({
      admin_user_id: auth.user.id,
      event_id: team.event_id,
      action: 'CREDENTIALS_RESET',
      entity_type: 'team',
      entity_id: team.id,
      details: { team_code: team.team_code },
    });

    return NextResponse.json({
      teamName: team.team_name,
      credentials: { loginId: team.team_code, password: newPassword },
    });
  }

  // 3. Archive (Soft-Disable) Team
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

    if (team.auth_user_id) {
      await adminClient.auth.admin.updateUserById(team.auth_user_id, {
        ban_duration: '876000h',
      });
    }

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

  // 4. Unarchive (Restore) Team
  if (parsed.data.action === 'unarchive') {
    const { data: restored, error } = await adminClient
      .from('teams')
      .update({
        is_active: true,
        archived_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', teamId)
      .select('id, event_id, team_name, team_code, is_active, has_voted, created_at')
      .single();

    if (error) return NextResponse.json({ error: 'Failed to unarchive team.' }, { status: 500 });

    if (team.auth_user_id) {
      await adminClient.auth.admin.updateUserById(team.auth_user_id, {
        ban_duration: 'none',
      });
    }

    // Re-validate any previously cast vote if the target team is still active
    const { data: existingVote } = await adminClient
      .from('votes')
      .select('id, target_team_id')
      .eq('event_id', team.event_id)
      .eq('voter_team_id', teamId)
      .maybeSingle();

    if (existingVote) {
      const { data: targetTeam } = await adminClient
        .from('teams')
        .select('is_active')
        .eq('id', existingVote.target_team_id)
        .single();

      if (targetTeam?.is_active) {
        await adminClient
          .from('votes')
          .update({ status: 'valid' })
          .eq('id', existingVote.id);
      }
    }

    await adminClient.rpc('sync_event_metrics', { p_event_id: team.event_id });

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

  // 5. Permanently Delete Team
  if (parsed.data.action === 'delete_permanent') {
    // Unlock any voter whose vote was cast toward this deleted team
    const { data: incomingVotes } = await adminClient
      .from('votes')
      .select('voter_team_id')
      .eq('target_team_id', teamId);

    if (incomingVotes && incomingVotes.length > 0) {
      const voterIds = incomingVotes.map((v) => v.voter_team_id);
      await adminClient
        .from('teams')
        .update({ has_voted: false, updated_at: new Date().toISOString() })
        .in('id', voterIds);
    }

    // Remove all vote records referencing this team (satisfies ON DELETE RESTRICT)
    await adminClient
      .from('votes')
      .delete()
      .or(`voter_team_id.eq.${teamId},target_team_id.eq.${teamId}`);

    const { error: delError } = await adminClient
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (delError) {
      return NextResponse.json({ error: 'Failed to permanently delete team.' }, { status: 500 });
    }

    if (team.auth_user_id) {
      await adminClient.auth.admin.deleteUser(team.auth_user_id);
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