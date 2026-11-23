'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, CheckCircle2, AlertTriangle, Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { useEventRealtime } from '@/hooks/useEventRealtime';
import type { EventRecord, TeamRecord } from '@/types/database';
import { Button } from '@/components/ui/button';

interface Props {
  initialEvent: EventRecord;
  initialTeams: TeamRecord[];
  currentTeam: TeamRecord & { has_voted: boolean };
}

export function TeamVotingDashboard({ initialEvent, initialTeams, currentTeam }: Props) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const { event, teams } = useEventRealtime(initialEvent, initialTeams);
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
      toast.success('Your vote has been securely recorded!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error submitting vote.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8">
      {/* Top Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur md:flex-row md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
            Authenticated Team • {currentTeam.team_code}
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">Welcome, {currentTeam.team_name}!</h1>
          <p className="mt-1 text-slate-300">
            Choose ONE team you want to save from the competition.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider ${
              isVotingLive
                ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/40'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isVotingLive ? 'animate-pulse bg-emerald-400' : 'bg-slate-500'
              }`}
            />
            {event?.status.replace('_', ' ')}
          </span>

          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>

      {/* Voted Success Screen */}
      {hasVoted ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto max-w-2xl rounded-2xl border border-amber-500/30 bg-slate-950/90 p-12 text-center shadow-2xl"
        >
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-amber-400" />
          <h2 className="text-3xl font-black tracking-tight text-white">
            YOUR VOTE HAS BEEN CAST!
          </h2>
          <p className="mt-3 text-slate-300">
            Your decision has been recorded. The fate of the competition is now in everyone&apos;s hands.
          </p>
        </motion.div>
      ) : (
        <>
          {!isVotingLive && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm font-medium text-amber-300">
              {event?.status === 'not_started'
                ? 'Voting has not started yet. This page will unlock automatically the moment the administrator starts voting.'
                : 'Voting has closed. No further votes can be submitted.'}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-950/50 p-4 text-red-200">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
              <p>{error}</p>
            </div>
          )}

          {/* Eligible Teams Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {teams.map((team) => {
                const isSelf = team.id === currentTeam.id;
                const isSelected = selectedTeam?.id === team.id;

                return (
                  <motion.button
                    key={team.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    disabled={isSelf || !isVotingLive}
                    onClick={() => setSelectedTeam(team)}
                    className={`flex flex-col items-start rounded-xl border p-6 text-left transition ${
                      isSelf
                        ? 'cursor-not-allowed border-slate-800 bg-slate-950/50 opacity-50'
                        : isSelected
                          ? 'border-amber-400 bg-amber-500/10 ring-2 ring-amber-400/50'
                          : isVotingLive
                            ? 'cursor-pointer border-slate-800 bg-slate-900/80 hover:border-amber-500/50 hover:bg-slate-900'
                            : 'cursor-not-allowed border-slate-800 bg-slate-900/40 opacity-60'
                    }`}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-mono text-xs text-slate-400">{team.team_code}</span>
                      {isSelf ? (
                        <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                          <Lock className="h-3 w-3" /> Your Team
                        </span>
                      ) : isSelected ? (
                        <ShieldCheck className="h-5 w-5 text-amber-400" />
                      ) : null}
                    </div>
                    <h2 className="mt-3 text-xl font-bold text-white">{team.team_name}</h2>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {selectedTeam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-950 p-8 shadow-2xl"
            >
              <h3 className="text-2xl font-black text-white">Confirm Your Save Vote</h3>
              <p className="mt-3 text-slate-300">
                You are about to cast your vote to{' '}
                <span className="font-bold text-amber-400">SAVE {selectedTeam.team_name}</span>.
              </p>
              <p className="mt-2 text-sm text-rose-400">
                Are you sure you want to proceed? This action cannot be undone.
              </p>

              <div className="mt-8 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => setSelectedTeam(null)}
                  className="flex-1"
                >
                  Go Back
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmVote}
                  className="flex-1 bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Vote'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}