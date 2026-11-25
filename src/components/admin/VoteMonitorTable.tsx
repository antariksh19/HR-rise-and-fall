'use client';

import { Download } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface VoteRecordRow {
  id: string;
  voter_name: string;
  voter_code: string;
  target_name: string;
  target_code: string;
  status: string;
  created_at: string;
}

export function VoteMonitorTable({ votes }: { votes: VoteRecordRow[] }) {
  function handleExportCsv() {
    const headers = ['Voter Team', 'Voter Code', 'Voted For', 'Target Code', 'Status', 'Timestamp'];
    const rows = votes.map((v) => [
      `"${v.voter_name.replace(/"/g, '""')}"`,
      v.voter_code,
      `"${v.target_name.replace(/"/g, '""')}"`,
      v.target_code,
      v.status,
      new Date(v.created_at).toISOString(),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hr-rise-and-fall-votes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 border border-[#222226] bg-[#0D0D10] p-4 sm:flex-row sm:items-center sm:px-5">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#8E8E93]">
            LIVE AUDIT FEED // ADMIN ONLY
          </p>
          <p className="mt-0.5 text-xs text-[#A1A1AA]">
            Individual ballots are strictly hidden from public displays and WebSockets.
          </p>
        </div>

        <button
          type="button"
          disabled={votes.length === 0}
          onClick={handleExportCsv}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 border border-[#27272A] bg-[#09090B] px-4 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#F4F2EC] transition-colors active:border-[#F4F2EC] disabled:opacity-40 sm:hover:border-[#F4F2EC]"
        >
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {/* Mobile Ballot Feed (Phones) */}
      <div className="space-y-2.5 md:hidden">
        {votes.length === 0 ? (
          <div className="border border-[#222226] bg-[#0D0D10] py-12 text-center font-mono text-xs uppercase tracking-[0.2em] text-[#52525B]">
            NO BALLOTS CAST YET.
          </div>
        ) : (
          votes.map((vote) => (
            <div key={vote.id} className="border border-[#222226] bg-[#0D0D10] p-4">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em]">
                <span className={vote.status === 'valid' ? 'text-[#22C55E]' : 'text-[#FF2E17]'}>
                  ● {vote.status}
                </span>
                <span className="text-[#71717A]">
                  {new Date(vote.created_at).toLocaleTimeString()}
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-display text-xl font-bold uppercase text-[#F4F2EC]">
                    {vote.voter_name}
                  </p>
                  <p className="font-mono text-[10px] text-[#71717A]">{vote.voter_code}</p>
                </div>
                <span className="shrink-0 font-mono text-xs text-[#52525B]">→</span>
                <div className="min-w-0 text-right">
                  <p className="truncate font-display text-xl font-bold uppercase text-[#FF2E17]">
                    {vote.target_name}
                  </p>
                  <p className="font-mono text-[10px] text-[#71717A]">{vote.target_code}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Hairline Table */}
      <div className="hidden border border-[#222226] bg-[#0D0D10] md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-[#222226] hover:bg-transparent">
              <TableHead className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                Voter Team
              </TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                Saved Team
              </TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                Status
              </TableHead>
              <TableHead className="text-right font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                Timestamp
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {votes.length === 0 ? (
              <TableRow className="border-[#222226] hover:bg-transparent">
                <TableCell
                  colSpan={4}
                  className="py-12 text-center font-mono text-xs uppercase tracking-[0.2em] text-[#52525B]"
                >
                  NO BALLOTS CAST YET.
                </TableCell>
              </TableRow>
            ) : (
              votes.map((vote) => (
                <TableRow
                  key={vote.id}
                  className="border-[#222226] transition-colors hover:bg-[#141418]"
                >
                  <TableCell>
                    <p className="font-display text-xl font-bold uppercase text-[#F4F2EC]">
                      {vote.voter_name}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">
                      {vote.voter_code}
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="font-display text-xl font-bold uppercase text-[#FF2E17]">
                      {vote.target_name}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[#71717A]">
                      {vote.target_code}
                    </p>
                  </TableCell>
                  <TableCell>
                    {vote.status === 'valid' ? (
                      <span className="inline-flex items-center border border-[#22C55E]/30 bg-[#22C55E]/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#22C55E]">
                        Valid
                      </span>
                    ) : (
                      <span className="inline-flex items-center border border-[#FF2E17]/40 bg-[#FF2E17]/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#FF2E17]">
                        {vote.status}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-[#8E8E93]">
                    {new Date(vote.created_at).toLocaleTimeString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}