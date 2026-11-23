import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Trophy, Calendar, CheckCircle2 } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { TopThreeChart } from '@/components/results/TopThreeChart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ResultsSnapshot } from '@/types/database';

export default async function ArchivedEventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from('results_snapshots')
    .select('*')
    .eq('event_id', eventId)
    .single();

  if (!data) notFound();

  const snap = data as ResultsSnapshot;
  const winners = snap.top_three.filter((t) => t.rank === 1);
  const second = snap.top_three.filter((t) => t.rank === 2);
  const third = snap.top_three.filter((t) => t.rank === 3);

  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-12 px-4 py-12">
      {/* Header */}
      <div className="space-y-4 border-b border-slate-800 pb-6">
        <Link
          href="/results"
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-amber-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Results Archive
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-400">
              Official Archived Record
            </p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-white">
              {snap.event_name}
            </h1>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {new Date(snap.event_date).toLocaleDateString()}
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Finalized {new Date(snap.completed_at).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Winner Banner & Podium */}
      <section className="space-y-6 text-center">
        <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-500/15 to-slate-950 p-8 shadow-[0_0_50px_rgba(245,158,11,0.15)]">
          <Trophy className="mx-auto mb-3 h-12 w-12 text-amber-400" />
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-400">
            Competition Winner
          </p>
          <h2 className="mt-2 text-4xl font-black text-white sm:text-5xl">
            {winners.map((w) => w.team_name).join(' & ') || '—'}
          </h2>
          {winners[0] && (
            <p className="mt-2 font-mono text-lg text-amber-300">
              {winners[0].votes} {winners[0].votes === 1 ? 'Valid Vote' : 'Valid Votes'}
              {winners[0].is_tied ? ' (Tied)' : ''}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-5">
            <p className="text-xs font-bold uppercase text-slate-400">2nd Place</p>
            <p className="mt-2 text-xl font-black text-white">
              {second.map((s) => s.team_name).join(' & ') || '—'}
            </p>
            {second[0] && (
              <p className="mt-1 font-mono text-xs text-slate-400">{second[0].votes} votes</p>
            )}
          </div>

          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-5">
            <p className="text-xs font-bold uppercase text-amber-400">1st Place</p>
            <p className="mt-2 text-xl font-black text-white">
              {winners.map((w) => w.team_name).join(' & ') || '—'}
            </p>
            {winners[0] && (
              <p className="mt-1 font-mono text-xs text-amber-300">{winners[0].votes} votes</p>
            )}
          </div>

          <div className="rounded-xl border border-amber-800/60 bg-amber-950/30 p-5">
            <p className="text-xs font-bold uppercase text-amber-600">3rd Place</p>
            <p className="mt-2 text-xl font-black text-white">
              {third.map((t) => t.team_name).join(' & ') || '—'}
            </p>
            {third[0] && (
              <p className="mt-1 font-mono text-xs text-amber-500">{third[0].votes} votes</p>
            )}
          </div>
        </div>
      </section>

      {/* Top Three Bar Chart */}
      <section className="space-y-4">
        <h3 className="text-xl font-black text-white">Top Three Vote Distribution</h3>
        <TopThreeChart topThree={snap.top_three} />
      </section>

      {/* Participation Stats */}
      <section className="grid grid-cols-3 gap-4 text-center">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-3xl font-black text-white">{snap.participating_team_count}</p>
          <p className="mt-1 text-xs uppercase text-slate-400">Active Teams</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-3xl font-black text-emerald-400">{snap.valid_vote_count}</p>
          <p className="mt-1 text-xs uppercase text-slate-400">Total Valid Votes</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="text-3xl font-black text-amber-400">
            {snap.voting_completion_percentage}%
          </p>
          <p className="mt-1 text-xs uppercase text-slate-400">Completion Rate</p>
        </div>
      </section>

      {/* Complete Rankings Table */}
      <section className="space-y-4">
        <h3 className="text-xl font-black text-white">Complete Final Rankings</h3>
        <div className="rounded-xl border border-slate-800 bg-slate-950/70">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead>Rank</TableHead>
                <TableHead>Team Name</TableHead>
                <TableHead>Team Code</TableHead>
                <TableHead className="text-right">Votes Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snap.final_rankings.map((team) => (
                <TableRow key={team.team_id} className="border-slate-800">
                  <TableCell className="font-mono font-bold text-amber-400">
                    #{team.rank} {team.is_tied ? '(Tied)' : ''}
                  </TableCell>
                  <TableCell className="font-semibold text-white">{team.team_name}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-400">
                    {team.team_code}
                  </TableCell>
                  <TableCell className="text-right font-mono text-base font-black text-white">
                    {team.votes}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </main>
  );
}