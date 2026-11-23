'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Trophy,
  Archive,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { EventRecord, RankedTeam, RevealStage } from '@/types/database';

const STEPS: { stage: RevealStage; label: string; buttonText: string }[] = [
  { stage: 'intro', label: 'Stage 1: Suspense Intro', buttonText: 'START REVEAL' },
  { stage: 'third_place', label: 'Stage 2: Third Place', buttonText: 'REVEAL THIRD PLACE' },
  { stage: 'second_place', label: 'Stage 3: Second Place', buttonText: 'REVEAL SECOND PLACE' },
  { stage: 'first_place', label: 'Stage 4: First Place (Winner)', buttonText: 'REVEAL FIRST PLACE' },
  { stage: 'finished', label: 'Stage 5: Complete & Archive', buttonText: 'COMPLETE & ARCHIVE RESULTS' },
];

const STAGE_ORDER: RevealStage[] = [
  'locked',
  'intro',
  'third_place',
  'second_place',
  'first_place',
  'finished',
];

export function RevealControls({
  event,
  rankings,
}: {
  event: EventRecord;
  rankings: RankedTeam[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const currentIdx = STAGE_ORDER.indexOf(event.reveal_stage);
  const nextStep = STEPS[currentIdx];
  const canReveal = ['voting_completed', 'revealing'].includes(event.status);

  async function advanceReveal() {
    if (!nextStep || loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, nextStage: nextStep.stage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to advance reveal.');

      toast.success(
        nextStep.stage === 'finished'
          ? 'Results finalized and saved!'
          : `Advanced reveal to: ${nextStep.label}`
      );
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reveal error');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetEvent() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_voting', eventId: event.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset event.');

      toast.success('Event reset to Not Started! All teams can vote again.');
      setResetConfirmOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error resetting event');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left: Synchronized Reveal Sequencer */}
      <div className="space-y-5 rounded-xl border border-slate-800 bg-slate-950/70 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-white">Live Reveal Sequencer</h3>
            <p className="text-xs text-slate-400">
              Synchronizes Public Dashboard &amp; Event Hall Display in real time.
            </p>
          </div>
          <Badge className="bg-amber-500/15 font-mono uppercase text-amber-400">
            {event.reveal_stage.replace('_', ' ')}
          </Badge>
        </div>

        <div className="space-y-2">
          {STEPS.map((step, idx) => {
            const stepStageIdx = idx + 1;
            const isDone = currentIdx >= stepStageIdx;
            const isNext = canReveal && currentIdx + 1 === stepStageIdx;

            return (
              <div
                key={step.stage}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm ${
                  isDone
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                    : isNext
                      ? 'border-amber-500/50 bg-amber-500/10 text-white'
                      : 'border-slate-800 bg-slate-900/40 text-slate-500'
                }`}
              >
                <span className="font-semibold">{step.label}</span>
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : isNext ? (
                  <span className="text-xs font-bold uppercase text-amber-400">Up Next</span>
                ) : (
                  <span className="text-xs">Locked</span>
                )}
              </div>
            );
          })}
        </div>

        {canReveal && nextStep ? (
          <Button
            disabled={loading}
            onClick={advanceReveal}
            className="w-full bg-amber-500 py-6 text-base font-black text-slate-950 hover:bg-amber-400"
          >
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : nextStep.stage === 'finished' ? (
              <Archive className="mr-2 h-5 w-5" />
            ) : (
              <Sparkles className="mr-2 h-5 w-5" />
            )}
            {nextStep.buttonText}
          </Button>
        ) : event.status === 'completed' ? (
          <div className="space-y-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
            <p className="text-sm font-bold text-emerald-300">
              Event completed and results published!
            </p>
            <Button
              onClick={() => setResetConfirmOpen(true)}
              className="w-full bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Reset Event
            </Button>
          </div>
        ) : (
          <p className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-center text-sm text-slate-400">
            Close voting first to unlock the Top Three Reveal sequence.
          </p>
        )}
      </div>

      {/* Right: Admin-Only Calculated Standings Preview */}
      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/70 p-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          <h3 className="text-lg font-black text-white">Calculated Standings (Admin Only)</h3>
        </div>
        <p className="text-xs text-slate-400">
          Authoritative server-side count. Ties share rank automatically. Never exposed publicly until revealed.
        </p>

        {rankings.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">No active teams to rank yet.</p>
        ) : (
          <div className="divide-y divide-slate-800 rounded-lg border border-slate-800">
            {rankings.map((team) => (
              <div key={team.team_id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                      team.rank === 1
                        ? 'bg-amber-500 text-slate-950'
                        : team.rank === 2
                          ? 'bg-slate-300 text-slate-950'
                          : team.rank === 3
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    #{team.rank}
                  </span>
                  <div>
                    <p className="font-bold text-white">
                      {team.team_name}{' '}
                      {team.is_tied && (
                        <span className="ml-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-400">
                          Tied
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-xs text-slate-400">{team.team_code}</p>
                  </div>
                </div>
                <span className="font-mono text-lg font-black text-amber-400">
                  {team.votes} {team.votes === 1 ? 'vote' : 'votes'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reset Event Confirmation Dialog */}
      <Dialog
        open={resetConfirmOpen}
        onOpenChange={(o) => !o && !loading && setResetConfirmOpen(false)}
      >
        <DialogContent className="border-slate-800 bg-slate-950 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white">
              Reset &ldquo;{event.name}&rdquo;?
            </DialogTitle>
            <DialogDescription className="pt-1 text-slate-300">
              This will clear all recorded votes and final results, keep your registered teams intact, and return the event back to NOT STARTED.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <span>This action cannot be undone and is recorded in the audit log.</span>
          </div>

          <DialogFooter className="mt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={() => setResetConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={loading}
              onClick={handleResetEvent}
              className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reset Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}