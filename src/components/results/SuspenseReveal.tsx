'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';
import { TopThreeChart } from '@/components/results/TopThreeChart';
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
      const t1 = setTimeout(() => setCountdown(2), 700);
      const t2 = setTimeout(() => setCountdown(1), 1400);
      const t3 = setTimeout(() => {
        setCountdown(null);
        loadRevealed();
      }, 2100);
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

  return (
    <div className="relative mx-auto w-full max-w-6xl space-y-10">
      {/* Full-Screen Broadcast Countdown */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            key={countdown}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#09090B]"
          >
            <p className="font-mono text-xs font-bold uppercase tracking-[0.4em] text-[#FF2E17]">
              {event.reveal_stage === 'first_place'
                ? 'ANNOUNCING FIRST PLACE CHAMPION'
                : `UNLOCKING ${event.reveal_stage.replace('_', ' ').toUpperCase()}`}
            </p>
            <motion.span
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.35, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-4 font-display text-[14rem] font-extrabold leading-none text-[#F4F2EC] sm:text-[18rem]"
            >
              0{countdown}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editorial Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#222226] pb-6 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#FF2E17]">
            {event.status === 'completed' ? '[ OFFICIAL STANDINGS ]' : '[ LIVE STAGE REVEAL ]'}
          </p>
          <h2
            className={`mt-2 font-display font-extrabold uppercase leading-[0.92] tracking-tight text-[#F4F2EC] ${
              large ? 'text-6xl lg:text-7xl' : 'text-4xl sm:text-6xl'
            }`}
          >
            {stageIdx <= 1
              ? 'THE BALLOTS ARE SEALED.'
              : firstUnlocked && first.length > 0
                ? `${first.map((t) => t.team_name).join(' & ')} — CHAMPION`
                : 'TOP THREE PODIUM'}
          </h2>
        </div>

        <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#8E8E93]">
          STAGE: {event.reveal_stage.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* Stepped Architectural Podium (2nd | 1st | 3rd) */}
      <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-3">
        {/* 2nd Place */}
        <motion.div
          layout
          className={`flex flex-col justify-between border p-7 md:min-h-[260px] ${
            secondUnlocked
              ? 'border-[#D4D4D8] bg-[#141418]'
              : 'border-[#222226] bg-[#0D0D10]'
          }`}
        >
          <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.2em]">
            <span className="text-[#D4D4D8]">02 / SECOND</span>
            <span className="text-[#8E8E93]">SILVER</span>
          </div>

          {secondUnlocked ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="my-8"
            >
              <p className={`font-display font-extrabold uppercase text-[#F4F2EC] ${large ? 'text-5xl' : 'text-4xl'}`}>
                {second.length > 0 ? second.map((t) => t.team_name).join(' & ') : '—'}
              </p>
              {second[0] && (
                <p className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-[#A1A1AA]">
                  {second[0].votes} {second[0].votes === 1 ? 'VOTE' : 'VOTES'}
                  {second[0].is_tied ? ' — TIED' : ''}
                </p>
              )}
            </motion.div>
          ) : (
            <div className="my-10 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-[#52525B]">
              <Lock className="h-4 w-4" /> SEALED
            </div>
          )}

          <div className="h-1 w-full bg-[#D4D4D8]/40" />
        </motion.div>

        {/* 1st Place (Center Elevated, Inverted Bone-White Winner Block) */}
        <motion.div
          layout
          className={`flex flex-col justify-between border p-8 md:min-h-[330px] ${
            firstUnlocked
              ? 'border-[#F4F2EC] bg-[#F4F2EC] text-[#09090B]'
              : 'border-[#222226] bg-[#0D0D10] text-[#F4F2EC]'
          }`}
        >
          <div className="flex items-center justify-between font-mono text-xs font-bold uppercase tracking-[0.2em]">
            <span className={firstUnlocked ? 'text-[#FF2E17]' : 'text-[#8E8E93]'}>
              01 / CHAMPION
            </span>
            <span className={firstUnlocked ? 'text-[#09090B]/60' : 'text-[#52525B]'}>
              WINNER
            </span>
          </div>

          {firstUnlocked ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="my-10"
            >
              <p className={`font-display font-extrabold uppercase leading-none ${large ? 'text-6xl' : 'text-5xl'}`}>
                {first.length > 0 ? first.map((t) => t.team_name).join(' & ') : '—'}
              </p>
              {first[0] && (
                <p className="mt-4 inline-block bg-[#09090B] px-3 py-1 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#F4F2EC]">
                  {first[0].votes} {first[0].votes === 1 ? 'VOTE' : 'VOTES'}
                  {first[0].is_tied ? ' — TIED' : ''}
                </p>
              )}
            </motion.div>
          ) : (
            <div className="my-14 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-[#52525B]">
              <Lock className="h-4 w-4" /> SEALED
            </div>
          )}

          <div className={`h-1.5 w-full ${firstUnlocked ? 'bg-[#FF2E17]' : 'bg-[#222226]'}`} />
        </motion.div>

        {/* 3rd Place */}
        <motion.div
          layout
          className={`flex flex-col justify-between border p-7 md:min-h-[215px] ${
            thirdUnlocked
              ? 'border-[#B45309] bg-[#141418]'
              : 'border-[#222226] bg-[#0D0D10]'
          }`}
        >
          <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.2em]">
            <span className="text-[#D97706]">03 / THIRD</span>
            <span className="text-[#8E8E93]">BRONZE</span>
          </div>

          {thirdUnlocked ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="my-6"
            >
              <p className={`font-display font-extrabold uppercase text-[#F4F2EC] ${large ? 'text-5xl' : 'text-4xl'}`}>
                {third.length > 0 ? third.map((t) => t.team_name).join(' & ') : '—'}
              </p>
              {third[0] && (
                <p className="mt-2 font-mono text-xs uppercase tracking-[0.18em] text-[#A1A1AA]">
                  {third[0].votes} {third[0].votes === 1 ? 'VOTE' : 'VOTES'}
                  {third[0].is_tied ? ' — TIED' : ''}
                </p>
              )}
            </motion.div>
          ) : (
            <div className="my-8 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-[#52525B]">
              <Lock className="h-4 w-4" /> SEALED
            </div>
          )}

          <div className="h-1 w-full bg-[#B45309]/60" />
        </motion.div>
      </div>

      {/* Bar Chart once 1st Place Unlocks */}
      {firstUnlocked && revealed.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <TopThreeChart topThree={revealed} />
        </motion.div>
      )}
    </div>
  );
}