'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Maximize2, Minimize2, Sparkles, Wifi, WifiOff } from 'lucide-react';
import { useEventRealtime } from '@/hooks/useEventRealtime';
import { SuspenseReveal } from '@/components/results/SuspenseReveal';
import type { EventRecord, TeamRecord } from '@/types/database';

const STATUS_LABELS: Record<EventRecord['status'], string> = {
  not_started: 'Voting Not Started',
  voting_live: 'Voting Is Live',
  voting_completed: 'The Votes Are In',
  revealing: 'Live Podium Reveal',
  completed: 'Official Final Results',
};

export function EventHallDisplay({
  initialEvent,
  initialTeams,
}: {
  initialEvent: EventRecord | null;
  initialTeams: TeamRecord[];
}) {
  const { event, teams, recentTeamIds, progressPercentage, connectionStatus } =
    useEventRealtime(initialEvent, initialTeams);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  if (!event) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#060913] p-12 text-center text-white">
        <div>
          <Flame className="mx-auto mb-6 h-16 w-16 text-amber-400" />
          <h1 className="text-5xl font-black tracking-tight">HR RISE AND FALL</h1>
          <p className="mt-4 text-xl text-slate-400">Waiting for event configuration...</p>
        </div>
      </main>
    );
  }

  const remaining = Math.max(0, event.active_team_count - event.valid_vote_count);

  return (
    <main className="relative flex min-h-screen w-full flex-col justify-between overflow-hidden bg-[#060913] bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.16),_transparent_60%)] px-8 py-8 text-white lg:px-16 lg:py-10">
      {/* Top Broadcast Header */}
      <header className="flex items-center justify-between border-b border-white/10 pb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30">
            <Flame className="h-8 w-8" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-400">
              {STATUS_LABELS[event.status]}
            </p>
            <h1 className="text-3xl font-black tracking-tight lg:text-4xl">
              {event.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest ${
              connectionStatus === 'connected'
                ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
                : 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
            }`}
          >
            {connectionStatus === 'connected' ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4 animate-pulse" />
            )}
            {connectionStatus === 'connected' ? 'Live' : 'Reconnecting'}
          </span>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-200 transition hover:bg-white/10"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-4 w-4" /> Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" /> Fullscreen
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main 16:9 Presentation Stage */}
      <section className="my-auto flex flex-1 flex-col items-center justify-center py-10">
        <AnimatePresence mode="wait">
          {/* STATE 1: BEFORE VOTING */}
          {event.status === 'not_started' && (
            <motion.div
              key="pre"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="w-full max-w-7xl space-y-10 text-center"
            >
              <div className="space-y-4">
                <p className="text-lg font-bold uppercase tracking-[0.35em] text-amber-400">
                  Voting Not Started • {teams.length} Teams Ready
                </p>
                <h2 className="text-5xl font-black tracking-tight lg:text-7xl">
                  EVERY VOTE CHANGES THE GAME.
                </h2>
                <p className="mx-auto max-w-3xl text-xl text-slate-300 lg:text-2xl">
                  One vote. One decision. One team saved. Who will rise, and who will fall?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <AnimatePresence mode="popLayout">
                  {teams.map((team, idx) => {
                    const isNew = recentTeamIds.has(team.id);
                    return (
                      <motion.div
                        key={team.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        className={`rounded-2xl border p-6 text-left ${
                          isNew
                            ? 'border-amber-400 bg-amber-500/15 shadow-[0_0_35px_rgba(245,158,11,0.25)]'
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-slate-400">
                            #{String(idx + 1).padStart(2, '0')}
                          </span>
                          {isNew && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase text-slate-950">
                              <Sparkles className="h-3 w-3" /> New
                            </span>
                          )}
                        </div>
                        <p className="mt-2 truncate text-2xl font-black text-white">
                          {team.team_name}
                        </p>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* STATE 2: VOTING LIVE */}
          {event.status === 'voting_live' && (
            <motion.div
              key="live"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-5xl space-y-10 text-center"
            >
              <div>
                <p className="inline-flex items-center gap-3 text-xl font-bold uppercase tracking-[0.35em] text-emerald-400">
                  <span className="h-3.5 w-3.5 animate-pulse rounded-full bg-emerald-400" />
                  Voting Is Live
                </p>
                <h2 className="mt-4 font-mono text-8xl font-black tabular-nums tracking-tight lg:text-9xl">
                  {progressPercentage}%
                </h2>
              </div>

              <div className="h-10 w-full overflow-hidden rounded-full bg-slate-800/90 p-1.5 ring-1 ring-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ type: 'spring', stiffness: 60, damping: 18 }}
                />
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
                  <p className="font-mono text-6xl font-black text-white">
                    {event.active_team_count}
                  </p>
                  <p className="mt-3 text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
                    Teams Registered
                  </p>
                </div>

                <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8">
                  <p className="font-mono text-6xl font-black text-emerald-400">
                    {event.valid_vote_count}
                  </p>
                  <p className="mt-3 text-sm font-bold uppercase tracking-[0.2em] text-emerald-200">
                    Teams Have Voted
                  </p>
                </div>

                <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8">
                  <p className="font-mono text-6xl font-black text-amber-400">
                    {remaining}
                  </p>
                  <p className="mt-3 text-sm font-bold uppercase tracking-[0.2em] text-amber-200">
                    Teams Remaining
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* STATE 3: VOTING COMPLETED (WAITING FOR REVEAL) */}
          {event.status === 'voting_completed' && (
            <motion.div
              key="closed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-4xl space-y-6 text-center"
            >
              <p className="text-xl font-bold uppercase tracking-[0.4em] text-amber-400">
                Ballots Sealed
              </p>
              <h2 className="text-6xl font-black tracking-tight lg:text-8xl">
                THE VOTES ARE IN.
              </h2>
              <p className="text-2xl text-slate-300 lg:text-3xl">
                The fate of every team has been decided. Stand by for the official Top Three Reveal...
              </p>
            </motion.div>
          )}

          {/* STATE 4 & 5: SYNCHRONIZED REVEAL & FINAL PODIUM */}
          {(event.status === 'revealing' || event.status === 'completed') && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full"
            >
              <SuspenseReveal event={event} large />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Subtle Broadcast Footer */}
      <footer className="flex items-center justify-between border-t border-white/10 pt-4 text-xs font-medium uppercase tracking-widest text-slate-500">
        <span>HR RISE AND FALL • Official Event Hall Display</span>
        <span>Synchronized Live</span>
      </footer>
    </main>
  );
}