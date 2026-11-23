import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Monitor, ExternalLink } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { TeamManager, AdminTeamRow } from '@/components/admin/TeamManager';
import { VotingControls } from '@/components/admin/VotingControls';
import { VoteMonitorTable, VoteRecordRow } from '@/components/admin/VoteMonitorTable';
import { AdminRealtimeSync } from '@/components/admin/AdminRealtimeSync';
import { RevealControls } from '@/components/admin/RevealControls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <main className="mx-auto max-w-4xl p-8 text-center">
        <h1 className="text-2xl font-bold">No Active Event Found</h1>
        <p className="mt-2 text-slate-400">
          Seed an event with is_current = true in Supabase.
        </p>
      </main>
    );
  }

  const [{ data: teams }, { data: rawVotes }, { data: computedRankings }] = await Promise.all([
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
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-6 lg:flex-row lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
            Admin Control Panel
          </p>
          <h1 className="text-3xl font-black tracking-tight text-white">
            {currentEvent.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span>Signed in as {auth.admin.email}</span>
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1 text-amber-400 hover:underline"
            >
              Public Dashboard <ExternalLink className="h-3 w-3" />
            </Link>
            <Link
              href="/display"
              target="_blank"
              className="inline-flex items-center gap-1 text-amber-400 hover:underline"
            >
              <Monitor className="h-3 w-3" /> Event Hall Display
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AdminRealtimeSync eventId={currentEvent.id} />
          <VotingControls event={currentEvent as EventRecord} />
        </div>
      </header>

      {/* Summary Cards */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-slate-400">Active Teams</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-black text-white">
            {currentEvent.active_team_count}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-slate-400">Teams Voted</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-black text-emerald-400">
            {currentEvent.valid_vote_count}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-slate-400">Completion</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-black text-amber-400">
            {completionPct}%
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-slate-400">Event Status</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-bold uppercase text-white">
            {currentEvent.status.replace('_', ' ')}
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="teams" className="space-y-6">
        <TabsList className="bg-slate-900">
          <TabsTrigger value="teams">Teams &amp; Credentials</TabsTrigger>
          <TabsTrigger value="votes">Vote Monitor ({voteRows.length})</TabsTrigger>
          <TabsTrigger value="reveal">Reveal &amp; Archive</TabsTrigger>
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
      </Tabs>
    </main>
  );
}