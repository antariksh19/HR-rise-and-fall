import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ResultsSnapshot } from '@/types/database';

export default async function ResultsArchivePage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('results_snapshots')
    .select('*')
    .order('completed_at', { ascending: false });

  const snapshots = (data ?? []) as ResultsSnapshot[];

  return (
    <div className="min-h-screen bg-[#09090B] text-[#F4F2EC]">
      <header className="border-b border-[#222226]">
        <div className="mx-auto flex max-w-[1440px] items-stretch justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 border-r border-[#222226] px-6 py-4 font-mono text-xs uppercase tracking-[0.18em] text-[#8E8E93] transition-colors hover:bg-[#141417] hover:text-[#F4F2EC]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Stage
          </Link>
          <div className="flex items-center px-6 font-mono text-[11px] uppercase tracking-[0.2em] text-[#52525B]">
            HR RISE &amp; FALL // ARCHIVE
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-6 py-12 lg:px-10">
        <div className="border-b border-[#222226] pb-8">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#FF2E17]">
            [ PERMANENT RECORD ]
          </p>
          <h1 className="mt-2 font-display text-6xl font-extrabold uppercase leading-none sm:text-7xl">
            RESULTS ARCHIVE
          </h1>
        </div>

        {snapshots.length === 0 ? (
          <div className="mt-10 border border-[#222226] bg-[#0D0D10] py-20 text-center font-mono text-xs uppercase tracking-[0.2em] text-[#52525B]">
            NO ARCHIVED RESULTS YET. FINAL RESULTS APPEAR HERE AFTER COMPLETION.
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {snapshots.map((snap) => {
              const winners = snap.top_three.filter((t) => t.rank === 1);
              const second = snap.top_three.filter((t) => t.rank === 2);
              const third = snap.top_three.filter((t) => t.rank === 3);

              return (
                <div
                  key={snap.id}
                  className="flex flex-col justify-between border border-[#222226] bg-[#0D0D10] p-7"
                >
                  <div>
                    <div className="flex items-start justify-between gap-4 border-b border-[#222226] pb-5">
                      <div>
                        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                          {new Date(snap.event_date).toLocaleDateString()}
                        </p>
                        <h2 className="mt-1 font-display text-4xl font-extrabold uppercase">
                          {snap.event_name}
                        </h2>
                      </div>
                      <span className="border border-[#22C55E]/30 bg-[#22C55E]/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#22C55E]">
                        {snap.voting_completion_percentage}% VOTED
                      </span>
                    </div>

                    <div className="mt-5 divide-y divide-[#222226] border border-[#222226] bg-[#09090B] font-mono text-xs">
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-[#FF2E17]">01 / CHAMPION</span>
                        <span className="font-bold uppercase text-[#F4F2EC]">
                          {winners.map((w) => w.team_name).join(' & ') || '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 text-[#A1A1AA]">
                        <span>02 / SECOND</span>
                        <span className="uppercase">
                          {second.map((s) => s.team_name).join(' & ') || '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 text-[#8E8E93]">
                        <span>03 / THIRD</span>
                        <span className="uppercase">
                          {third.map((t) => t.team_name).join(' & ') || '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between border-t border-[#222226] pt-5">
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#71717A]">
                      {snap.participating_team_count} TEAMS // {snap.valid_vote_count} VOTES
                    </span>
                    <Link
                      href={`/results/${snap.event_id}`}
                      className="inline-flex items-center gap-1.5 bg-[#F4F2EC] px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#09090B] transition-colors hover:bg-[#FF2E17] hover:text-white"
                    >
                      Full Record <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}