'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Square, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { EventRecord } from '@/types/database';

type VotingAction = 'start_voting' | 'close_voting' | 'reset_voting';

export function VotingControls({ event }: { event: EventRecord }) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<VotingAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const modalConfig: Record<
    VotingAction,
    { title: string; description: string; warning?: string; confirmLabel: string; btnClass: string }
  > = {
    start_voting: {
      title: 'START LIVE VOTING?',
      description: `The audience ballot for "${event.name}" will open immediately.`,
      confirmLabel: 'Start Voting',
      btnClass: 'bg-[#F4F2EC] text-[#09090B] hover:bg-[#FF2E17] hover:text-white',
    },
    close_voting: {
      title: 'CLOSE VOTING NOW?',
      description: `No further ballots will be accepted for "${event.name}" once closed.`,
      warning: `${event.valid_vote_count} audience vote(s) have been recorded. Closing stops any further ballots.`,
      confirmLabel: 'Close Voting',
      btnClass: 'bg-[#FF2E17] text-white hover:bg-[#DC2626]',
    },
    reset_voting: {
      title: 'RESET EVENT?',
      description: `This clears all ${event.valid_vote_count} recorded vote(s) and results for "${event.name}", keeps all teams intact, and returns the event to NOT STARTED.`,
      warning: 'This action cannot be undone and is recorded in the audit log.',
      confirmLabel: 'Reset Event',
      btnClass: 'bg-[#FF2E17] text-white hover:bg-[#DC2626]',
    },
  };

  async function handleConfirm() {
    if (!pendingAction) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: pendingAction, eventId: event.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      if (pendingAction === 'start_voting') toast.success('Voting is now LIVE.');
      else if (pendingAction === 'close_voting') toast.success('Voting closed.');
      else toast.success('Event reset to Not Started.');

      setPendingAction(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setIsSubmitting(false);
    }
  }

  const activeConfig = pendingAction ? modalConfig[pendingAction] : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2.5">
        {event.status === 'not_started' && (
          <button
            type="button"
            onClick={() => setPendingAction('start_voting')}
            className="inline-flex min-h-[44px] items-center gap-2 bg-[#F4F2EC] px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#09090B] transition-colors hover:bg-[#FF2E17] hover:text-white"
          >
            <Play className="h-3.5 w-3.5" /> Start Voting
          </button>
        )}

        {event.status === 'voting_live' && (
          <button
            type="button"
            onClick={() => setPendingAction('close_voting')}
            className="inline-flex min-h-[44px] items-center gap-2 bg-[#FF2E17] px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#DC2626]"
          >
            <Square className="h-3.5 w-3.5" /> Close Voting
          </button>
        )}

        {event.status !== 'not_started' && (
          <button
            type="button"
            onClick={() => setPendingAction('reset_voting')}
            className="inline-flex min-h-[44px] items-center gap-2 border border-[#27272A] bg-[#111114] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#F4F2EC] transition-colors hover:border-[#FF2E17] hover:text-[#FF2E17]"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset Event
          </button>
        )}
      </div>

      <Dialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setPendingAction(null);
        }}
      >
        <DialogContent className="rounded-none border-[#F4F2EC] bg-[#09090B] text-[#F4F2EC] sm:max-w-md">
          {activeConfig && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-3xl font-extrabold uppercase tracking-tight">
                  {activeConfig.title}
                </DialogTitle>
                <DialogDescription className="pt-1 text-sm text-[#A1A1AA]">
                  {activeConfig.description}
                </DialogDescription>
              </DialogHeader>

              {activeConfig.warning && (
                <div className="flex items-start gap-3 border border-[#FF2E17]/40 bg-[#FF2E17]/10 p-3 font-mono text-xs text-[#FF2E17]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{activeConfig.warning}</span>
                </div>
              )}

              <DialogFooter className="mt-2 gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setPendingAction(null)}
                  className="min-h-[44px] border border-[#27272A] px-4 py-2.5 font-mono text-xs uppercase tracking-[0.16em] text-[#F4F2EC] hover:border-[#F4F2EC]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirm}
                  className={`inline-flex min-h-[44px] items-center justify-center px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.16em] transition-colors ${activeConfig.btnClass}`}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                  {activeConfig.confirmLabel}
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}