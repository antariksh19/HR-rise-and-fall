'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Lock, Sparkles } from 'lucide-react';
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

    // Trigger dramatic 3-2-1 countdown when transitioning into a new podium reveal live
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

  return (
    <div className="relative mx-auto w-full max-w-6xl space-y-10 text-center">
      {/* Dramatic 3-2-1 Countdown Overlay */}
      <AnimatePresence>
        {countdown !== null && (
          <motion.div
            key={countdown}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1.15, opacity: 1 }}
            exit={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#060913]/90 backdrop-blur-md"
          >
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-[0.4em] text-amber-400">
                {event.reveal_stage === 'first_place'
                  ? 'AND THE TEAM THAT ROSE ABOVE THE REST IS...'
                  : `REVEALING ${event.reveal_stage.replace('_', ' ').toUpperCase()}`}
              </p>
              <span className="mt-4 block text-[10rem] font-black leading-none text-white drop-shadow-[0_0_40px_rgba(245,158,11,0.6)]">
                {countdown}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stage Headline */}
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-400">
          {event.status === 'completed'
            ? 'Official Final Results'
            : stageIdx <= 1
              ? 'The Votes Are In'
              : 'Live Podium Reveal'}
        </p>
        <h2 className={`${large ? 'text-6xl' : 'text-4xl sm:text-5xl'} font-black tracking-tight text-white`}>
          {stageIdx <= 1
            ? 'THE FATE OF EVERY TEAM HAS BEEN DECIDED.'
            : stageIdx >= 4 && first.length > 0
              ? `${first.map((t) => t.team_name).join(' & ')} RISES ABOVE THE REST!`
              : 'WHO WILL RISE?'}
        </h2>
      </div>

      {/* Podium Cards (2nd | 1st | 3rd) */}
      <div className="grid grid-cols-1 items-end gap-6 md:grid-cols-3">
        {/* 2nd Place */}
        <motion.div
          layout
          className={`rounded-2xl border p-8 transition ${
            stageIdx >= 3 && countdown === null
              ? 'border-slate-300/60 bg-slate-800/60 shadow-[0_0_40px_rgba(203,213,225,0.15)]'
              : 'border-slate-800 bg-slate-900/50'
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-slate-300">2nd Place</p>
          {stageIdx >= 3 && countdown === null ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
              <p className={`${large ? 'text-4xl' : 'text-2xl'} font-black text-white`}>
                {second.length > 0 ? second.map((t) => t.team_name).join(' & ') : '—'}
              </p>
              {second[0] && (
                <p className="mt-2 font-mono text-sm text-slate-300">
                  {second[0].votes} {second[0].votes === 1 ? 'vote' : 'votes'}
                  {second[0].is_tied ? ' (Tied)' : ''}
                </p>
              )}
            </motion.div>
          ) : (
            <div className="mt-5 flex flex-col items-center gap-2 text-slate-600">
              <Lock className="h-7 w-7" />
              <span className="text-sm font-bold tracking-widest">LOCKED</span>
            </div>
          )}
        </motion.div>

        {/* 1st Place (Center Elevated) */}
        <motion.div
          layout
          className={`rounded-2xl border p-10 transition ${
            stageIdx >= 4 && countdown === null
              ? 'border-amber-400 bg-gradient-to-b from-amber-500/20 to-slate-950 shadow-[0_0_70px_rgba(245,158,11,0.3)]'
              : 'border-slate-800 bg-slate-900/50'
          }`}
        >
          <Trophy
            className={`mx-auto mb-3 h-12 w-12 ${
              stageIdx >= 4 && countdown === null ? 'text-amber-400' : 'text-slate-600'
            }`}
          />
          <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
            1st Place • Champion
          </p>
          {stageIdx >= 4 && countdown === null ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-4">
              <p className={`${large ? 'text-5xl' : 'text-3xl'} font-black text-white`}>
                {first.length > 0 ? first.map((t) => t.team_name).join(' & ') : '—'}
              </p>
              {first[0] && (
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 font-mono text-sm font-bold text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" /> {first[0].votes}{' '}
                  {first[0].votes === 1 ? 'vote' : 'votes'}
                  {first[0].is_tied ? ' (Tied)' : ''}
                </p>
              )}
            </motion.div>
          ) : (
            <div className="mt-5 flex flex-col items-center gap-2 text-slate-600">
              <Lock className="h-7 w-7" />
              <span className="text-sm font-bold tracking-widest">LOCKED</span>
            </div>
          )}
        </motion.div>

        {/* 3rd Place */}
        <motion.div
          layout
          className={`rounded-2xl border p-8 transition ${
            stageIdx >= 2 && countdown === null
              ? 'border-amber-700/70 bg-amber-950/30 shadow-[0_0_40px_rgba(205,127,50,0.15)]'
              : 'border-slate-800 bg-slate-900/50'
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-widest text-amber-600">3rd Place</p>
          {stageIdx >= 2 && countdown === null ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
              <p className={`${large ? 'text-4xl' : 'text-2xl'} font-black text-white`}>
                {third.length > 0 ? third.map((t) => t.team_name).join(' & ') : '—'}
              </p>
              {third[0] && (
                <p className="mt-2 font-mono text-sm text-amber-500">
                  {third[0].votes} {third[0].votes === 1 ? 'vote' : 'votes'}
                  {third[0].is_tied ? ' (Tied)' : ''}
                </p>
              )}
            </motion.div>
          ) : (
            <div className="mt-5 flex flex-col items-center gap-2 text-slate-600">
              <Lock className="h-7 w-7" />
              <span className="text-sm font-bold tracking-widest">LOCKED</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Animated Top Three Bar Chart once 1st Place is Revealed */}
      {stageIdx >= 4 && countdown === null && revealed.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="pt-4"
        >
          <TopThreeChart topThree={revealed} />
        </motion.div>
      )}
    </div>
  );
}