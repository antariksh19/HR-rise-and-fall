'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Check, AlertTriangle, Loader2, LogOut, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useEventRealtime } from '@/hooks/useEventRealtime';
import {
  LiveTimecode,
  SegmentedProgressBar,
  CornerMarks,
} from '@/components/ui/BroadcastPrimitives';
import type { EventRecord, TeamRecord } from '@/types/database';

interface Props {
  initialEvent: EventRecord;
  initialTeams: TeamRecord[];
  currentTeam: TeamRecord & { has_voted: boolean };
}

export function TeamVotingDashboard({ initialEvent, initialTeams, currentTeam }: Props) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const { event, teams, progressPercentage } = useEventRealtime(initialEvent, initialTeams);
  const [selectedTeam, setSelectedTeam] = useState<TeamRecord | null>(null);
  const [hasVoted, setHasVoted] = useState(currentTeam.has_voted);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isVotingLive = event?.status === 'voting_live';

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  async function handleConfirmVote() {
    if (!selectedTeam || isSubmitting || hasVoted) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetTeamId: selectedTeam.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit vote.');

      setHasVoted(true);
      setSelectedTeam(null);
      toast.success('Ballot locked and recorded.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error submitting vote.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="broadcast-grain min-h-screen bg-[#09090B] text-[#F4F2EC]">
      {/* Header Bar */}
      <header className="border-b border-[#222226] bg-[#09090B]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-stretch justify-between">
          <div className="flex items-center gap-4 px-6 py-5 sm:px-10">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              {isVotingLive && (
                <span className="absolute inline-flex h-full w-full animate-ping bg-[#FF2E17] opacity-75" />
              )}
              <span
                className={`relative inline-flex h-2.5 w-2.5 ${
                  isVotingLive ? 'bg-[#FF2E17]' : 'bg-[#52525B]'
                }`}
              />
            </span>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8E8E93]">
                AUTHENTICATED // {currentTeam.team_code}
              </p>
              <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight sm:text-4xl">
                {currentTeam.team_name}
              </h1>
            </div>
          </div>

          <div className="flex items-stretch">
            <div className="hidden items-center border-l border-[#222226] px-5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#71717A] md:flex">
              <LiveTimecode />
            </div>

            <div className="flex items-center border-l border-[#222226] px-6 font-mono text-xs uppercase tracking-[0.18em]">
              <span className={isVotingLive ? 'font-bold text-[#FF2E17]' : 'text-[#8E8E93]'}>
                {event?.status.replace('_', ' ')}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-2 border-l border-[#222226] px-6 font-mono text-xs uppercase tracking-[0.18em] text-[#8E8E93] transition-colors hover:bg-[#141417] hover:text-[#F4F2EC]"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Live Turnout Bar */}
      {isVotingLive && (
        <div className="border-b border-[#222226] bg-[#0D0D10] px-6 py-3 sm:px-10">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
            <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.2em] text-[#8E8E93]">
              LIVE TURNOUT: <strong className="text-[#F4F2EC]">{progressPercentage}%</strong>
            </span>
            <div className="flex-1">
              <SegmentedProgressBar percentage={progressPercentage} segments={32} />
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-[1440px]">
        {hasVoted ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-telemetry-dots relative mx-auto my-20 max-w-2xl border border-[#222226] bg-[#0D0D10] p-12 text-center"
          >
            <CornerMarks />
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center bg-[#F4F2EC] text-[#09090B]">
              <Check className="h-7 w-7 stroke-[3]" />
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#FF2E17]">
              BALLOT SEALED
            </p>
            <h2 className="mt-2 font-display text-5xl font-extrabold uppercase sm:text-6xl">
              YOUR VOTE IS LOCKED.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#A1A1AA]">
              Your decision has been cryptographically recorded. Watch the stage display for the live Top Three Reveal.
            </p>
          </motion.div>
        ) : (
          <>
            {/* Instruction Banner */}
            <div className="flex flex-col justify-between gap-4 border-b border-[#222226] px-6 py-8 sm:px-10 md:flex-row md:items-end">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#FF2E17]">
                  [ SELECT ONE TEAM TO SAVE ]
                </p>
                <h2 className="mt-2 font-display text-4xl font-extrabold uppercase sm:text-5xl">
                  CAST YOUR OFFICIAL BALLOT
                </h2>
              </div>
              {!isVotingLive && (
                <div className="border border-[#27272A] bg-[#141417] px-4 py-2.5 font-mono text-xs uppercase tracking-[0.14em] text-[#A1A1AA]">
                  {event?.status === 'not_started'
                    ? 'STANDBY — UNLOCKS AUTOMATICALLY WHEN VOTING STARTS'
                    : 'VOTING IS CLOSED'}
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-3 border-b border-[#FF2E17] bg-[#FF2E17]/10 px-6 py-4 font-mono text-xs uppercase tracking-wider text-[#FF2E17] sm:px-10">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Hairline Team Selection Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {teams.map((team, idx) => {
                  const isSelf = team.id === currentTeam.id;
                  const isSelected = selectedTeam?.id === team.id;
                  const serial = String(idx + 1).padStart(2, '0');

                  return (
                    <motion.button
                      key={team.id}
                      layout
                      type="button"
                      disabled={isSelf || !isVotingLive}
                      onClick={() => setSelectedTeam(team)}
                      className={`group flex flex-col justify-between border-b border-r border-[#222226] p-8 text-left transition-colors duration-150 ${
                        isSelf
                          ? 'cursor-not-allowed bg-[#0B0B0D] opacity-40'
                          : isSelected
                            ? 'bg-[#FF2E17] text-white'
                            : isVotingLive
                              ? 'cursor-pointer bg-[#09090B] hover:bg-[#F4F2EC] hover:text-[#09090B]'
                              : 'cursor-not-allowed bg-[#09090B] opacity-50'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em]">
                        <span className="opacity-60">NO. {serial}</span>
                        {isSelf ? (
                          <span className="inline-flex items-center gap-1.5 opacity-80">
                            <Lock className="h-3 w-3" /> YOUR TEAM
                          </span>
                        ) : (
                          <span className="opacity-60">{team.team_code}</span>
                        )}
                      </div>

                      <p className="mt-10 font-display text-4xl font-extrabold uppercase tracking-tight transition-transform duration-200 group-hover:translate-x-1 sm:text-5xl">
                        {team.team_name}
                      </p>

                      <div className="mt-8 flex w-full items-center justify-between border-t border-current/15 pt-4 font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
                        <span>
                          {isSelf
                            ? 'SELF-VOTING PROHIBITED'
                            : isVotingLive
                              ? 'SELECT TO SAVE'
                              : 'LOCKED'}
                        </span>
                        {!isSelf && isVotingLive && (
                          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </>
        )}
      </main>

      {/* Sharp Confirmation Modal */}
      <AnimatePresence>
        {selectedTeam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="relative w-full max-w-md border border-[#F4F2EC] bg-[#09090B] p-8"
            >
              <CornerMarks />
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#FF2E17]">
                FINAL CONFIRMATION
              </p>
              <h3 className="mt-2 font-display text-4xl font-extrabold uppercase">
                SAVE {selectedTeam.team_name}?
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#A1A1AA]">
                You are casting your team&apos;s sole vote to save{' '}
                <strong className="text-[#F4F2EC]">{selectedTeam.team_name}</strong>.
                Once submitted, this ballot is permanently locked and cannot be changed.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setSelectedTeam(null)}
                  className="border border-[#27272A] px-4 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#F4F2EC] transition-colors hover:border-[#F4F2EC]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmVote}
                  className="flex items-center justify-center bg-[#FF2E17] px-4 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#F4F2EC] hover:text-[#09090B]"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Ballot'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}