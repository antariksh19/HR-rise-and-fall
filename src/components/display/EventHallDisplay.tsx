'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, ArrowLeft } from 'lucide-react';
import { useEventRealtime } from '@/hooks/useEventRealtime';
import { SuspenseReveal } from '@/components/results/SuspenseReveal';
import type { EventRecord, TeamRecord } from '@/types/database';

const STATUS_LABELS: Record<EventRecord['status'], string> = {
  not_started: 'STANDBY',
  voting_live: 'ON AIR — VOTING LIVE',
  voting_completed: 'BALLOTS SEALED',
  revealing: 'LIVE REVEAL',
  completed: 'FINAL RESULTS',
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
      <main className="flex min-h-screen items-center justify-center bg-[#09090B] text-[#F4F2EC]">
        <div className="text-center">
          <h1 className="font-display text-7xl font-extrabold uppercase">HR RISE &amp; FALL</h1>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.3em] text-[#8E8E93]">
            AWAITING SIGNAL...
          </p>
        </div>
      </main>
    );
  }

  const remaining = Math.max(0, event.active_team_count - event.valid_vote_count);
  const isLive = event.status === 'voting_live' || event.status === 'revealing';

  return (
    <main className="flex min-h-screen w-full flex-col justify-between bg-[#09090B] text-[#F4F2EC]">
      {/* Broadcast Top Strip */}
      <header className="flex items-stretch justify-between border-b border-[#222226]">
        <div className="flex items-center gap-5 px-8 py-5">
          <span
            className={`h-3 w-3 ${isLive ? 'animate-pulse bg-[#FF2E17]' : 'bg-[#F4F2EC]'}`}
          />
          <h1 className="font-display text-3xl font-extrabold uppercase tracking-[0.05em]">
            {event.name}
          </h1>
          <span className="hidden border-l border-[#222226] pl-5 font-mono text-xs uppercase tracking-[0.22em] text-[#8E8E93] sm:inline">
            {STATUS_LABELS[event.status]}
          </span>
        </div>

        <div className="flex items-stretch">
          <div className="flex items-center border-l border-[#222226] px-6 font-mono text-xs uppercase tracking-[0.2em] text-[#8E8E93]">
            {connectionStatus === 'connected' ? '● SYNCED' : '○ RECONNECTING'}
          </div>

          {!isFullscreen && (
            <Link
              href="/"
              className="flex items-center gap-2 border-l border-[#222226] px-5 font-mono text-xs uppercase tracking-[0.18em] text-[#8E8E93] transition-colors hover:bg-[#141417] hover:text-[#F4F2EC]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Exit
            </Link>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex items-center gap-2 border-l border-[#222226] bg-[#F4F2EC] px-6 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#09090B] transition-colors hover:bg-[#FF2E17] hover:text-white"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" /> Exit Fullscreen
              </>
            ) : (
              <>
                <Maximize2 className="h-3.5 w-3.5" /> Fullscreen
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main 16:9 Stage */}
      <section className="flex flex-1 flex-col justify-center px-8 py-10 lg:px-16">
        <AnimatePresence mode="wait">
          {/* BEFORE VOTING */}
          {event.status === 'not_started' && (
            <motion.div
              key="pre"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto w-full max-w-[1440px] space-y-12"
            >
              <div className="flex flex-col justify-between gap-6 border-b border-[#222226] pb-8 lg:flex-row lg:items-end">
                <h2 className="font-display text-6xl font-extrabold uppercase leading-[0.88] lg:text-8xl">
                  EVERY VOTE CHANGES
                  <br />
                  <span className="text-[#FF2E17]">THE GAME.</span>
                </h2>
                <div className="text-left lg:text-right">
                  <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#8E8E93]">
                    TEAMS ON STAGE
                  </p>
                  <p className="font-display text-7xl font-extrabold tabular-nums leading-none">
                    {String(teams.length).padStart(2, '0')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 border-l border-t border-[#222226] sm:grid-cols-3 lg:grid-cols-4">
                <AnimatePresence mode="popLayout">
                  {teams.map((team, idx) => {
                    const isNew = recentTeamIds.has(team.id);
                    return (
                      <motion.div
                        key={team.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={`border-b border-r border-[#222226] p-6 ${
                          isNew ? 'bg-[#FF2E17] text-white' : 'bg-[#0D0D10]'
                        }`}
                      >
                        <p className="font-mono text-xs uppercase tracking-[0.2em] opacity-60">
                          {isNew ? '● NEW' : `#${String(idx + 1).padStart(2, '0')}`}
                        </p>
                        <p className="mt-4 truncate font-display text-4xl font-extrabold uppercase">
                          {team.team_name}
                        </p>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* VOTING LIVE */}
          {event.status === 'voting_live' && (
            <motion.div
              key="live"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto w-full max-w-6xl space-y-10"
            >
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                  <p className="font-mono text-sm font-bold uppercase tracking-[0.3em] text-[#FF2E17]">
                    ● VOTING IN PROGRESS
                  </p>
                  <h2 className="mt-2 font-display text-6xl font-extrabold uppercase lg:text-7xl">
                    LIVE BALLOT COUNT
                  </h2>
                </div>
                <p className="font-display text-[8rem] font-extrabold tabular-nums leading-[0.8] lg:text-[11rem]">
                  {progressPercentage}%
                </p>
              </div>

              <div className="h-6 w-full bg-[#1C1C20]">
                <motion.div
                  className="h-full bg-[#FF2E17]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercentage}%` }}
                  transition={{ type: 'spring', stiffness: 65, damping: 18 }}
                />
              </div>

              <div className="grid grid-cols-3 border border-[#222226] divide-x divide-[#222226]">
                <div className="bg-[#0D0D10] p-8">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#8E8E93]">
                    REGISTERED
                  </p>
                  <p className="mt-3 font-display text-7xl font-extrabold tabular-nums">
                    {String(event.active_team_count).padStart(2, '0')}
                  </p>
                </div>
                <div className="bg-[#0D0D10] p-8">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#8E8E93]">
                    VOTES CAST
                  </p>
                  <p className="mt-3 font-display text-7xl font-extrabold tabular-nums text-[#FF2E17]">
                    {String(event.valid_vote_count).padStart(2, '0')}
                  </p>
                </div>
                <div className="bg-[#0D0D10] p-8">
                  <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#8E8E93]">
                    REMAINING
                  </p>
                  <p className="mt-3 font-display text-7xl font-extrabold tabular-nums">
                    {String(remaining).padStart(2, '0')}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* BALLOTS SEALED */}
          {event.status === 'voting_completed' && (
            <motion.div
              key="closed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto max-w-5xl border-y border-[#222226] py-16 text-center"
            >
              <p className="font-mono text-sm font-bold uppercase tracking-[0.35em] text-[#FF2E17]">
                ● VOTING CLOSED
              </p>
              <h2 className="mt-4 font-display text-7xl font-extrabold uppercase leading-[0.9] lg:text-9xl">
                THE VOTES ARE IN.
              </h2>
              <p className="mt-6 font-mono text-sm uppercase tracking-[0.22em] text-[#8E8E93]">
                STAND BY FOR THE OFFICIAL TOP THREE REVEAL
              </p>
            </motion.div>
          )}

          {/* REVEAL & COMPLETED */}
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

      {/* Broadcast Footer */}
      <footer className="flex items-center justify-between border-t border-[#222226] px-8 py-3.5 font-mono text-[11px] uppercase tracking-[0.22em] text-[#52525B]">
        <span>HR RISE AND FALL // OFFICIAL STAGE FEED</span>
        <span>ZERO-LEAKAGE REALTIME</span>
      </footer>
    </main>
  );
}