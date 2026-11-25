'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2, ArrowLeft, ShieldCheck, Lock } from 'lucide-react';
import { useEventRealtime } from '@/hooks/useEventRealtime';
import { SuspenseReveal } from '@/components/results/SuspenseReveal';
import {
  LiveTimecode,
  AnimatedNumber,
  CornerMarks,
  BroadcastPhaseBar,
} from '@/components/ui/BroadcastPrimitives';
import type { EventRecord, TeamRecord } from '@/types/database';

const STATUS_LABELS: Record<EventRecord['status'], string> = {
  not_started: 'STANDBY // PRE-SHOW',
  voting_live: 'ON AIR // AUDIENCE VOTING LIVE',
  voting_completed: 'VAULT LOCKED // BALLOTS SEALED',
  revealing: 'LIVE // PODIUM REVEAL',
  completed: 'OFFICIAL // FINAL RESULTS',
};

export function EventHallDisplay({
  initialEvent,
  initialTeams,
}: {
  initialEvent: EventRecord | null;
  initialTeams: TeamRecord[];
}) {
  const { event, teams, recentTeamIds, connectionStatus } = useEventRealtime(
    initialEvent,
    initialTeams
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);
  const [votePulse, setVotePulse] = useState(false);

  const prevVoteCountRef = useRef<number>(initialEvent?.valid_vote_count ?? 0);

  useEffect(() => {
    const currentVotes = event?.valid_vote_count ?? 0;
    if (currentVotes > prevVoteCountRef.current) {
      setVotePulse(true);
      const t = setTimeout(() => setVotePulse(false), 1400);
      prevVoteCountRef.current = currentVotes;
      return () => clearTimeout(t);
    }
    prevVoteCountRef.current = currentVotes;
  }, [event?.valid_vote_count]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        toggleFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleFullscreen]);

  useEffect(() => {
    if (!isFullscreen) {
      setHudVisible(true);
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const showAndReset = () => {
      setHudVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setHudVisible(false), 2500);
    };
    showAndReset();
    window.addEventListener('mousemove', showAndReset);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', showAndReset);
    };
  }, [isFullscreen]);

  if (!event) {
    return (
      <main className="broadcast-grain bg-telemetry-dots flex h-dvh items-center justify-center overflow-hidden bg-[#09090B] text-[#F4F2EC]">
        <div className="relative border border-[#222226] bg-[#0D0D10] px-14 py-12 text-center">
          <CornerMarks />
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-[#FF2E17]">
            ● CH-01 STANDBY
          </p>
          <h1 className="mt-3 font-display text-7xl font-extrabold uppercase leading-none">
            HR RISE &amp; FALL
          </h1>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.28em] text-[#8E8E93]">
            AWAITING CONTROL ROOM SIGNAL...
          </p>
        </div>
      </main>
    );
  }

  const isLive = event.status === 'voting_live' || event.status === 'revealing';

  // Auto-scale team grid density so large rosters fit cleanly above the pinned footer
  const teamGridClass =
    teams.length > 16
      ? 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6'
      : teams.length > 8
        ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-5'
        : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

  const teamCardPadding = teams.length > 12 ? 'p-4 lg:p-5' : 'p-6 lg:p-7';
  const teamNameSize =
    teams.length > 16
      ? 'text-2xl lg:text-3xl'
      : teams.length > 8
        ? 'text-3xl lg:text-4xl'
        : 'text-4xl lg:text-5xl';

  return (
    <main className="broadcast-grain relative flex h-dvh w-full flex-col overflow-hidden bg-[#09090B] text-[#F4F2EC]">
      {/* Architectural Stage Backdrop Layers */}
      <div className="bg-telemetry-dots pointer-events-none fixed inset-0 opacity-45" />
      <div className="stage-vignette pointer-events-none fixed inset-0" />
      <div className="pointer-events-none fixed inset-0 mx-auto max-w-[1600px] border-x border-white/[0.03]" />

      {/* Live Ballot Flash Frame */}
      <AnimatePresence>
        {votePulse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none fixed inset-0 z-40 border-2 border-[#FF2E17] shadow-[inset_0_0_90px_rgba(255,46,23,0.18)]"
          />
        )}
      </AnimatePresence>

      {/* Pinned Top Broadcast Header */}
      <header
        className={`relative z-30 shrink-0 border-b border-[#222226] bg-[#09090B]/92 backdrop-blur-md transition-opacity duration-300 ${
          isFullscreen && !hudVisible ? 'pointer-events-none opacity-0' : 'opacity-100'
        }`}
      >
        <div className="flex items-stretch justify-between">
          <div className="flex items-center gap-4 px-6 py-3.5 lg:gap-5 lg:px-10 lg:py-4">
            <span className="relative flex h-3 w-3 shrink-0">
              {isLive && (
                <span className="absolute inline-flex h-full w-full animate-ping bg-[#FF2E17] opacity-75" />
              )}
              <span
                className={`relative inline-flex h-3 w-3 ${
                  isLive ? 'bg-[#FF2E17]' : 'bg-[#F4F2EC]'
                }`}
              />
            </span>
            <h1 className="font-display text-2xl font-extrabold uppercase tracking-[0.06em] lg:text-3xl">
              {event.name}
            </h1>
            <span
              className={`hidden border-l border-[#222226] pl-5 font-mono text-xs uppercase tracking-[0.22em] sm:inline ${
                isLive ? 'font-bold text-[#FF2E17]' : 'text-[#8E8E93]'
              }`}
            >
              {STATUS_LABELS[event.status]}
            </span>
          </div>

          <div className="flex items-stretch">
            <div className="hidden items-center gap-2 border-l border-[#222226] px-5 font-mono text-xs uppercase tracking-[0.2em] text-[#71717A] lg:flex">
              <span>STAGE-01</span>
              <span className="text-[#27272A]">/</span>
              <LiveTimecode />
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
              title="Press F to toggle fullscreen"
              className="flex items-center gap-2 border-l border-[#222226] bg-[#F4F2EC] px-6 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#09090B] transition-colors hover:bg-[#FF2E17] hover:text-white"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" /> Exit
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" /> Fullscreen
                </>
              )}
            </button>
          </div>
        </div>

        <BroadcastPhaseBar status={event.status} />
      </header>

      {/* Scroll-Safe Center Stage (never pushes the lower-third footer off-screen) */}
      <section className="no-scrollbar relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-6 lg:px-14 lg:py-8">
        <div className="my-auto w-full">
          <AnimatePresence mode="wait">
            {/* STATE 1: PRE-SHOW SHOWCASE */}
            {event.status === 'not_started' && (
              <motion.div
                key="pre"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative mx-auto w-full max-w-[1520px] space-y-6 lg:space-y-8"
              >
                <span className="pointer-events-none absolute -top-10 right-0 select-none font-display text-[12rem] font-extrabold uppercase leading-none text-white/[0.025] lg:text-[18rem]">
                  READY
                </span>

                <div className="relative flex flex-col justify-between gap-4 border-b border-[#222226] pb-6 lg:flex-row lg:items-end">
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.3em] text-[#FF2E17]">
                      [ PRE-SHOW // OFFICIAL COMPETITOR LINEUP ]
                    </p>
                    <h2 className="mt-2 font-display text-5xl font-extrabold uppercase leading-[0.88] tracking-tight lg:text-7xl">
                      EVERY VOTE CHANGES{' '}
                      <span className="text-[#FF2E17]">THE GAME.</span>
                    </h2>
                  </div>

                  <div className="relative border border-[#222226] bg-[#0D0D10] px-7 py-4 text-left lg:text-right">
                    <CornerMarks />
                    <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#8E8E93]">
                      TEAMS ON STAGE
                    </p>
                    <p className="mt-1 font-display text-6xl font-extrabold tabular-nums leading-none text-[#F4F2EC]">
                      <AnimatedNumber value={teams.length} padZero />
                    </p>
                  </div>
                </div>

                {teams.length === 0 ? (
                  <div className="relative border border-[#222226] bg-[#0D0D10]/90 py-20 text-center">
                    <CornerMarks />
                    <p className="font-mono text-sm uppercase tracking-[0.3em] text-[#8E8E93]">
                      AWAITING COMPETITOR REGISTRATION FROM CONTROL ROOM...
                    </p>
                  </div>
                ) : (
                  <div className={`grid border-l border-t border-[#222226] ${teamGridClass}`}>
                    <AnimatePresence mode="popLayout">
                      {teams.map((team, idx) => {
                        const isNew = recentTeamIds.has(team.id);
                        const serial = String(idx + 1).padStart(2, '0');
                        return (
                          <motion.div
                            key={team.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.25 }}
                            className={`relative overflow-hidden border-b border-r border-[#222226] ${teamCardPadding} ${
                              isNew
                                ? 'bg-[#FF2E17] text-white'
                                : 'bg-[#0D0D10]/90 text-[#F4F2EC]'
                            }`}
                          >
                            <span className="pointer-events-none absolute -right-2 -bottom-4 select-none font-display text-7xl font-extrabold leading-none opacity-[0.06]">
                              {serial}
                            </span>

                            <div className="relative flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em]">
                              <span className={isNew ? 'font-bold text-white' : 'text-[#8E8E93]'}>
                                {isNew ? '● NEW' : `NO. ${serial}`}
                              </span>
                              <span className="opacity-50">{team.team_code}</span>
                            </div>

                            <p
                              className={`relative mt-4 truncate font-display font-extrabold uppercase tracking-tight ${teamNameSize}`}
                            >
                              {team.team_name}
                            </p>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}

            {/* STATE 2: AUDIENCE VOTING LIVE */}
            {event.status === 'voting_live' && (
              <motion.div
                key="live"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="relative mx-auto w-full max-w-[1400px]"
              >
                <div
                  className={`relative border bg-[#0D0D10]/95 p-8 transition-colors duration-300 lg:p-12 ${
                    votePulse ? 'border-[#FF2E17]' : 'border-[#222226]'
                  }`}
                >
                  <CornerMarks />

                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#222226] pb-5">
                    <div className="flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-[0.28em] text-[#FF2E17] lg:text-sm">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping bg-[#FF2E17] opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 bg-[#FF2E17]" />
                      </span>
                      ON AIR // AUDIENCE VOTING LIVE
                    </div>

                    <AnimatePresence mode="wait">
                      {votePulse ? (
                        <motion.span
                          key="pulse"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className="bg-[#FF2E17] px-3.5 py-1 font-mono text-xs font-bold uppercase tracking-[0.22em] text-white"
                        >
                          ● NEW AUDIENCE VOTE RECORDED
                        </motion.span>
                      ) : (
                        <motion.span
                          key="idle"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#8E8E93]"
                        >
                          <ShieldCheck className="h-4 w-4 text-[#22C55E]" />
                          1 VOTE PER DEVICE ENFORCED
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="my-8 flex flex-col justify-between gap-6 lg:my-12 lg:flex-row lg:items-end">
                    <div>
                      <h2 className="font-display text-5xl font-extrabold uppercase leading-[0.88] tracking-tight lg:text-8xl">
                        AUDIENCE
                        <br />
                        <span className="text-[#8E8E93]">VOTES CAST</span>
                      </h2>
                    </div>

                    <div className="text-left lg:text-right">
                      <p className="font-display text-[clamp(6.5rem,14vw,13rem)] font-extrabold tabular-nums leading-[0.76] tracking-tight text-[#FF2E17]">
                        <AnimatedNumber value={event.valid_vote_count} padZero />
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 divide-x divide-[#222226] border border-[#222226] bg-[#09090B]">
                    <div className="p-6 lg:p-8">
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8E8E93]">
                        01 / COMPETING TEAMS
                      </p>
                      <p className="mt-3 font-display text-6xl font-extrabold tabular-nums leading-none lg:text-7xl">
                        <AnimatedNumber value={event.active_team_count} padZero />
                      </p>
                    </div>
                    <div className="p-6 lg:p-8">
                      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#8E8E93]">
                        02 / VOTING RULE
                      </p>
                      <p className="mt-4 font-display text-4xl font-extrabold uppercase leading-none text-[#F4F2EC] lg:text-5xl">
                        1 VOTE / DEVICE
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STATE 3: BALLOTS SEALED */}
            {event.status === 'voting_completed' && (
              <motion.div
                key="closed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="relative mx-auto w-full max-w-5xl overflow-hidden border border-[#222226] bg-[#0D0D10]/95 px-8 py-16 text-center lg:py-24"
              >
                <CornerMarks />
                <div className="animate-scan-sweep pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#FF2E17] to-transparent shadow-[0_0_20px_#FF2E17]" />

                <div className="mx-auto mb-6 inline-flex items-center gap-2.5 border border-[#FF2E17]/40 bg-[#FF2E17]/10 px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.3em] text-[#FF2E17]">
                  <Lock className="h-3.5 w-3.5" />
                  VAULT SEALED // {event.valid_vote_count} AUDIENCE VOTES VERIFIED
                </div>

                <h2 className="font-display text-7xl font-extrabold uppercase leading-[0.88] tracking-tight lg:text-[9rem]">
                  THE VOTES
                  <br />
                  <span className="text-[#FF2E17]">ARE IN.</span>
                </h2>

                <p className="mx-auto mt-8 max-w-xl font-mono text-xs uppercase tracking-[0.26em] text-[#A1A1AA] lg:text-sm">
                  THE AUDIENCE HAS DECIDED. STAND BY FOR THE LIVE TOP THREE REVEAL.
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
        </div>
      </section>

      {/* Permanently Pinned Lower-Third Ticker & Broadcast Footer */}
      <footer className="relative z-30 shrink-0 border-t border-[#222226] bg-[#09090B]/95 backdrop-blur-md">
        <div className="overflow-hidden border-b border-[#222226] bg-[#111114] py-2">
          <div className="animate-marquee font-mono text-[11px] uppercase tracking-[0.22em] text-[#8E8E93]">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="mx-8 inline-flex items-center gap-4">
                <span className={isLive ? 'font-bold text-[#FF2E17]' : 'text-[#F4F2EC]'}>
                  ● {STATUS_LABELS[event.status]}
                </span>
                <span className="text-[#3F3F46]">/</span>
                <span>{event.name}</span>
                <span className="text-[#3F3F46]">/</span>
                <span>
                  {event.valid_vote_count} AUDIENCE VOTES • {event.active_team_count} TEAMS
                </span>
                <span className="text-[#3F3F46]">/</span>
                <span>1 VOTE PER DEVICE • WHO RISES</span>
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-[#52525B] lg:px-10">
          <span>HR RISE AND FALL // OFFICIAL STAGE BROADCAST</span>
          <span className="flex items-center gap-3">
            <span className={connectionStatus === 'connected' ? 'text-[#22C55E]' : 'text-[#FF2E17]'}>
              {connectionStatus === 'connected' ? '● LIVE SYNC' : '○ RECONNECTING'}
            </span>
            <span className="hidden text-[#27272A] sm:inline">/</span>
            <span className="hidden sm:inline">PRESS F FOR FULLSCREEN</span>
          </span>
        </div>
      </footer>
    </main>
  );
}