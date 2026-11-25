'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';
import { TopThreeChart } from '@/components/results/TopThreeChart';
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
      const t1 = setTimeout(() => setCountdown(2), 750);
      const t2 = setTimeout(() => setCountdown(1), 1500);
      const t3 = setTimeout(() => {
        setCountdown(null);
        loadRevealed();
      }, 2250);
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
    <div className="relative mx-auto w-full max-w-[1440px] space-y-10">
      {/* Full-Screen Broadcast Countdown with Crosshairs */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            key={countdown}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-telemetry-dots fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#09090B]"
          >
            {/* Expanding Architectural Crosshairs */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute top-1/2 h-px w-full bg-[#FF2E17]/35"
            />
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute left-1/2 h-full w-px bg-[#FF2E17]/20"
            />

            <p className="relative bg-[#09090B] px-4 py-1 font-mono text-xs font-bold uppercase tracking-[0.45em] text-[#FF2E17] sm:text-sm">
              {event.reveal_stage === 'first_place'
                ? 'ANNOUNCING FIRST PLACE CHAMPION'
                : `UNLOCKING ${event.reveal_stage.replace('_', ' ').toUpperCase()}`}
            </p>
            <motion.span
              initial={{ scale: 0.68, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.35, opacity: 0 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              className="relative mt-4 font-display text-[15rem] font-extrabold leading-none text-[#F4F2EC] sm:text-[20rem]"
            >
              0{countdown}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editorial Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#222226] pb-6 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-[#FF2E17]">
            {event.status === 'completed' ? '[ OFFICIAL STANDINGS ]' : '[ LIVE STAGE REVEAL ]'}
          </p>
          <h2
            className={`mt-2 font-display font-extrabold uppercase leading-[0.9] tracking-tight text-[#F4F2EC] ${
              large ? 'text-6xl lg:text-8xl' : 'text-4xl sm:text-6xl'
            }`}
          >
            {stageIdx <= 1
              ? 'THE BALLOTS ARE SEALED.'
              : firstUnlocked && first.length > 0
                ? `${first.map((t) => t.team_name).join(' & ')} — CHAMPION`
                : 'TOP THREE PODIUM'}
          </h2>
        </div>

        <span className="border border-[#27272A] bg-[#0D0D10] px-3.5 py-1.5 font-mono text-xs uppercase tracking-[0.2em] text-[#A1A1AA]">
          STAGE: {event.reveal_stage.replace('_', ' ').toUpperCase()}
        </span>
      </div>

      {/* Stepped Architectural Podium (2nd | 1st Elevated | 3rd) */}
      <div className="relative grid grid-cols-1 items-end gap-5 pt-2 md:grid-cols-3">
        {/* 2nd Place (Silver) */}
        <motion.div
          layout
          className={`relative flex flex-col justify-between border p-8 transition-colors duration-500 ${
            large ? 'md:min-h-[300px]' : 'md:min-h-[260px]'
          } ${
            secondUnlocked
              ? 'border-[#D4D4D8] bg-[#141418]'
              : 'border-[#222226] bg-[#0D0D10]'
          }`}
        >
          <CornerMarks />
          <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.22em]">
            <span className="text-[#D4D4D8]">02 / SECOND</span>
            <span className="text-[#8E8E93]">SILVER</span>
          </div>

          {secondUnlocked ? (
            <motion.div
              initial={{ clipPath: 'inset(100% 0% 0% 0%)', opacity: 0 }}
              animate={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="my-8"
            >
              <p
                className={`font-display font-extrabold uppercase leading-none text-[#F4F2EC] ${
                  large ? 'text-6xl' : 'text-4xl'
                }`}
              >
                {second.length > 0 ? second.map((t) => t.team_name).join(' & ') : '—'}
              </p>
              {second[0] && (
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.18em] text-[#A1A1AA]">
                  {second[0].votes} {second[0].votes === 1 ? 'VOTE' : 'VOTES'}
                  {second[0].is_tied ? ' — TIED' : ''}
                </p>
              )}
            </motion.div>
          ) : (
            <div className="my-12 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-[#52525B]">
              <Lock className="h-4 w-4" /> SEALED
            </div>
          )}

          <div className="h-1 w-full bg-[#D4D4D8]/50" />
        </motion.div>

        {/* 1st Place (Center Elevated, Inverted Bone-White Champion Block) */}
        <motion.div
          layout
          className={`relative flex flex-col justify-between overflow-hidden border p-9 transition-all duration-500 ${
            large ? 'md:min-h-[390px]' : 'md:min-h-[340px]'
          } ${
            firstUnlocked
              ? 'border-[#F4F2EC] bg-[#F4F2EC] text-[#09090B] shadow-[0_0_80px_rgba(244,242,236,0.16)]'
              : 'border-[#222226] bg-[#0D0D10] text-[#F4F2EC]'
          }`}
        >
          <CornerMarks light={firstUnlocked} />

          {/* Architectural Top Accent Bar */}
          {firstUnlocked && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-x-0 top-0 h-1.5 origin-left bg-[#FF2E17]"
            />
          )}

          <div className="flex items-center justify-between font-mono text-xs font-bold uppercase tracking-[0.22em]">
            <span className={firstUnlocked ? 'text-[#FF2E17]' : 'text-[#8E8E93]'}>
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
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="my-10"
            >
              <p
                className={`font-display font-extrabold uppercase leading-[0.88] ${
                  large ? 'text-7xl lg:text-8xl' : 'text-5xl'
                }`}
              >
                {first.length > 0 ? first.map((t) => t.team_name).join(' & ') : '—'}
              </p>
              {first[0] && (
                <p className="mt-5 inline-block bg-[#09090B] px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.22em] text-[#F4F2EC]">
                  {first[0].votes} {first[0].votes === 1 ? 'VOTE' : 'VOTES'}
                  {first[0].is_tied ? ' — TIED' : ''}
                </p>
              )}
            </motion.div>
          ) : (
            <div className="my-16 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.25em] text-[#52525B]">
              <Lock className="h-4 w-4" /> SEALED
            </div>
          )}

          <div className={`h-1.5 w-full ${firstUnlocked ? 'bg-[#FF2E17]' : 'bg-[#222226]'}`} />
        </motion.div>

        {/* 3rd Place (Bronze) */}
        <motion.div
          layout
          className={`relative flex flex-col justify-between border p-8 transition-colors duration-500 ${
            large ? 'md:min-h-[250px]' : 'md:min-h-[215px]'
          } ${
            thirdUnlocked
              ? 'border-[#B45309] bg-[#141418]'
              : 'border-[#222226] bg-[#0D0D10]'
          }`}
        >
          <CornerMarks />
          <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.22em]">
            <span className="text-[#D97706]">03 / THIRD</span>
            <span className="text-[#8E8E93]">BRONZE</span>
          </div>

          {thirdUnlocked ? (
            <motion.div
              initial={{ clipPath: 'inset(100% 0% 0% 0%)', opacity: 0 }}
              animate={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="my-6"
            >
              <p
                className={`font-display font-extrabold uppercase leading-none text-[#F4F2EC] ${
                  large ? 'text-6xl' : 'text-4xl'
                }`}
              >
                {third.length > 0 ? third.map((t) => t.team_name).join(' & ') : '—'}
              </p>
              {third[0] && (
                <p className="mt-3 font-mono text-xs uppercase tracking-[0.18em] text-[#A1A1AA]">
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
          transition={{ delay: 0.25 }}
        >
          <TopThreeChart topThree={revealed} />
        </motion.div>
      )}
    </div>
  );
}