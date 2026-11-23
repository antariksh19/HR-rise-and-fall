'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Monitor, Shield, Archive } from 'lucide-react';
import { useEventRealtime } from '@/hooks/useEventRealtime';
import { SuspenseReveal } from '@/components/results/SuspenseReveal';
import {
  LiveTimecode,
  AnimatedNumber,
  SegmentedProgressBar,
  CornerMarks,
} from '@/components/ui/BroadcastPrimitives';
import type { EventRecord, TeamRecord } from '@/types/database';

const STATUS_LABELS: Record<EventRecord['status'], string> = {
  not_started: 'STANDBY — VOTING NOT STARTED',
  voting_live: 'ON AIR — VOTING IS LIVE',
  voting_completed: 'SEALED — BALLOTS LOCKED',
  revealing: 'LIVE — PODIUM REVEAL',
  completed: 'FINAL — RESULTS OFFICIAL',
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
  const { event, teams, recentTeamIds, progressPercentage, connectionStatus } =
    useEventRealtime(initialEvent, initialTeams);

  const remaining = event
    ? Math.max(0, event.active_team_count - event.valid_vote_count)
    : 0;

  const isLive = event?.status === 'voting_live' || event?.status === 'revealing';
  const statusText = event ? STATUS_LABELS[event.status] : 'OFFLINE';

  return (
    <div className="broadcast-grain min-h-screen bg-[#09090B] text-[#F4F2EC]">
      {/* Architectural Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#222226] bg-[#09090B]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-stretch justify-between">
          {/* Brand Block */}
          <div className="flex items-stretch">
            <Link
              href="/"
              className="flex items-center gap-3.5 border-r border-[#222226] px-5 py-4 sm:px-8"
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                {isLive && (
                  <span className="absolute inline-flex h-full w-full animate-ping bg-[#FF2E17] opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-2.5 w-2.5 ${
                    isLive ? 'bg-[#FF2E17]' : 'bg-[#F4F2EC]'
                  }`}
                />
              </span>
              <span className="font-display text-2xl font-extrabold uppercase tracking-[0.06em] text-[#F4F2EC]">
                HR RISE &amp; FALL
              </span>
            </Link>

            <div className="hidden items-center gap-2 border-r border-[#222226] px-5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#71717A] xl:flex">
              <span>CH-01</span>
              <span className="text-[#27272A]">/</span>
              <LiveTimecode />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-stretch">
            <Link
              href="/display"
              className="flex items-center gap-2 border-l border-[#222226] px-4 text-xs font-medium uppercase tracking-[0.14em] text-[#8E8E93] transition-colors hover:bg-[#141417] hover:text-[#F4F2EC] sm:px-6"
            >
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Stage Display</span>
            </Link>

            {hasArchives && (
              <Link
                href="/results"
                className="flex items-center gap-2 border-l border-[#222226] px-4 text-xs font-medium uppercase tracking-[0.14em] text-[#8E8E93] transition-colors hover:bg-[#141417] hover:text-[#F4F2EC] sm:px-6"
              >
                <Archive className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Archive</span>
              </Link>
            )}

            <Link
              href="/admin"
              className="flex items-center gap-2 border-l border-[#222226] px-4 text-xs font-medium uppercase tracking-[0.14em] text-[#8E8E93] transition-colors hover:bg-[#141417] hover:text-[#F4F2EC] sm:px-6"
            >
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Admin</span>
            </Link>

            <Link
              href="/login"
              className="group flex items-center gap-2 border-l border-[#222226] bg-[#F4F2EC] px-5 text-xs font-bold uppercase tracking-[0.14em] text-[#09090B] transition-colors hover:bg-[#FF2E17] hover:text-white sm:px-7"
            >
              <span>Team Login</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Live Broadcast Ticker */}
      <div className="overflow-hidden border-b border-[#222226] bg-[#111114] py-2">
        <div className="animate-marquee font-mono text-[11px] uppercase tracking-[0.2em] text-[#8E8E93]">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="mx-8 inline-flex items-center gap-4">
              <span className={isLive ? 'font-bold text-[#FF2E17]' : 'text-[#F4F2EC]'}>
                ● {statusText}
              </span>
              <span className="text-[#3F3F46]">/</span>
              <span>{event?.name ?? 'HR RISE AND FALL'}</span>
              <span className="text-[#3F3F46]">/</span>
              <span>{teams.length} ACTIVE TEAMS</span>
              <span className="text-[#3F3F46]">/</span>
              <span>
                FEED: {connectionStatus === 'connected' ? 'SYNCHRONIZED' : 'RECONNECTING'}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Main Editorial Container */}
      <main className="mx-auto max-w-[1440px]">
        {/* Asymmetric Split Hero */}
        <section className="grid grid-cols-1 border-b border-[#222226] lg:grid-cols-12">
          {/* Left: Monumental Masked Typography */}
          <div className="relative flex flex-col justify-between border-b border-[#222226] p-6 sm:p-10 lg:col-span-8 lg:border-r lg:border-b-0 lg:p-14">
            <CornerMarks />

            <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.18em] text-[#8E8E93]">
              <span>[ 01 / LIVE COMPETITION ]</span>
              <span className={isLive ? 'font-bold text-[#FF2E17]' : 'text-[#8E8E93]'}>
                {event?.name ?? 'SEASON LIVE'}
              </span>
            </div>

            <div className="my-10 lg:my-14">
              <h1 className="font-display text-[clamp(3.75rem,9vw,8.75rem)] font-extrabold uppercase leading-[0.86] tracking-[-0.02em] text-[#F4F2EC]">
                {['ONE VOTE.', 'ONE SAVED.'].map((line, i) => (
                  <span key={line} className="block overflow-hidden">
                    <motion.span
                      className="block"
                      initial={{ y: '105%' }}
                      animate={{ y: 0 }}
                      transition={{
                        duration: 0.55,
                        delay: i * 0.08,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    >
                      {line}
                    </motion.span>
                  </span>
                ))}
                <span className="block overflow-hidden">
                  <motion.span
                    className="block text-[#FF2E17]"
                    initial={{ y: '105%' }}
                    animate={{ y: 0 }}
                    transition={{
                      duration: 0.55,
                      delay: 0.16,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    WHO RISES.
                  </motion.span>
                </span>
              </h1>
            </div>

            <div className="flex flex-col justify-between gap-6 border-t border-[#222226] pt-6 sm:flex-row sm:items-end">
              <p className="max-w-md text-sm leading-relaxed text-[#A1A1AA]">
                Every competing team holds a single irrevocable ballot to save one rival from elimination.
                Zero-leakage synced and revealed live on stage.
              </p>

              <div className="flex shrink-0 items-center gap-3">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 bg-[#F4F2EC] px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#09090B] transition-colors hover:bg-[#FF2E17] hover:text-white"
                >
                  Cast Ballot
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link
                  href="/display"
                  className="inline-flex items-center gap-2 border border-[#27272A] px-5 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#F4F2EC] transition-colors hover:border-[#F4F2EC] hover:bg-[#141418]"
                >
                  Stage View
                </Link>
              </div>
            </div>
          </div>

          {/* Right: Precision Dot-Matrix Telemetry Rail */}
          <div className="bg-telemetry-dots flex flex-col justify-between bg-[#0D0D10] lg:col-span-4">
            <div className="border-b border-[#222226] p-6 sm:p-8">
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-[#8E8E93]">
                <span>BROADCAST STATUS</span>
                <span className={connectionStatus === 'connected' ? 'text-[#22C55E]' : 'text-[#FF2E17]'}>
                  {connectionStatus === 'connected' ? '● SYNC' : '○ RETRY'}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 ${
                    isLive ? 'animate-pulse bg-[#FF2E17]' : 'bg-[#F4F2EC]'
                  }`}
                />
                <p className="font-display text-3xl font-bold uppercase tracking-wide text-[#F4F2EC]">
                  {event?.status.replace('_', ' ') ?? 'STANDBY'}
                </p>
              </div>
            </div>

            {/* Key Rolling Metrics */}
            <div className="grid grid-cols-2 divide-x divide-[#222226] border-b border-[#222226] bg-[#0B0B0E]/80">
              <div className="p-6 sm:p-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                  TEAMS
                </p>
                <p className="mt-2 font-display text-6xl font-extrabold tabular-nums leading-none text-[#F4F2EC]">
                  <AnimatedNumber value={event?.active_team_count ?? teams.length} padZero />
                </p>
              </div>
              <div className="p-6 sm:p-8">
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                  BALLOTS IN
                </p>
                <p className="mt-2 font-display text-6xl font-extrabold tabular-nums leading-none text-[#FF2E17]">
                  <AnimatedNumber value={event?.valid_vote_count ?? 0} padZero />
                </p>
              </div>
            </div>

            {/* Segmented Broadcast Meter */}
            <div className="p-6 sm:p-8">
              <div className="mb-3 flex items-baseline justify-between font-mono text-xs uppercase tracking-[0.16em]">
                <span className="text-[#8E8E93]">COMPLETION</span>
                <span className="text-lg font-bold tabular-nums text-[#F4F2EC]">
                  <AnimatedNumber value={progressPercentage} decimals={1} />%
                </span>
              </div>

              <SegmentedProgressBar percentage={progressPercentage} segments={24} />

              <div className="mt-4 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.15em] text-[#8E8E93]">
                <span>{remaining} PENDING</span>
                <span>ZERO-LEAKAGE</span>
              </div>
            </div>
          </div>
        </section>

        {/* Live Reveal / Final Podium Section */}
        {event && (event.status === 'revealing' || event.status === 'completed') && (
          <section className="border-b border-[#222226] bg-[#0B0B0E] px-6 py-14 sm:px-10 lg:px-14">
            <SuspenseReveal event={event} />
          </section>
        )}

        {/* Competing Teams Roster (Architectural Hairline Grid) */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#222226] px-6 py-5 sm:px-10 lg:px-14">
            <div className="flex items-center gap-4">
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#8E8E93]">
                [ 02 / ROSTER ]
              </span>
              <h2 className="font-display text-3xl font-extrabold uppercase tracking-[0.04em] text-[#F4F2EC]">
                COMPETING TEAMS
              </h2>
            </div>
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-[#8E8E93]">
              TOTAL: {String(teams.length).padStart(2, '0')} ACTIVE
            </span>
          </div>

          {teams.length === 0 ? (
            <div className="px-6 py-20 text-center font-mono text-xs uppercase tracking-[0.2em] text-[#8E8E93]">
              AWAITING TEAM REGISTRATION FROM CONTROL ROOM...
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`group relative flex flex-col justify-between border-b border-r border-[#222226] p-7 transition-colors duration-200 sm:p-9 ${
                        isNew
                          ? 'bg-[#FF2E17] text-white'
                          : 'bg-[#09090B] hover:bg-[#F4F2EC] hover:text-[#09090B]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em]">
                        <span
                          className={
                            isNew
                              ? 'text-white/90'
                              : 'text-[#8E8E93] group-hover:text-[#09090B]/60'
                          }
                        >
                          NO. {serial}
                        </span>
                        <span
                          className={
                            isNew
                              ? 'font-bold text-white'
                              : 'text-[#8E8E93] group-hover:text-[#09090B]/70'
                          }
                        >
                          {isNew ? '● NEW ENTRY' : team.team_code}
                        </span>
                      </div>

                      <h3 className="mt-10 font-display text-4xl font-extrabold uppercase tracking-tight transition-transform duration-200 group-hover:translate-x-1 sm:text-5xl">
                        {team.team_name}
                      </h3>

                      <div className="mt-8 flex items-center justify-between border-t border-current/15 pt-4 font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">
                        <span>STATUS: ELIGIBLE</span>
                        <span className="inline-flex items-center gap-1">
                          STAGE LOCKED
                          <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                        </span>
                      </div>
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