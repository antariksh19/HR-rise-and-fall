import { createServerSupabaseClient } from '@/lib/supabase/server';
import { EventHallDisplay } from '@/components/display/EventHallDisplay';
import type { EventRecord, TeamRecord } from '@/types/database';

export default async function DisplayPage() {
  const supabase = await createServerSupabaseClient();

  const { data: currentEvent } = await supabase
    .from('events')
    .select('*')
    .eq('is_current', true)
    .maybeSingle();

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
    <EventHallDisplay
      initialEvent={(currentEvent as EventRecord) ?? null}
      initialTeams={teams}
    />
  );
}