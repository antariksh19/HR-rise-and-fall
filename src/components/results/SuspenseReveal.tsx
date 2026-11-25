'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Crown } from 'lucide-react';
import { CornerMarks } from '@/components/ui/BroadcastPrimitives';
import type { EventRecord, RankedTeam, RevealStage } from '@/types/database';

const STAGE_ORDER: RevealStage[] = [
  'locked',
  'intro',
  'third_place',
  'second_place',
  'first_place',
  'finished',
];

export function SuspenseReveal({
  event,
  large = false,
}: {
  event: EventRecord;
  large?: boolean;
}) {
  const [revealed, setRevealed] = useState<RankedTeam[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [winnerFlash, setWinnerFlash] = useState(false);
  const prevStageRef = useRef<RevealStage>(event.reveal_stage);

  const stageIdx = STAGE_ORDER.indexOf(event.reveal_stage);

  useEffect(() => {
    let active = true;

    async function loadRevealed() {
      const res = await fetch(`/api/public/results?eventId=${event.id}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      if (active) setRevealed(data.revealed ?? []);
    }

    const prevIdx = STAGE_ORDER.indexOf(prevStageRef.current);
    const isFreshReveal =
      stageIdx > prevIdx &&
      ['third_place', 'second_place', 'first_place'].includes(event.reveal_stage);

    prevStageRef.current = event.reveal_stage;

    if (isFreshReveal) {
      setCountdown(3);
      const t1 = setTimeout(() => setCountdown(2), 800);
      const t2 = setTimeout(() => setCountdown(1), 1600);
      const t3 = setTimeout(() => {
        setCountdown(null);
        loadRevealed();
        if (event.reveal_stage === 'first_place') {
          setWinnerFlash(true);
          setTimeout(() => setWinnerFlash(false), 650);
        }
      }, 2400);
      return () => {
        active = false;
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    } else {
      loadRevealed();
    }

    return () => {
      active = false;
    };
  }, [event.id, event.reveal_stage, event.status, stageIdx]);

  const first = revealed.filter((t) => t.rank === 1);
  const second = revealed.filter((t) => t.rank === 2);
  const third = revealed.filter((t) => t.rank === 3);

  const firstUnlocked = stageIdx >= 4 && countdown === null;
  const secondUnlocked = stageIdx >= 3 && countdown === null;
  const thirdUnlocked = stageIdx >= 2 && countdown === null;

  const maxVotes = Math.max(1, ...revealed.map((r) => r.votes));
  const totalEventVotes = Math.max(event.valid_vote_count, 1);

  const getShare = (votes: number) =>
    Math.min(100, Math.round((votes / totalEventVotes) * 100));

  const getBarWidth = (votes: number) =>
    Math.max(12, Math.round((votes / maxVotes) * 100));

  return (
    <div className="relative mx-auto w-full max-w-[1440px] space-y-10">
      {/* Dramatic White-Out Flash on Champion Unlock */}
      <AnimatePresence>
        {winnerFlash && (
          <motion.div
            initial={{ opacity: 0.85 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className="pointer-events-none fixed inset-0 z-50 bg-[#F4F2EC]"
          />
        )}
      </AnimatePresence>

      {/* Full-Screen Broadcast Countdown */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            key={countdown}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-telemetry-dots fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#09090B]"
          >
            {/* Converging Crosshair Lines */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              className="absolute top-1/2 h-px w-full bg-[#FF2E17]/40"
            />
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              className="absolute left-1/2 h-full w-px bg-[#FF2E17]/25"
            />

            {/* Expanding Geometric Frame */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0.9 }}
              animate={{ scale: 1.35, opacity: 0 }}
              transition={{ duration: 0.75, ease: 'easeOut' }}
              className="pointer-events-none absolute h-72 w-72 border border-[#FF2E17]/60 sm:h-96 sm:w-96"
            />

            <p className="relative border border-[#FF2E17]/40 bg-[#09090B] px-5 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.45em] text-[#FF2E17] sm:text-sm">
              {event.reveal_stage === 'first_place'
                ? 'GRAND CHAMPION REVEAL'
                : `REVEALING ${event.reveal_stage.replace('_', ' ').toUpperCase()}`}
            </p>

            <motion.span
              initial={{ scale: 0.65, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="relative mt-4 font-display text-[14rem] font-extrabold leading-none text-[#F4F2EC] sm:text-[21rem]"
            >
              0{countdown}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editorial Stage Headline */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#222226] pb-6 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#FF2E17]">
            {event.status === 'completed'
              ? '[ OFFICIAL AUDIENCE VERDICT ]'
              : '[ LIVE STAGE REVEAL ]'}
          </p>
          <h2
            className={`mt-2 font-display font-extrabold uppercase leading-[0.88] tracking-tight text-[#F4F2EC] ${
              large ? 'text-6xl lg:text-8xl' : 'text-4xl sm:text-6xl'
            }`}
          >
            {stageIdx <= 1
              ? 'THE AUDIENCE HAS SPOKEN.'
              : firstUnlocked && first.length > 0
                ? `${first.map((t) => t.team_name).join(' & ')} RISES ABOVE.`
                : 'OFFICIAL TOP THREE'}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="border border-[#27272A] bg-[#0D0D10] px-3.5 py-1.5 font-mono text-xs uppercase tracking-[0.2em] text-[#A1A1AA]">
            {event.valid_vote_count} AUDIENCE VOTES
          </span>
        </div>
      </div>

      {/* Stepped Architectural Podium (2nd | 1st Elevated | 3rd) */}
      <div className="relative grid grid-cols-1 items-end gap-5 pt-4 md:grid-cols-3">
        {/* 2nd Place (Silver Monolith) */}
        <motion.div
          layout
          className={`relative flex flex-col justify-between overflow-hidden border p-8 transition-all duration-500 ${
            large ? 'md:min-h-[340px]' : 'md:min-h-[280px]'
          } ${
            secondUnlocked
              ? 'border-[#D4D4D8] bg-[#131317]'
              : 'border-[#222226] bg-[#0D0D10]'
          }`}
        >
          <CornerMarks />
          <span className="pointer-events-none absolute -right-4 -bottom-8 select-none font-display text-[11rem] font-extrabold leading-none text-white/[0.03]">
            02
          </span>

          <div className="relative flex items-center justify-between font-mono text-xs uppercase tracking-[0.22em]">
            <span className="font-bold text-[#D4D4D8]">02 / SECOND</span>
            <span className="text-[#8E8E93]">SILVER</span>
          </div>

          {secondUnlocked ? (
            <motion.div
              initial={{ clipPath: 'inset(100% 0% 0% 0%)', opacity: 0 }}
              animate={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="relative my-8 space-y-5"
            >
              <p
                className={`font-display font-extrabold uppercase leading-[0.9] text-[#F4F2EC] ${
                  large ? 'text-6xl lg:text-7xl' : 'text-4xl sm:text-5xl'
                }`}
              >
                {second.length > 0 ? second.map((t) => t.team_name).join(' & ') : '—'}
              </p>

              {second[0] && (
                <div className="space-y-2.5">
                  <div className="flex items-baseline justify-between font-mono text-xs uppercase tracking-[0.18em]">
                    <span className="font-bold text-[#F4F2EC]">
                      {second[0].votes} {second[0].votes === 1 ? 'VOTE' : 'VOTES'}
                      {second[0].is_tied ? ' • TIED' : ''}
                    </span>
                    <span className="text-[#8E8E93]">{getShare(second[0].votes)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#222226]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${getBarWidth(second[0].votes)}%` }}
                      transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full bg-[#D4D4D8]"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="relative my-14 flex flex-col items-center justify-center gap-3 text-[#52525B]">
              <Lock className="h-6 w-6" />
              <span className="font-mono text-xs uppercase tracking-[0.3em]">CLASSIFIED</span>
            </div>
          )}

          <div className="relative h-1 w-full bg-[#D4D4D8]/40" />
        </motion.div>

        {/* 1st Place (Center Elevated Champion Monolith) */}
        <motion.div
          layout
          className={`relative flex flex-col justify-between overflow-hidden border p-9 transition-all duration-700 ${
            large ? 'md:min-h-[440px]' : 'md:min-h-[360px]'
          } ${
            firstUnlocked
              ? 'border-[#F4F2EC] bg-[#F4F2EC] text-[#09090B] shadow-[0_0_120px_rgba(244,242,236,0.22)]'
              : 'border-[#222226] bg-[#0D0D10] text-[#F4F2EC]'
          }`}
        >
          <CornerMarks light={firstUnlocked} />
          <span
            className={`pointer-events-none absolute -right-4 -bottom-8 select-none font-display text-[13rem] font-extrabold leading-none ${
              firstUnlocked ? 'text-[#09090B]/[0.06]' : 'text-white/[0.03]'
            }`}
          >
            01
          </span>

          {/* Red Championship Crown Bar */}
          {firstUnlocked && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 top-0 h-2 origin-left bg-[#FF2E17]"
            />
          )}

          <div className="relative flex items-center justify-between font-mono text-xs font-bold uppercase tracking-[0.22em]">
            <span
              className={`inline-flex items-center gap-2 ${
                firstUnlocked ? 'text-[#FF2E17]' : 'text-[#8E8E93]'
              }`}
            >
              <Crown className="h-4 w-4" />
              01 / CHAMPION
            </span>
            <span className={firstUnlocked ? 'text-[#09090B]/60' : 'text-[#52525B]'}>
              WINNER
            </span>
          </div>

          {firstUnlocked ? (
            <motion.div
              initial={{ clipPath: 'inset(100% 0% 0% 0%)', opacity: 0 }}
              animate={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 }}
              transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              className="relative my-10 space-y-6"
            >
              <p
                className={`font-display font-extrabold uppercase leading-[0.86] tracking-tight ${
                  large ? 'text-7xl lg:text-[6.25rem]' : 'text-5xl sm:text-6xl'
                }`}
              >
                {first.length > 0 ? first.map((t) => t.team_name).join(' & ') : '—'}
              </p>

              {first[0] && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-block bg-[#09090B] px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#F4F2EC]">
                      {first[0].votes} {first[0].votes === 1 ? 'VOTE' : 'VOTES'}
                      {first[0].is_tied ? ' • TIED' : ''}
                    </span>
                    <span className="font-mono text-sm font-bold text-[#09090B]">
                      {getShare(first[0].votes)}% SHARE
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#09090B]/15">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${getBarWidth(first[0].votes)}%` }}
                      transition={{ duration: 1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full bg-[#FF2E17]"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="relative my-20 flex flex-col items-center justify-center gap-3 text-[#52525B]">
              <Lock className="h-7 w-7" />
              <span className="font-mono text-xs uppercase tracking-[0.3em]">CLASSIFIED</span>
            </div>
          )}

          <div className={`relative h-1.5 w-full ${firstUnlocked ? 'bg-[#FF2E17]' : 'bg-[#222226]'}`} />
        </motion.div>

        {/* 3rd Place (Bronze Monolith) */}
        <motion.div
          layout
          className={`relative flex flex-col justify-between overflow-hidden border p-8 transition-all duration-500 ${
            large ? 'md:min-h-[290px]' : 'md:min-h-[240px]'
          } ${
            thirdUnlocked
              ? 'border-[#B45309] bg-[#131317]'
              : 'border-[#222226] bg-[#0D0D10]'
          }`}
        >
          <CornerMarks />
          <span className="pointer-events-none absolute -right-4 -bottom-8 select-none font-display text-[11rem] font-extrabold leading-none text-white/[0.03]">
            03
          </span>

          <div className="relative flex items-center justify-between font-mono text-xs uppercase tracking-[0.22em]">
            <span className="font-bold text-[#D97706]">03 / THIRD</span>
            <span className="text-[#8E8E93]">BRONZE</span>
          </div>

          {thirdUnlocked ? (
            <motion.div
              initial={{ clipPath: 'inset(100% 0% 0% 0%)', opacity: 0 }}
              animate={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="relative my-6 space-y-5"
            >
              <p
                className={`font-display font-extrabold uppercase leading-[0.9] text-[#F4F2EC] ${
                  large ? 'text-6xl lg:text-7xl' : 'text-4xl sm:text-5xl'
                }`}
              >
                {third.length > 0 ? third.map((t) => t.team_name).join(' & ') : '—'}
              </p>

              {third[0] && (
                <div className="space-y-2.5">
                  <div className="flex items-baseline justify-between font-mono text-xs uppercase tracking-[0.18em]">
                    <span className="font-bold text-[#F4F2EC]">
                      {third[0].votes} {third[0].votes === 1 ? 'VOTE' : 'VOTES'}
                      {third[0].is_tied ? ' • TIED' : ''}
                    </span>
                    <span className="text-[#8E8E93]">{getShare(third[0].votes)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#222226]">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${getBarWidth(third[0].votes)}%` }}
                      transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full bg-[#D97706]"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="relative my-10 flex flex-col items-center justify-center gap-3 text-[#52525B]">
              <Lock className="h-6 w-6" />
              <span className="font-mono text-xs uppercase tracking-[0.3em]">CLASSIFIED</span>
            </div>
          )}

          <div className="relative h-1 w-full bg-[#B45309]/60" />
        </motion.div>
      </div>
    </div>
  );
}