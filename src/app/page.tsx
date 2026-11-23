import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PublicDashboard } from '@/components/teams/PublicDashboard';
import type { EventRecord, TeamRecord } from '@/types/database';

export default async function HomePage() {
  const supabase = await createServerSupabaseClient();

  const [{ data: currentEvent }, { count: archiveCount }] = await Promise.all([
    supabase.from('events').select('*').eq('is_current', true).maybeSingle(),
    supabase.from('results_snapshots').select('id', { count: 'exact', head: true }),
  ]);

  let teams: TeamRecord[] = [];
  if (currentEvent) {
    const { data } = await supabase
      .from('teams')
      .select('id, event_id, team_name, team_code, is_active, created_at')
      .eq('event_id', currentEvent.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    teams = (data ?? []) as TeamRecord[];
  }

  return (
    <PublicDashboard
      initialEvent={(currentEvent as EventRecord) ?? null}
      initialTeams={teams}
      hasArchives={(archiveCount ?? 0) > 0}
    />
  );
}