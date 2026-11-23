'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Square, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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

  const remaining = Math.max(0, event.active_team_count - event.valid_vote_count);

  const modalConfig: Record<
    VotingAction,
    { title: string; description: string; warning?: string; confirmLabel: string; btnClass: string }
  > = {
    start_voting: {
      title: 'Start Live Voting?',
      description: `All ${event.active_team_count} active teams in "${event.name}" will immediately be unlocked to cast their vote.`,
      confirmLabel: 'Start Voting',
      btnClass: 'bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400',
    },
    close_voting: {
      title: 'Close Voting Manually?',
      description: `No further votes will be accepted for "${event.name}" once closed.`,
      warning:
        remaining > 0
          ? `${remaining} active team(s) have NOT voted yet.`
          : undefined,
      confirmLabel: 'Close Voting',
      btnClass: 'bg-red-600 font-bold text-white hover:bg-red-500',
    },
    reset_voting: {
      title: 'Reset Event?',
      description: `This will clear all ${event.valid_vote_count} recorded vote(s) and results for "${event.name}", unlock every team to vote again, and return the event to NOT STARTED.`,
      warning: 'This action cannot be undone and will be recorded in the admin audit log.',
      confirmLabel: 'Reset Event',
      btnClass: 'bg-amber-500 font-bold text-slate-950 hover:bg-amber-400',
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

      if (pendingAction === 'start_voting') toast.success('Voting is now LIVE!');
      else if (pendingAction === 'close_voting') toast.success('Voting has been closed.');
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
      <div className="flex flex-wrap items-center gap-3">
        {event.status === 'not_started' && (
          <Button
            onClick={() => setPendingAction('start_voting')}
            className="bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400"
          >
            <Play className="mr-2 h-4 w-4" />
            START VOTING
          </Button>
        )}

        {event.status === 'voting_live' && (
          <Button
            variant="destructive"
            onClick={() => setPendingAction('close_voting')}
            className="font-bold"
          >
            <Square className="mr-2 h-4 w-4" />
            CLOSE VOTING
          </Button>
        )}

        {event.status !== 'not_started' && (
          <Button
            variant="outline"
            onClick={() => setPendingAction('reset_voting')}
            className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            RESET EVENT
          </Button>
        )}
      </div>

      <Dialog
        open={pendingAction !== null}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) setPendingAction(null);
        }}
      >
        <DialogContent className="border-slate-800 bg-slate-950 text-white sm:max-w-md">
          {activeConfig && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-white">
                  {activeConfig.title}
                </DialogTitle>
                <DialogDescription className="pt-1 text-slate-300">
                  {activeConfig.description}
                </DialogDescription>
              </DialogHeader>

              {activeConfig.warning && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <span>{activeConfig.warning}</span>
                </div>
              )}

              <DialogFooter className="mt-2 gap-2 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => setPendingAction(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirm}
                  className={activeConfig.btnClass}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {activeConfig.confirmLabel}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}