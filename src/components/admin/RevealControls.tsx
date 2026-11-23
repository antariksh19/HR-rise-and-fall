'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Archive,
  RotateCcw,
  Loader2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { EventRecord, RankedTeam, RevealStage } from '@/types/database';

const STEPS: { stage: RevealStage; index: string; label: string; buttonText: string }[] = [
  { stage: 'intro', index: '01', label: 'Suspense Intro', buttonText: 'Start Reveal Sequence' },
  { stage: 'third_place', index: '02', label: 'Third Place (Bronze)', buttonText: 'Reveal Third Place' },
  { stage: 'second_place', index: '03', label: 'Second Place (Silver)', buttonText: 'Reveal Second Place' },
  { stage: 'first_place', index: '04', label: 'First Place (Champion)', buttonText: 'Reveal First Place' },
  { stage: 'finished', index: '05', label: 'Finalize & Archive', buttonText: 'Complete & Archive Results' },
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
          ? 'Results finalized and archived.'
          : `Stage unlocked: ${nextStep.label}`
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

      toast.success('Event reset to Not Started. All teams can vote again.');
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
      {/* Left: Sequencer */}
      <div className="flex flex-col justify-between border border-[#222226] bg-[#0D0D10] p-6 sm:p-8">
        <div>
          <div className="flex items-start justify-between border-b border-[#222226] pb-5">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#FF2E17]">
                STAGE SYNCHRONIZER
              </p>
              <h3 className="mt-1 font-display text-3xl font-extrabold uppercase">
                LIVE REVEAL SEQUENCER
              </h3>
            </div>
            <span className="border border-[#27272A] bg-[#09090B] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#F4F2EC]">
              {event.reveal_stage.replace('_', ' ')}
            </span>
          </div>

          <div className="mt-6 divide-y divide-[#222226] border border-[#222226]">
            {STEPS.map((step, idx) => {
              const stepStageIdx = idx + 1;
              const isDone = currentIdx >= stepStageIdx;
              const isNext = canReveal && currentIdx + 1 === stepStageIdx;

              return (
                <div
                  key={step.stage}
                  className={`flex items-center justify-between px-4 py-3.5 font-mono text-xs uppercase tracking-[0.14em] ${
                    isDone
                      ? 'bg-[#141418] text-[#22C55E]'
                      : isNext
                        ? 'bg-[#F4F2EC] font-bold text-[#09090B]'
                        : 'bg-[#09090B] text-[#52525B]'
                  }`}
                >
                  <span>
                    {step.index} / {step.label}
                  </span>
                  {isDone ? (
                    <Check className="h-4 w-4" />
                  ) : isNext ? (
                    <span className="text-[#FF2E17]">UP NEXT</span>
                  ) : (
                    <span>LOCKED</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6">
          {canReveal && nextStep ? (
            <button
              type="button"
              disabled={loading}
              onClick={advanceReveal}
              className="flex w-full items-center justify-center gap-2 bg-[#FF2E17] py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#F4F2EC] hover:text-[#09090B] disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : nextStep.stage === 'finished' ? (
                <Archive className="h-4 w-4" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {nextStep.buttonText}
            </button>
          ) : event.status === 'completed' ? (
            <div className="space-y-4 border border-[#22C55E]/30 bg-[#22C55E]/10 p-5 text-center">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#22C55E]">
                ● EVENT COMPLETED &amp; RESULTS PUBLISHED
              </p>
              <button
                type="button"
                onClick={() => setResetConfirmOpen(true)}
                className="flex w-full items-center justify-center gap-2 bg-[#F4F2EC] py-3.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#09090B] transition-colors hover:bg-[#FF2E17] hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset Event
              </button>
            </div>
          ) : (
            <div className="border border-[#222226] bg-[#09090B] p-4 text-center font-mono text-xs uppercase tracking-[0.16em] text-[#71717A]">
              CLOSE VOTING FIRST TO UNLOCK REVEAL SEQUENCE.
            </div>
          )}
        </div>
      </div>

      {/* Right: Calculated Standings */}
      <div className="border border-[#222226] bg-[#0D0D10] p-6 sm:p-8">
        <div className="border-b border-[#222226] pb-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8E8E93]">
            PRIVATE PREVIEW // NEVER EXPOSED UNTIL REVEALED
          </p>
          <h3 className="mt-1 font-display text-3xl font-extrabold uppercase">
            CALCULATED STANDINGS
          </h3>
        </div>

        {rankings.length === 0 ? (
          <p className="py-12 text-center font-mono text-xs uppercase tracking-[0.2em] text-[#52525B]">
            NO ACTIVE TEAMS TO RANK YET.
          </p>
        ) : (
          <div className="mt-6 divide-y divide-[#222226] border border-[#222226]">
            {rankings.map((team) => (
              <div
                key={team.team_id}
                className="flex items-center justify-between bg-[#09090B] px-5 py-4"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`flex h-9 w-9 items-center justify-center font-mono text-xs font-bold ${
                      team.rank === 1
                        ? 'bg-[#F4F2EC] text-[#09090B]'
                        : team.rank === 2
                          ? 'bg-[#3F3F46] text-[#F4F2EC]'
                          : team.rank === 3
                            ? 'bg-[#B45309] text-white'
                            : 'border border-[#27272A] text-[#71717A]'
                    }`}
                  >
                    #{team.rank}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-display text-2xl font-bold uppercase text-[#F4F2EC]">
                        {team.team_name}
                      </p>
                      {team.is_tied && (
                        <span className="border border-[#FF2E17]/40 bg-[#FF2E17]/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-[#FF2E17]">
                          TIED
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-[#71717A]">
                      {team.team_code}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-base font-bold tabular-nums text-[#F4F2EC]">
                  {team.votes} {team.votes === 1 ? 'VOTE' : 'VOTES'}
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
        <DialogContent className="rounded-none border-[#F4F2EC] bg-[#09090B] text-[#F4F2EC] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl font-extrabold uppercase tracking-tight">
              RESET &ldquo;{event.name}&rdquo;?
            </DialogTitle>
            <DialogDescription className="pt-1 text-sm text-[#A1A1AA]">
              Clears all recorded votes and final results, keeps registered teams intact, and returns the event to NOT STARTED.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-start gap-3 border border-[#FF2E17]/40 bg-[#FF2E17]/10 p-3 font-mono text-xs text-[#FF2E17]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>This action cannot be undone and is recorded in the audit log.</span>
          </div>

          <DialogFooter className="mt-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => setResetConfirmOpen(false)}
              className="border border-[#27272A] px-4 py-2.5 font-mono text-xs uppercase tracking-[0.16em] text-[#F4F2EC] hover:border-[#F4F2EC]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleResetEvent}
              className="inline-flex items-center justify-center bg-[#FF2E17] px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#DC2626]"
            >
              {loading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
              Reset Event
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}