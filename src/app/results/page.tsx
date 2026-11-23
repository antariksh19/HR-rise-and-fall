import Link from 'next/link';
import { Trophy, Calendar, Users, ArrowLeft, ArrowRight, Archive } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import type { ResultsSnapshot } from '@/types/database';

export default async function ResultsArchivePage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('results_snapshots')
    .select('*')
    .order('completed_at', { ascending: false });

  const snapshots = (data ?? []) as ResultsSnapshot[];

  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-10 px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-amber-400"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Event Dashboard
          </Link>
          <h1 className="text-4xl font-black tracking-tight text-white">Results Archive</h1>
          <p className="mt-1 text-slate-400">
            Official permanent record of completed HR RISE AND FALL results.
          </p>
        </div>
      </div>

      {snapshots.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 p-16 text-center">
          <Archive className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <h2 className="text-xl font-bold text-white">No Archived Results Yet</h2>
          <p className="mt-2 text-sm text-slate-400">
            Final results will appear here permanently once the reveal sequence is completed.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {snapshots.map((snap) => {
            const winners = snap.top_three.filter((t) => t.rank === 1);
            const second = snap.top_three.filter((t) => t.rank === 2);
            const third = snap.top_three.filter((t) => t.rank === 3);

            return (
              <div
                key={snap.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl transition hover:border-amber-500/40"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-2xl font-black text-white">{snap.event_name}</h2>
                      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(snap.event_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">
                      {snap.voting_completion_percentage}% Voted
                    </span>
                  </div>

                  {/* Top 3 Summary */}
                  <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 font-bold text-amber-400">
                        <Trophy className="h-4 w-4" /> 1st Place
                      </span>
                      <span className="font-bold text-white">
                        {winners.map((w) => w.team_name).join(' & ') || '—'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span>2nd Place</span>
                      <span>{second.map((s) => s.team_name).join(' & ') || '—'}</span>
                    </div>
                    <div className="flex items-center justify-between text-amber-600">
                      <span>3rd Place</span>
                      <span>{third.map((t) => t.team_name).join(' & ') || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-4">
                  <span className="inline-flex items-center gap-2 text-xs text-slate-400">
                    <Users className="h-4 w-4" /> {snap.participating_team_count} Teams •{' '}
                    {snap.valid_vote_count} Valid Votes
                  </span>
                  <Link href={`/results/${snap.event_id}`}>
                    <Button
                      size="sm"
                      className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
                    >
                      View Full Results <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}