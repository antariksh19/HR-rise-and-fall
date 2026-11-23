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

/** 32-segment precision broadcast meter */
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
      className={`grid w-full gap-1 ${tall ? 'h-8' : 'h-3.5'}`} style={{ gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))` }}
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