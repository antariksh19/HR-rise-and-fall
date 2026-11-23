'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  LabelList,
  Tooltip,
} from 'recharts';
import type { RankedTeam } from '@/types/database';

const RANK_COLORS: Record<number, string> = {
  1: '#F4F2EC', // Bone White (Champion)
  2: '#71717A', // Matte Steel (Silver)
  3: '#B45309', // Matte Bronze
};

export function TopThreeChart({ topThree }: { topThree: RankedTeam[] }) {
  if (topThree.length === 0) {
    return (
      <div className="border border-[#222226] bg-[#0D0D10] p-10 text-center font-mono text-xs uppercase tracking-[0.2em] text-[#52525B]">
        NO RANKED RESULTS AVAILABLE.
      </div>
    );
  }

  const ordered = [...topThree].sort(
    (a, b) => b.rank - a.rank || a.team_name.localeCompare(b.team_name)
  );

  return (
    <div className="h-[360px] w-full border border-[#222226] bg-[#0D0D10] p-6">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={ordered} margin={{ top: 28, right: 24, left: 8, bottom: 16 }}>
          <XAxis
            dataKey="team_name"
            stroke="#27272A"
            tick={{ fill: '#F4F2EC', fontSize: 13, fontWeight: 700 }}
          />
          <YAxis allowDecimals={false} stroke="#27272A" tick={{ fill: '#8E8E93', fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
            contentStyle={{
              backgroundColor: '#09090B',
              borderColor: '#F4F2EC',
              borderRadius: '0px',
              color: '#F4F2EC',
              fontFamily: 'var(--font-jetbrains), monospace',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="votes" radius={[0, 0, 0, 0]} animationDuration={1000}>
            {ordered.map((entry) => (
              <Cell key={entry.team_id} fill={RANK_COLORS[entry.rank] ?? '#3F3F46'} />
            ))}
            <LabelList
              dataKey="votes"
              position="top"
              fill="#F4F2EC"
              fontSize={16}
              fontWeight={800}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}