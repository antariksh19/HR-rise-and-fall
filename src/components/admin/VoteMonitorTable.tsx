'use client';

import { useState } from 'react';
import { Download, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface VoteRecordRow {
  id: string;
  voter_name: string;
  voter_code: string;
  target_name: string;
  target_code: string;
  status: 'valid' | 'invalidated';
  created_at: string;
}

export function VoteMonitorTable({ votes }: { votes: VoteRecordRow[] }) {
  const [query, setQuery] = useState('');

  const filtered = votes.filter((v) => {
    const q = query.toLowerCase();
    return (
      v.voter_name.toLowerCase().includes(q) ||
      v.target_name.toLowerCase().includes(q) ||
      v.voter_code.toLowerCase().includes(q)
    );
  });

  function exportCSV() {
    const header = ['Voter Team', 'Voter Code', 'Voted To', 'Target Code', 'Vote Status', 'Timestamp'];
    const rows = filtered.map((v) => [
      `"${v.voter_name.replace(/"/g, '""')}"`,
      v.voter_code,
      `"${v.target_name.replace(/"/g, '""')}"`,
      v.target_code,
      v.status,
      new Date(v.created_at).toISOString(),
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hr-rise-and-fall-votes-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search voter or target team..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="border-slate-800 bg-slate-900 pl-9"
          />
        </div>
        <Button variant="outline" onClick={exportCSV} disabled={filtered.length === 0}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/70">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800">
              <TableHead>Voter Team</TableHead>
              <TableHead>Voted To</TableHead>
              <TableHead>Vote Status</TableHead>
              <TableHead>Timestamp</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-slate-400">
                  No votes recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((v) => (
                <TableRow key={v.id} className="border-slate-800">
                  <TableCell className="font-semibold text-white">
                    {v.voter_name}{' '}
                    <span className="font-mono text-xs text-slate-400">({v.voter_code})</span>
                  </TableCell>
                  <TableCell className="font-semibold text-amber-400">
                    {v.target_name}{' '}
                    <span className="font-mono text-xs text-slate-400">({v.target_code})</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        v.status === 'valid'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-red-500/15 text-red-400'
                      }
                    >
                      {v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-400">
                    {new Date(v.created_at).toLocaleTimeString()}
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