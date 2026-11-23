import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Monitor, ArrowUpRight } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { TeamManager, AdminTeamRow } from '@/components/admin/TeamManager';
import { VotingControls } from '@/components/admin/VotingControls';
import { VoteMonitorTable, VoteRecordRow } from '@/components/admin/VoteMonitorTable';
import { AdminRealtimeSync } from '@/components/admin/AdminRealtimeSync';
import { RevealControls } from '@/components/admin/RevealControls';
import { AdminManager, AdminRow } from '@/components/admin/AdminManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { EventRecord, RankedTeam } from '@/types/database';

export default async function AdminDashboardPage() {
  const auth = await requireAdmin();
  if (!auth.authorized) redirect('/admin/login');

  const adminClient = createAdminClient();
  const { data: currentEvent } = await adminClient
    .from('events')
    .select('*')
    .eq('is_current', true)
    .single();

  if (!currentEvent) {
    return (
      <main className="mx-auto max-w-4xl p-12 text-center font-mono text-xs uppercase tracking-widest text-[#8E8E93]">
        NO ACTIVE EVENT FOUND. SEED AN EVENT WITH IS_CURRENT = TRUE IN SUPABASE.
      </main>
    );
  }

  const [{ data: teams }, { data: rawVotes }, { data: computedRankings }, { data: admins }] =
    await Promise.all([
      adminClient
        .from('teams')
        .select('id, event_id, team_name, team_code, is_active, has_voted, created_at')
        .eq('event_id', currentEvent.id)
        .order('created_at', { ascending: true }),
      adminClient
        .from('votes')
        .select('id, voter_team_id, target_team_id, status, created_at')
        .eq('event_id', currentEvent.id)
        .order('created_at', { ascending: false }),
      adminClient.rpc('compute_event_rankings', { p_event_id: currentEvent.id }),
      adminClient
        .from('admin_users')
        .select('user_id, email, display_name, created_at')
        .order('created_at', { ascending: true }),
    ]);

  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));
  const voteRows: VoteRecordRow[] = (rawVotes ?? []).map((v) => ({
    id: v.id,
    voter_name: teamMap.get(v.voter_team_id)?.team_name ?? 'Unknown',
    voter_code: teamMap.get(v.voter_team_id)?.team_code ?? '',
    target_name: teamMap.get(v.target_team_id)?.team_name ?? 'Unknown',
    target_code: teamMap.get(v.target_team_id)?.team_code ?? '',
    status: v.status,
    created_at: v.created_at,
  }));

  const completionPct =
    currentEvent.active_team_count > 0
      ? ((currentEvent.valid_vote_count / currentEvent.active_team_count) * 100).toFixed(1)
      : '0.0';

  return (
    <div className="min-h-screen bg-[#09090B] text-[#F4F2EC]">
      {/* Control Room Header */}
      <header className="border-b border-[#222226] bg-[#09090B]">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-4 px-6 py-6 lg:flex-row lg:items-center lg:px-10">
          <div>
            <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] uppercase tracking-[0.2em]">
              <span className="text-[#FF2E17]">● CONTROL ROOM</span>
              <span className="text-[#52525B]">/</span>
              <span className="text-[#8E8E93]">{auth.admin.email}</span>
            </div>
            <h1 className="mt-1 font-display text-4xl font-extrabold uppercase tracking-tight sm:text-5xl">
              {currentEvent.name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-5 font-mono text-[11px] uppercase tracking-[0.16em]">
              <Link
                href="/"
                target="_blank"
                className="inline-flex items-center gap-1 text-[#A1A1AA] transition-colors hover:text-[#F4F2EC]"
              >
                Public Stage <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/display"
                target="_blank"
                className="inline-flex items-center gap-1.5 text-[#A1A1AA] transition-colors hover:text-[#F4F2EC]"
              >
                <Monitor className="h-3.5 w-3.5" /> Event Hall Display
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <AdminRealtimeSync eventId={currentEvent.id} />
            <VotingControls event={currentEvent as EventRecord} />
          </div>
        </div>
      </header>

      {/* Hairline Telemetry Strip */}
      <section className="border-b border-[#222226] bg-[#0D0D10]">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-y divide-[#222226] lg:grid-cols-4 lg:divide-y-0">
          <div className="p-6 lg:px-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8E8E93]">
              ACTIVE TEAMS
            </p>
            <p className="mt-2 font-display text-5xl font-extrabold tabular-nums">
              {String(currentEvent.active_team_count).padStart(2, '0')}
            </p>
          </div>
          <div className="p-6 lg:px-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8E8E93]">
              BALLOTS CAST
            </p>
            <p className="mt-2 font-display text-5xl font-extrabold tabular-nums text-[#FF2E17]">
              {String(currentEvent.valid_vote_count).padStart(2, '0')}
            </p>
          </div>
          <div className="p-6 lg:px-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8E8E93]">
              COMPLETION
            </p>
            <p className="mt-2 font-display text-5xl font-extrabold tabular-nums">
              {completionPct}%
            </p>
          </div>
          <div className="p-6 lg:px-10">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8E8E93]">
              EVENT STATUS
            </p>
            <p className="mt-3 font-display text-3xl font-extrabold uppercase tracking-wide">
              {currentEvent.status.replace('_', ' ')}
            </p>
          </div>
        </div>
      </section>

      {/* Tabs Workspace */}
      <main className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">
        <Tabs defaultValue="teams" className="flex w-full flex-col gap-8">
          <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-b border-[#222226] bg-transparent p-0">
            <TabsTrigger
              value="teams"
              className="rounded-none border-b-2 border-transparent px-5 py-3.5 font-mono text-xs uppercase tracking-[0.16em] text-[#8E8E93] data-[state=active]:border-[#FF2E17] data-[state=active]:bg-transparent data-[state=active]:text-[#F4F2EC]"
            >
              Teams &amp; Credentials
            </TabsTrigger>
            <TabsTrigger
              value="votes"
              className="rounded-none border-b-2 border-transparent px-5 py-3.5 font-mono text-xs uppercase tracking-[0.16em] text-[#8E8E93] data-[state=active]:border-[#FF2E17] data-[state=active]:bg-transparent data-[state=active]:text-[#F4F2EC]"
            >
              Vote Monitor ({voteRows.length})
            </TabsTrigger>
            <TabsTrigger
              value="reveal"
              className="rounded-none border-b-2 border-transparent px-5 py-3.5 font-mono text-xs uppercase tracking-[0.16em] text-[#8E8E93] data-[state=active]:border-[#FF2E17] data-[state=active]:bg-transparent data-[state=active]:text-[#F4F2EC]"
            >
              Reveal &amp; Archive
            </TabsTrigger>
            <TabsTrigger
              value="admins"
              className="rounded-none border-b-2 border-transparent px-5 py-3.5 font-mono text-xs uppercase tracking-[0.16em] text-[#8E8E93] data-[state=active]:border-[#FF2E17] data-[state=active]:bg-transparent data-[state=active]:text-[#F4F2EC]"
            >
              Admins ({(admins ?? []).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="teams">
            <TeamManager
              eventId={currentEvent.id}
              initialTeams={(teams ?? []) as AdminTeamRow[]}
            />
          </TabsContent>

          <TabsContent value="votes">
            <VoteMonitorTable votes={voteRows} />
          </TabsContent>

          <TabsContent value="reveal">
            <RevealControls
              event={currentEvent as EventRecord}
              rankings={(computedRankings ?? []) as RankedTeam[]}
            />
          </TabsContent>

          <TabsContent value="admins">
            <AdminManager
              initialAdmins={(admins ?? []) as AdminRow[]}
              currentAdminId={auth.user.id}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}