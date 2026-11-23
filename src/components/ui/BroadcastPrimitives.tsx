'use client';

import { useEffect, useState } from 'react';
import { useSpring } from 'framer-motion';

/** Hydration-safe live HH:MM:SS broadcast timecode */
export function LiveTimecode() {
  const [time, setTime] = useState<string>('--:--:--');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-GB', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  return <span className="font-mono tabular-nums">{time}</span>;
}

/** Spring-interpolated rolling number display */
export function AnimatedNumber({
  value,
  padZero = false,
  decimals = 0,
}: {
  value: number;
  padZero?: boolean;
  decimals?: number;
}) {
  const spring = useSpring(value, { stiffness: 75, damping: 18, mass: 0.6 });
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    return spring.on('change', (latest) => {
      setDisplay(latest);
    });
  }, [spring]);

  if (decimals > 0) {
    return <>{display.toFixed(decimals)}</>;
  }
  const rounded = Math.round(display);
  return <>{padZero ? String(rounded).padStart(2, '0') : rounded}</>;
}

/** Precision segmented broadcast meter */
export function SegmentedProgressBar({
  percentage,
  segments = 32,
  tall = false,
}: {
  percentage: number;
  segments?: number;
  tall?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filledCount = Math.round((clamped / 100) * segments);

  return (
    <div
      className={`grid w-full gap-1 ${tall ? 'h-8' : 'h-3.5'}`}
      style={{ gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))` }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {Array.from({ length: segments }).map((_, idx) => {
        const isFilled = idx < filledCount;
        const isLeading = idx === filledCount - 1 && filledCount > 0 && filledCount < segments;
        return (
          <div
            key={idx}
            className={`h-full transition-all duration-300 ${
              isLeading
                ? 'bg-[#F4F2EC] shadow-[0_0_12px_rgba(244,242,236,0.75)]'
                : isFilled
                  ? 'bg-[#FF2E17]'
                  : 'bg-[#1D1D22]'
            }`}
          />
        );
      })}
    </div>
  );
}

/** Architectural 1px L-bracket registration marks */
export function CornerMarks({ light = false }: { light?: boolean }) {
  const color = light ? 'border-[#09090B]/50' : 'border-[#F4F2EC]/35';
  return (
    <>
      <span className={`pointer-events-none absolute top-0 left-0 h-2.5 w-2.5 border-t border-l ${color}`} />
      <span className={`pointer-events-none absolute top-0 right-0 h-2.5 w-2.5 border-t border-r ${color}`} />
      <span className={`pointer-events-none absolute bottom-0 left-0 h-2.5 w-2.5 border-b border-l ${color}`} />
      <span className={`pointer-events-none absolute bottom-0 right-0 h-2.5 w-2.5 border-b border-r ${color}`} />
    </>
  );
}

const PHASES = [
  { key: 'not_started', num: '01', label: 'Standby' },
  { key: 'voting_live', num: '02', label: 'Live Voting' },
  { key: 'voting_completed', num: '03', label: 'Ballots Sealed' },
  { key: 'revealing', num: '04', label: 'Stage Reveal' },
  { key: 'completed', num: '05', label: 'Official' },
] as const;

/** 5-stage live competition phase indicator */
export function BroadcastPhaseBar({
  status,
}: {
  status: 'not_started' | 'voting_live' | 'voting_completed' | 'revealing' | 'completed';
}) {
  const activeIdx = PHASES.findIndex((p) => p.key === status);

  return (
    <div className="grid grid-cols-5 divide-x divide-[#222226] border-b border-[#222226] bg-[#0B0B0E]">
      {PHASES.map((phase, idx) => {
        const isCurrent = idx === activeIdx;
        const isPast = idx < activeIdx;
        return (
          <div
            key={phase.key}
            className={`relative px-3 py-3 transition-colors sm:px-5 ${
              isCurrent
                ? 'bg-[#141418] text-[#F4F2EC]'
                : isPast
                  ? 'text-[#A1A1AA]'
                  : 'text-[#52525B]'
            }`}
          >
            {isCurrent && (
              <span className="absolute inset-x-0 top-0 h-0.5 bg-[#FF2E17]" />
            )}
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
              <span className={isCurrent ? 'font-bold text-[#FF2E17]' : 'opacity-60'}>
                {phase.num}
              </span>
              <span className="hidden truncate sm:inline">{phase.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}