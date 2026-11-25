import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
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
import {
  LiveTimecode,
  CornerMarks,
} from '@/components/ui/BroadcastPrimitives';
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
    <div className="broadcast-grain min-h-dvh bg-[#09090B] text-[#F4F2EC]">
      <header className="border-b border-[#222226]">
        <div className="mx-auto flex max-w-[1440px] items-stretch justify-between">
          <Link
            href="/results"
            className="flex items-center gap-3 border-r border-[#222226] px-6 py-4 font-mono text-xs uppercase tracking-[0.18em] text-[#8E8E93] transition-colors hover:bg-[#141417] hover:text-[#F4F2EC]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Archive
          </Link>
          <div className="flex items-center gap-4 px-6 font-mono text-[11px] uppercase tracking-[0.2em] text-[#52525B]">
            <span className="hidden sm:inline">
              FINALIZED {new Date(snap.completed_at).toLocaleDateString()}
            </span>
            <span className="text-[#27272A]">/</span>
            <LiveTimecode />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] space-y-12 px-6 py-12 lg:px-10">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-[#222226] pb-8 md:flex-row md:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#FF2E17]">
              [ OFFICIAL ARCHIVED RECORD ]
            </p>
            <h1 className="mt-2 font-display text-6xl font-extrabold uppercase leading-none sm:text-7xl">
              {snap.event_name}
            </h1>
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#8E8E93]">
            DATE: {new Date(snap.event_date).toLocaleDateString()}
          </p>
        </div>

        {/* Inverted Champion Block + Podium */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative flex flex-col justify-between border border-[#D4D4D8] bg-[#141418] p-7">
            <CornerMarks />
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#A1A1AA]">
              02 / SECOND PLACE
            </span>
            <p className="my-6 font-display text-4xl font-extrabold uppercase">
              {second.map((s) => s.team_name).join(' & ') || '—'}
            </p>
            <span className="font-mono text-xs uppercase text-[#8E8E93]">
              {second[0] ? `${second[0].votes} VOTES` : '—'}
            </span>
          </div>

          <div className="relative flex flex-col justify-between border border-[#F4F2EC] bg-[#F4F2EC] p-8 text-[#09090B]">
            <CornerMarks light />
            <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#FF2E17]">
              01 / CHAMPION
            </span>
            <p className="my-6 font-display text-5xl font-extrabold uppercase leading-none">
              {winners.map((w) => w.team_name).join(' & ') || '—'}
            </p>
            <span className="inline-block w-fit bg-[#09090B] px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#F4F2EC]">
              {winners[0] ? `${winners[0].votes} VOTES` : '—'}
              {winners[0]?.is_tied ? ' — TIED' : ''}
            </span>
          </div>

          <div className="relative flex flex-col justify-between border border-[#B45309] bg-[#141418] p-7">
            <CornerMarks />
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#D97706]">
              03 / THIRD PLACE
            </span>
            <p className="my-6 font-display text-4xl font-extrabold uppercase">
              {third.map((t) => t.team_name).join(' & ') || '—'}
            </p>
            <span className="font-mono text-xs uppercase text-[#8E8E93]">
              {third[0] ? `${third[0].votes} VOTES` : '—'}
            </span>
          </div>
        </section>

        {/* Dot-Matrix Participation Strip */}
        <section className="bg-telemetry-dots relative grid grid-cols-1 divide-y divide-[#222226] border border-[#222226] bg-[#0D0D10] md:grid-cols-3 md:divide-x md:divide-y-0">
          <CornerMarks />
          <div className="p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8E8E93]">
              PARTICIPATING TEAMS
            </p>
            <p className="mt-2 font-display text-5xl font-extrabold tabular-nums">
              {String(snap.participating_team_count).padStart(2, '0')}
            </p>
          </div>
          <div className="p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8E8E93]">
              TOTAL AUDIENCE VOTES
            </p>
            <p className="mt-2 font-display text-5xl font-extrabold tabular-nums text-[#FF2E17]">
              {String(snap.valid_vote_count).padStart(2, '0')}
            </p>
          </div>
          <div className="p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8E8E93]">
              AVERAGE VOTES PER TEAM
            </p>
            <p className="mt-2 font-display text-5xl font-extrabold tabular-nums">
              {snap.participating_team_count > 0
                ? (snap.valid_vote_count / snap.participating_team_count).toFixed(1)
                : '0.0'}
            </p>
          </div>
        </section>

        {/* Vote Distribution Chart */}
        <section className="space-y-4">
          <h3 className="font-display text-3xl font-extrabold uppercase">
            TOP THREE VOTE DISTRIBUTION
          </h3>
          <TopThreeChart topThree={snap.top_three} />
        </section>

        {/* Complete Rankings Table */}
        <section className="space-y-4">
          <h3 className="font-display text-3xl font-extrabold uppercase">
            COMPLETE FINAL STANDINGS
          </h3>
          <div className="border border-[#222226] bg-[#0D0D10]">
            <Table>
              <TableHeader>
                <TableRow className="border-[#222226] hover:bg-transparent">
                  <TableHead className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                    Rank
                  </TableHead>
                  <TableHead className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                    Team Name
                  </TableHead>
                  <TableHead className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                    Team Code
                  </TableHead>
                  <TableHead className="text-right font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                    Votes
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snap.final_rankings.map((team) => (
                  <TableRow
                    key={team.team_id}
                    className="border-[#222226] transition-colors hover:bg-[#141418]"
                  >
                    <TableCell className="font-mono text-xs font-bold text-[#FF2E17]">
                      #{team.rank} {team.is_tied ? '(TIED)' : ''}
                    </TableCell>
                    <TableCell className="font-display text-2xl font-bold uppercase text-[#F4F2EC]">
                      {team.team_name}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-[#8E8E93]">
                      {team.team_code}
                    </TableCell>
                    <TableCell className="text-right font-mono text-base font-bold tabular-nums text-[#F4F2EC]">
                      {team.votes}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      </main>
    </div>
  );
}