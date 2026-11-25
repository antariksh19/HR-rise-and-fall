'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight, Monitor, Shield, Archive, Vote, Radio } from 'lucide-react';
import { useEventRealtime } from '@/hooks/useEventRealtime';
import { SuspenseReveal } from '@/components/results/SuspenseReveal';
import {
  LiveTimecode,
  AnimatedNumber,
  SegmentedProgressBar,
  CornerMarks,
  BroadcastPhaseBar,
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
    <div className="broadcast-grain min-h-dvh bg-[#09090B] pb-20 text-[#F4F2EC] md:pb-0">
      {/* Architectural Top Bar */}
      <header className="pt-safe sticky top-0 z-30 border-b border-[#222226] bg-[#09090B]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-stretch justify-between">
          <div className="flex items-stretch">
            <Link
              href="/"
              className="flex items-center gap-3 border-r border-[#222226] px-4 py-3.5 sm:px-8 sm:py-4"
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
              <span className="font-display text-xl font-extrabold uppercase tracking-[0.06em] text-[#F4F2EC] sm:text-2xl">
                HR RISE &amp; FALL
              </span>
            </Link>

            <div className="hidden items-center gap-2 border-r border-[#222226] px-5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#71717A] xl:flex">
              <span>CH-01</span>
              <span className="text-[#27272A]">/</span>
              <LiveTimecode />
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-stretch md:flex">
            <Link
              href="/display"
              className="flex items-center gap-2 border-l border-[#222226] px-5 text-xs font-medium uppercase tracking-[0.14em] text-[#8E8E93] transition-colors hover:bg-[#141417] hover:text-[#F4F2EC]"
            >
              <Monitor className="h-3.5 w-3.5" />
              <span>Stage Display</span>
            </Link>

            {hasArchives && (
              <Link
                href="/results"
                className="flex items-center gap-2 border-l border-[#222226] px-5 text-xs font-medium uppercase tracking-[0.14em] text-[#8E8E93] transition-colors hover:bg-[#141417] hover:text-[#F4F2EC]"
              >
                <Archive className="h-3.5 w-3.5" />
                <span>Archive</span>
              </Link>
            )}

            <Link
              href="/admin"
              className="flex items-center gap-2 border-l border-[#222226] px-5 text-xs font-medium uppercase tracking-[0.14em] text-[#8E8E93] transition-colors hover:bg-[#141417] hover:text-[#F4F2EC]"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Admin</span>
            </Link>

            <Link
              href="/login"
              className="group flex items-center gap-2 border-l border-[#222226] bg-[#F4F2EC] px-7 text-xs font-bold uppercase tracking-[0.14em] text-[#09090B] transition-colors hover:bg-[#FF2E17] hover:text-white"
            >
              <span>Team Login</span>
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </nav>

          {/* Mobile Header Primary Action */}
          <Link
            href="/login"
            className="flex items-center gap-1.5 border-l border-[#222226] bg-[#F4F2EC] px-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-[#09090B] active:bg-[#FF2E17] active:text-white md:hidden"
          >
            <span>Vote</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      {/* Live Broadcast Ticker */}
      <div className="overflow-hidden border-b border-[#222226] bg-[#111114] py-2">
        <div className="animate-marquee font-mono text-[10px] uppercase tracking-[0.2em] text-[#8E8E93] sm:text-[11px]">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} className="mx-6 inline-flex items-center gap-3 sm:mx-8 sm:gap-4">
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

      {/* 5-Stage Live Competition Timeline */}
      <div className="mx-auto max-w-[1440px]">
        <BroadcastPhaseBar status={event?.status ?? 'not_started'} />
      </div>

      {/* Main Editorial Container */}
      <main className="mx-auto max-w-[1440px]">
        {/* Asymmetric Split Hero */}
        <section className="grid grid-cols-1 border-b border-[#222226] lg:grid-cols-12">
          {/* Left: Monumental Masked Typography */}
          <div className="relative flex flex-col justify-between border-b border-[#222226] p-5 sm:p-10 lg:col-span-8 lg:border-r lg:border-b-0 lg:p-14">
            <CornerMarks />

            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-[#8E8E93] sm:text-xs sm:tracking-[0.18em]">
              <span>[ 01 / LIVE COMPETITION ]</span>
              <span className={`truncate pl-3 ${isLive ? 'font-bold text-[#FF2E17]' : 'text-[#8E8E93]'}`}>
                {event?.name ?? 'SEASON LIVE'}
              </span>
            </div>

            <div className="my-7 sm:my-10 lg:my-14">
              <h1 className="font-display text-[clamp(3.35rem,14vw,8.75rem)] font-extrabold uppercase leading-[0.86] tracking-[-0.02em] text-[#F4F2EC]">
                {['ONE VOTE.', 'ONE SAVED.'].map((line, i) => (
                  <span key={line} className="block overflow-hidden">
                    <motion.span
                      className="block"
                      initial={{ y: '105%' }}
                      animate={{ y: 0 }}
                      transition={{
                        duration: 0.5,
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
                      duration: 0.5,
                      delay: 0.16,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    WHO RISES.
                  </motion.span>
                </span>
              </h1>
            </div>

            <div className="flex flex-col justify-between gap-5 border-t border-[#222226] pt-5 sm:flex-row sm:items-end sm:gap-6 sm:pt-6">
              <p className="max-w-md text-sm leading-relaxed text-[#A1A1AA]">
                Every competing team holds a single irrevocable ballot to save one rival from elimination.
                Zero-leakage synced and revealed live on stage.
              </p>

              <div className="grid grid-cols-2 gap-2.5 sm:flex sm:shrink-0 sm:items-center sm:gap-3">
                <Link
                  href="/login"
                  className="group inline-flex min-h-[48px] items-center justify-center gap-2 bg-[#F4F2EC] px-5 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#09090B] transition-all active:scale-[0.98] active:bg-[#FF2E17] active:text-white sm:px-6 sm:hover:bg-[#FF2E17] sm:hover:text-white"
                >
                  Cast Ballot
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
                <Link
                  href="/display"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 border border-[#27272A] px-4 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#F4F2EC] transition-all active:scale-[0.98] active:border-[#F4F2EC] sm:px-5 sm:hover:border-[#F4F2EC] sm:hover:bg-[#141418]"
                >
                  Stage View
                </Link>
              </div>
            </div>
          </div>

          {/* Right: Precision Dot-Matrix Telemetry Rail */}
          <div className="bg-telemetry-dots flex flex-col justify-between bg-[#0D0D10] lg:col-span-4">
            <div className="border-b border-[#222226] p-5 sm:p-8">
              <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-[#8E8E93]">
                <span>BROADCAST STATUS</span>
                <span className={connectionStatus === 'connected' ? 'text-[#22C55E]' : 'text-[#FF2E17]'}>
                  {connectionStatus === 'connected' ? '● SYNC' : '○ RETRY'}
                </span>
              </div>
              <div className="mt-2.5 flex items-center gap-3">
                <span
                  className={`h-2.5 w-2.5 ${
                    isLive ? 'animate-pulse bg-[#FF2E17]' : 'bg-[#F4F2EC]'
                  }`}
                />
                <p className="font-display text-2xl font-bold uppercase tracking-wide text-[#F4F2EC] sm:text-3xl">
                  {event?.status.replace('_', ' ') ?? 'STANDBY'}
                </p>
              </div>
            </div>

            {/* Key Rolling Metrics */}
            <div className="grid grid-cols-2 divide-x divide-[#222226] border-b border-[#222226] bg-[#0B0B0E]/80">
              <div className="p-5 sm:p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8E8E93] sm:text-[11px]">
                  TEAMS
                </p>
                <p className="mt-2 font-display text-5xl font-extrabold tabular-nums leading-none text-[#F4F2EC] sm:text-6xl">
                  <AnimatedNumber value={event?.active_team_count ?? teams.length} padZero />
                </p>
              </div>
              <div className="p-5 sm:p-8">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#8E8E93] sm:text-[11px]">
                  BALLOTS IN
                </p>
                <p className="mt-2 font-display text-5xl font-extrabold tabular-nums leading-none text-[#FF2E17] sm:text-6xl">
                  <AnimatedNumber value={event?.valid_vote_count ?? 0} padZero />
                </p>
              </div>
            </div>

            {/* Segmented Broadcast Meter */}
            <div className="p-5 sm:p-8">
              <div className="mb-3 flex items-baseline justify-between font-mono text-xs uppercase tracking-[0.16em]">
                <span className="text-[#8E8E93]">COMPLETION</span>
                <span className="text-lg font-bold tabular-nums text-[#F4F2EC]">
                  <AnimatedNumber value={progressPercentage} decimals={1} />%
                </span>
              </div>

              <SegmentedProgressBar percentage={progressPercentage} segments={20} />

              <div className="mt-3.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.15em] text-[#8E8E93] sm:text-[11px]">
                <span>{remaining} PENDING</span>
                <span>ZERO-LEAKAGE</span>
              </div>
            </div>
          </div>
        </section>

        {/* Live Reveal / Final Podium Section */}
        {event && (event.status === 'revealing' || event.status === 'completed') && (
          <section className="border-b border-[#222226] bg-[#0B0B0E] px-5 py-10 sm:px-10 sm:py-14 lg:px-14">
            <SuspenseReveal event={event} />
          </section>
        )}

        {/* Competing Teams Roster */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#222226] px-5 py-4 sm:px-10 sm:py-5 lg:px-14">
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93] sm:text-xs">
                [ 02 / ROSTER ]
              </span>
              <h2 className="font-display text-2xl font-extrabold uppercase tracking-[0.04em] text-[#F4F2EC] sm:text-3xl">
                COMPETING TEAMS
              </h2>
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93] sm:text-xs">
              {String(teams.length).padStart(2, '0')} ACTIVE
            </span>
          </div>

          {teams.length === 0 ? (
            <div className="px-5 py-16 text-center font-mono text-xs uppercase tracking-[0.2em] text-[#8E8E93]">
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
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className={`group relative flex flex-col justify-between border-b border-[#222226] p-5 transition-colors duration-150 sm:border-r sm:p-8 lg:p-9 ${
                        isNew
                          ? 'bg-[#FF2E17] text-white'
                          : 'bg-[#09090B] active:bg-[#F4F2EC] active:text-[#09090B] sm:hover:bg-[#F4F2EC] sm:hover:text-[#09090B]'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em]">
                        <span
                          className={
                            isNew
                              ? 'text-white/90'
                              : 'text-[#8E8E93] group-active:text-[#09090B]/60 sm:group-hover:text-[#09090B]/60'
                          }
                        >
                          NO. {serial}
                        </span>
                        <span
                          className={
                            isNew
                              ? 'font-bold text-white'
                              : 'text-[#8E8E93] group-active:text-[#09090B]/70 sm:group-hover:text-[#09090B]/70'
                          }
                        >
                          {isNew ? '● NEW ENTRY' : team.team_code}
                        </span>
                      </div>

                      <h3 className="mt-5 font-display text-3xl font-extrabold uppercase tracking-tight transition-transform duration-200 sm:mt-10 sm:text-5xl sm:group-hover:translate-x-1">
                        {team.team_name}
                      </h3>

                      <div className="mt-5 flex items-center justify-between border-t border-current/15 pt-3 font-mono text-[10px] uppercase tracking-[0.2em] opacity-60 sm:mt-8 sm:pt-4">
                        <span>STATUS: ELIGIBLE</span>
                        <span className="inline-flex items-center gap-1">
                          STAGE LOCKED
                          <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity duration-200 sm:group-hover:opacity-100" />
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

      {/* Fixed Thumb-Zone Mobile Bottom Dock */}
      <nav
        aria-label="Mobile Navigation"
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-[#222226] bg-[#09090B]/95 backdrop-blur-md md:hidden"
      >
        <div
          className={`grid divide-x divide-[#222226] ${
            hasArchives ? 'grid-cols-5' : 'grid-cols-4'
          }`}
        >
          <Link
            href="/"
            className="flex min-h-[58px] flex-col items-center justify-center gap-1 text-[#F4F2EC] active:bg-[#141418]"
          >
            <Radio className="h-4 w-4 text-[#FF2E17]" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em]">
              Live
            </span>
          </Link>

          <Link
            href="/display"
            className="flex min-h-[58px] flex-col items-center justify-center gap-1 text-[#8E8E93] active:bg-[#141418] active:text-[#F4F2EC]"
          >
            <Monitor className="h-4 w-4" />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em]">Stage</span>
          </Link>

          {hasArchives && (
            <Link
              href="/results"
              className="flex min-h-[58px] flex-col items-center justify-center gap-1 text-[#8E8E93] active:bg-[#141418] active:text-[#F4F2EC]"
            >
              <Archive className="h-4 w-4" />
              <span className="font-mono text-[9px] uppercase tracking-[0.14em]">Archive</span>
            </Link>
          )}

          <Link
            href="/admin"
            className="flex min-h-[58px] flex-col items-center justify-center gap-1 text-[#8E8E93] active:bg-[#141418] active:text-[#F4F2EC]"
          >
            <Shield className="h-4 w-4" />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em]">Admin</span>
          </Link>

          <Link
            href="/login"
            className="flex min-h-[58px] flex-col items-center justify-center gap-1 bg-[#F4F2EC] text-[#09090B] active:bg-[#FF2E17] active:text-white"
          >
            <Vote className="h-4 w-4" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.14em]">
              Vote
            </span>
          </Link>
        </div>
      </nav>
    </div>
  );
}