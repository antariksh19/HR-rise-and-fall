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
  1: '#F59E0B', // Gold
  2: '#CBD5E1', // Silver
  3: '#CD7F32', // Bronze
};

export function TopThreeChart({ topThree }: { topThree: RankedTeam[] }) {
  if (topThree.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-8 text-center text-slate-400">
        No ranked results available to display.
      </div>
    );
  }

  const ordered = [...topThree].sort(
    (a, b) => b.rank - a.rank || a.team_name.localeCompare(b.team_name)
  );

  return (
    <div className="h-[360px] w-full rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={ordered} margin={{ top: 28, right: 24, left: 8, bottom: 16 }}>
          <XAxis
            dataKey="team_name"
            stroke="#94A3B8"
            tick={{ fill: '#F8FAFC', fontSize: 14, fontWeight: 700 }}
          />
          <YAxis allowDecimals={false} stroke="#475569" tick={{ fill: '#94A3B8' }} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            contentStyle={{
              backgroundColor: '#0F172A',
              borderColor: '#334155',
              borderRadius: '0.75rem',
              color: '#F8FAFC',
            }}
          />
          <Bar dataKey="votes" radius={[10, 10, 0, 0]} animationDuration={1200}>
            {ordered.map((entry) => (
              <Cell key={entry.team_id} fill={RANK_COLORS[entry.rank] ?? '#64748B'} />
            ))}
            <LabelList
              dataKey="votes"
              position="top"
              fill="#F8FAFC"
              fontSize={18}
              fontWeight={800}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}