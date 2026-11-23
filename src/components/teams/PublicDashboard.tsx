'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Users, Archive, LogIn, Sparkles } from 'lucide-react';
import { useEventRealtime } from '@/hooks/useEventRealtime';
import { SuspenseReveal } from '@/components/results/SuspenseReveal';
import { Button } from '@/components/ui/button';
import type { EventRecord, TeamRecord } from '@/types/database';

const STATUS_LABELS: Record<EventRecord['status'], string> = {
  not_started: 'Voting Not Started',
  voting_live: 'Voting Is Live',
  voting_completed: 'Voting Completed',
  revealing: 'Results Being Revealed',
  completed: 'Results Announced',
};

export function PublicDashboard({
  initialEvent,
  initialTeams,
  hasArchives,
}: {
  initialEvent: EventRecord | null;
  initialTeams: TeamRecord[];
  hasArchives: boolean;
}) {
  const { event, teams, recentTeamIds, progressPercentage } = useEventRealtime(
    initialEvent,
    initialTeams
  );

  const remaining = event
    ? Math.max(0, event.active_team_count - event.valid_vote_count)
    : 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.12),_transparent_55%)]">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-[#060913]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
              <Flame className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-black tracking-tight text-white">HR RISE AND FALL</p>
              {event && (
                <p className="text-xs font-medium text-amber-400">
                  {STATUS_LABELS[event.status]}
                </p>
              )}
            </div>
          </div>

          <nav className="flex items-center gap-3">
            {hasArchives && (
              <Link href="/results">
                <Button variant="outline" size="sm" className="border-slate-700 text-slate-200">
                  <Archive className="mr-2 h-4 w-4" /> Results Archive
                </Button>
              </Link>
            )}
            <Link href="/login">
              <Button size="sm" className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400">
                <LogIn className="mr-2 h-4 w-4" /> Team Login
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-16 px-4 py-12">
        {/* Hero */}
        <section className="mx-auto max-w-4xl space-y-5 text-center">
          {event && (
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-amber-400">
              <span
                className={`h-2 w-2 rounded-full ${
                  event.status === 'voting_live'
                    ? 'animate-pulse bg-emerald-400'
                    : 'bg-amber-400'
                }`}
              />
              {event.name} • {STATUS_LABELS[event.status]}
            </div>
          )}

          <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl">
            EVERY VOTE CHANGES THE GAME.
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-300">
            One vote. One decision. One team saved. Who will rise, and who will fall?
          </p>
        </section>

        {/* Live Voting Progress Bar */}
        {event && (event.status === 'voting_live' || event.status === 'voting_completed') && (
          <section className="mx-auto max-w-4xl rounded-2xl border border-slate-800 bg-slate-900/70 p-8 backdrop-blur">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  Voting Progress
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  {event.status === 'voting_completed'
                    ? 'All Ballots Sealed'
                    : 'Votes Are Coming In Live'}
                </h2>
              </div>
              <span className="font-mono text-4xl font-black text-amber-400">
                {progressPercentage}%
              </span>
            </div>

            <div className="mt-5 h-4 w-full overflow-hidden rounded-full bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ type: 'spring', stiffness: 70, damping: 18 }}
              />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-2xl font-black text-white">{event.active_team_count}</p>
                <p className="text-xs uppercase text-slate-400">Teams Registered</p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-2xl font-black text-emerald-400">{event.valid_vote_count}</p>
                <p className="text-xs uppercase text-slate-400">Teams Have Voted</p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-2xl font-black text-amber-400">{remaining}</p>
                <p className="text-xs uppercase text-slate-400">Yet To Vote</p>
              </div>
            </div>
          </section>
        )}

        {/* Synchronized Reveal & Final Podium */}
        {event && (event.status === 'revealing' || event.status === 'completed') && (
          <section className="py-4">
            <SuspenseReveal event={event} />
          </section>
        )}

        {/* Competing Teams Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-400" />
              <h2 className="text-2xl font-black text-white">Competing Teams</h2>
            </div>
            <span className="font-mono text-sm text-slate-400">{teams.length} Active</span>
          </div>

          {teams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center text-slate-400">
              Registered teams will appear here live as soon as the organizer adds them.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {teams.map((team, idx) => {
                  const isNew = recentTeamIds.has(team.id);
                  return (
                    <motion.div
                      key={team.id}
                      layout
                      initial={{ opacity: 0, y: 18, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                      className={`group relative rounded-2xl border p-6 transition hover:-translate-y-0.5 ${
                        isNew
                          ? 'border-amber-400 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
                          : 'border-slate-800 bg-slate-900/60 hover:border-amber-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-slate-400">
                          #{String(idx + 1).padStart(2, '0')} • {team.team_code}
                        </span>
                        {isNew && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase text-slate-950">
                            <Sparkles className="h-3 w-3" /> New Team
                          </span>
                        )}
                      </div>
                      <h3 className="mt-3 text-xl font-bold text-white">{team.team_name}</h3>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}