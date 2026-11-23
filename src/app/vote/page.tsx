import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TeamVotingDashboard } from '@/components/voting/TeamVotingDashboard';
import type { EventRecord, TeamRecord } from '@/types/database';

export default async function TeamVotePage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const adminClient = createAdminClient();

  // Look up the team bound strictly to this authenticated session
  const { data: currentTeam } = await adminClient
    .from('teams')
    .select('id, event_id, team_name, team_code, is_active, has_voted, created_at')
    .eq('auth_user_id', user.id)
    .single();

  if (!currentTeam || !currentTeam.is_active) {
    redirect('/login');
  }

  const { data: event } = await adminClient
    .from('events')
    .select('*')
    .eq('id', currentTeam.event_id)
    .single();

  if (!event) redirect('/');

  const { data: activeTeams } = await adminClient
    .from('teams')
    .select('id, event_id, team_name, team_code, is_active, created_at')
    .eq('event_id', event.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  return (
    <TeamVotingDashboard
      initialEvent={event as EventRecord}
      initialTeams={(activeTeams ?? []) as TeamRecord[]}
      currentTeam={currentTeam as TeamRecord & { has_voted: boolean }}
    />
  );
}