import { createAdminClient } from '@/lib/supabase/admin';
import { AudienceVotingDashboard } from '@/components/voting/AudienceVotingDashboard';
import type { EventRecord, TeamRecord } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AudienceVotePage() {
  const adminClient = createAdminClient();

  const { data: currentEvent } = await adminClient
    .from('events')
    .select('*')
    .eq('is_current', true)
    .maybeSingle();

  if (!currentEvent) {
    return (
      <main className="broadcast-grain flex min-h-dvh items-center justify-center bg-[#09090B] p-8 text-center font-mono text-xs uppercase tracking-[0.22em] text-[#8E8E93]">
        NO ACTIVE EVENT CONFIGURED YET.
      </main>
    );
  }

  const { data: teams } = await adminClient
    .from('teams')
    .select('id, event_id, team_name, team_code, is_active, created_at')
    .eq('event_id', currentEvent.id)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  return (
    <AudienceVotingDashboard
      initialEvent={currentEvent as EventRecord}
      initialTeams={(teams ?? []) as TeamRecord[]}
    />
  );
}