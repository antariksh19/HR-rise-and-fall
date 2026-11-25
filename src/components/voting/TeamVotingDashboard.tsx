'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock,
  Check,
  AlertTriangle,
  Loader2,
  LogOut,
  ArrowUpRight,
  Search,
} from 'lucide-react';
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
  const [query, setQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<TeamRecord | null>(null);
  const [hasVoted, setHasVoted] = useState(currentTeam.has_voted);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isVotingLive = event?.status === 'voting_live';

  const filteredTeams = teams.filter(
    (t) =>
      t.team_name.toLowerCase().includes(query.trim().toLowerCase()) ||
      t.team_code.toLowerCase().includes(query.trim().toLowerCase())
  );

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
    <div className="broadcast-grain pb-safe min-h-dvh bg-[#09090B] text-[#F4F2EC]">
      {/* Compact Sticky Header */}
      <header className="pt-safe sticky top-0 z-30 border-b border-[#222226] bg-[#09090B]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-stretch justify-between">
          <div className="flex min-w-0 items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-10 sm:py-5">
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
            <div className="min-w-0">
              <p className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-[#8E8E93] sm:text-[11px]">
                {currentTeam.team_code}
              </p>
              <h1 className="truncate font-display text-2xl font-extrabold uppercase leading-none tracking-tight sm:text-4xl">
                {currentTeam.team_name}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-stretch">
            <div className="hidden items-center border-l border-[#222226] px-5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#71717A] md:flex">
              <LiveTimecode />
            </div>

            <div className="hidden items-center border-l border-[#222226] px-5 font-mono text-xs uppercase tracking-[0.18em] sm:flex">
              <span className={isVotingLive ? 'font-bold text-[#FF2E17]' : 'text-[#8E8E93]'}>
                {event?.status.replace('_', ' ')}
              </span>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="flex min-w-[48px] items-center justify-center gap-2 border-l border-[#222226] px-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8E8E93] transition-colors active:bg-[#141417] active:text-[#F4F2EC] sm:px-6 sm:text-xs"
            >
              <LogOut className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Live Turnout Meter inside Sticky Header */}
        {isVotingLive && (
          <div className="border-t border-[#222226] bg-[#0D0D10] px-4 py-2.5 sm:px-10">
            <div className="mx-auto flex max-w-[1440px] items-center gap-4">
              <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-[#8E8E93] sm:text-[11px]">
                TURNOUT <strong className="text-[#F4F2EC]">{progressPercentage}%</strong>
              </span>
              <div className="flex-1">
                <SegmentedProgressBar percentage={progressPercentage} segments={20} />
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-[1440px]">
        {hasVoted ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-telemetry-dots relative mx-4 my-12 max-w-2xl border border-[#222226] bg-[#0D0D10] p-8 text-center sm:mx-auto sm:my-20 sm:p-12"
          >
            <CornerMarks />
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center bg-[#F4F2EC] text-[#09090B]">
              <Check className="h-7 w-7 stroke-[3]" />
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#FF2E17]">
              BALLOT SEALED
            </p>
            <h2 className="mt-2 font-display text-4xl font-extrabold uppercase sm:text-6xl">
              YOUR VOTE IS LOCKED.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#A1A1AA]">
              Your decision has been recorded. Watch the stage display for the live Top Three Reveal.
            </p>
          </motion.div>
        ) : (
          <>
            {/* Instruction Banner */}
            <div className="flex flex-col justify-between gap-3 border-b border-[#222226] px-4 py-5 sm:px-10 sm:py-8 md:flex-row md:items-end">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#FF2E17] sm:text-xs">
                  [ TAP ONE TEAM TO SAVE ]
                </p>
                <h2 className="mt-1 font-display text-3xl font-extrabold uppercase sm:text-5xl">
                  CAST YOUR BALLOT
                </h2>
              </div>
              {!isVotingLive && (
                <div className="border border-[#27272A] bg-[#141417] px-3.5 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#A1A1AA]">
                  {event?.status === 'not_started'
                    ? 'STANDBY — UNLOCKS WHEN VOTING STARTS'
                    : 'VOTING IS CLOSED'}
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-3 border-b border-[#FF2E17] bg-[#FF2E17]/10 px-4 py-3.5 font-mono text-xs uppercase tracking-wider text-[#FF2E17] sm:px-10">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Mobile-First Instant Search Bar (16px font prevents iOS zoom) */}
            <div className="flex items-center gap-3 border-b border-[#222226] bg-[#0D0D10] px-4 py-3 sm:px-10">
              <Search className="h-4 w-4 shrink-0 text-[#71717A]" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SEARCH TEAM NAME OR CODE..."
                className="w-full bg-transparent font-mono text-base uppercase tracking-[0.12em] text-[#F4F2EC] placeholder:text-[#52525B] focus:outline-none sm:text-xs"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="min-h-[36px] px-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8E8E93] active:text-[#F4F2EC]"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Hairline Team Selection Grid */}
            {filteredTeams.length === 0 ? (
              <div className="px-5 py-16 text-center font-mono text-xs uppercase tracking-[0.2em] text-[#52525B]">
                NO TEAMS MATCH &ldquo;{query}&rdquo;.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {filteredTeams.map((team, idx) => {
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
                        className={`group flex min-h-[120px] flex-col justify-between border-b border-[#222226] p-5 text-left transition-all duration-150 sm:border-r sm:p-8 ${
                          isSelf
                            ? 'cursor-not-allowed bg-[#0B0B0D] opacity-40'
                            : isSelected
                              ? 'bg-[#FF2E17] text-white'
                              : isVotingLive
                                ? 'cursor-pointer bg-[#09090B] active:scale-[0.99] active:bg-[#F4F2EC] active:text-[#09090B] sm:hover:bg-[#F4F2EC] sm:hover:text-[#09090B]'
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

                        <p className="mt-4 font-display text-3xl font-extrabold uppercase tracking-tight sm:mt-10 sm:text-5xl">
                          {team.team_name}
                        </p>

                        <div className="mt-4 flex w-full items-center justify-between border-t border-current/15 pt-3 font-mono text-[10px] uppercase tracking-[0.2em] opacity-80 sm:mt-8 sm:pt-4">
                          <span>
                            {isSelf
                              ? 'SELF-VOTING PROHIBITED'
                              : isVotingLive
                                ? 'TAP TO SAVE'
                                : 'LOCKED'}
                          </span>
                          {!isSelf && isVotingLive && (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </main>

      {/* Mobile Bottom Sheet / Desktop Centered Confirmation Modal */}
      <AnimatePresence>
        {selectedTeam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSubmitting && setSelectedTeam(null)}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 backdrop-blur-xs sm:items-center sm:p-4"
          >
            <motion.div
              initial={{ y: '100%', opacity: 0.8 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0.8 }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="pb-safe relative w-full border-t border-[#F4F2EC] bg-[#09090B] p-6 sm:max-w-md sm:border sm:p-8"
            >
              <CornerMarks />
              <div className="mx-auto mb-5 h-1 w-10 bg-[#27272A] sm:hidden" />

              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#FF2E17]">
                FINAL CONFIRMATION
              </p>
              <h3 className="mt-2 font-display text-4xl font-extrabold uppercase leading-none">
                SAVE {selectedTeam.team_name}?
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#A1A1AA]">
                You are casting your team&apos;s sole vote to save{' '}
                <strong className="text-[#F4F2EC]">{selectedTeam.team_name}</strong>.
                Once confirmed, this ballot is permanently locked.
              </p>

              <div className="mt-7 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmVote}
                  className="order-1 flex min-h-[52px] items-center justify-center bg-[#FF2E17] px-4 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-white transition-all active:scale-[0.98] sm:order-2 sm:hover:bg-[#F4F2EC] sm:hover:text-[#09090B]"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Ballot'}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setSelectedTeam(null)}
                  className="order-2 min-h-[48px] border border-[#27272A] px-4 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#F4F2EC] active:border-[#F4F2EC] sm:order-1 sm:hover:border-[#F4F2EC]"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}