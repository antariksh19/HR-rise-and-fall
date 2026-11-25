'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  KeyRound,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface AdminTeamRow {
  id: string;
  event_id: string;
  team_name: string;
  team_code: string;
  is_active: boolean;
  has_voted: boolean;
  created_at: string;
}

interface CredentialModalData {
  teamName: string;
  loginId: string;
  password: string;
}

type ConfirmActionType = 'reset_password' | 'archive' | 'unarchive' | 'delete_permanent';

export function TeamManager({
  eventId,
  initialTeams,
}: {
  eventId: string;
  initialTeams: AdminTeamRow[];
}) {
  const router = useRouter();
  const [teams, setTeams] = useState<AdminTeamRow[]>(initialTeams);
  const [newTeamName, setNewTeamName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'archived'>('all');

  const [credentialModal, setCredentialModal] = useState<CredentialModalData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ team: AdminTeamRow; name: string } | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<{
    type: ConfirmActionType;
    team: AdminTeamRow;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setTeams(initialTeams);
  }, [initialTeams]);

  const filteredTeams = teams.filter((t) => {
    const matchesQuery =
      t.team_name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      t.team_code.toLowerCase().includes(searchQuery.trim().toLowerCase());
    if (!matchesQuery) return false;
    if (statusFilter === 'active') return t.is_active;
    if (statusFilter === 'pending') return t.is_active && !t.has_voted;
    if (statusFilter === 'archived') return !t.is_active;
    return true;
  });

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setIsCreating(true);

    try {
      const res = await fetch('/api/admin/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, teamName: newTeamName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create team');

      setTeams((prev) => [...prev, data.team]);
      setNewTeamName('');
      setCredentialModal({
        teamName: data.team.team_name,
        loginId: data.credentials.loginId,
        password: data.credentials.password,
      });
      toast.success(`Team "${data.team.team_name}" created.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error creating team');
    } finally {
      setIsCreating(false);
    }
  }

  async function submitRename(e: React.FormEvent) {
    e.preventDefault();
    if (!renameTarget) return;
    const trimmed = renameTarget.name.trim();
    if (!trimmed || trimmed === renameTarget.team.team_name) {
      setRenameTarget(null);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/teams/${renameTarget.team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rename', teamName: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to rename team');

      setTeams((prev) =>
        prev.map((t) => (t.id === renameTarget.team.id ? data.team : t))
      );
      toast.success('Team renamed and synced.');
      setRenameTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to rename team');
    } finally {
      setActionLoading(false);
    }
  }

  async function submitConfirmAction() {
    if (!confirmTarget) return;
    setActionLoading(true);

    try {
      const { type, team } = confirmTarget;
      const res = await fetch(`/api/admin/teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      if (type === 'reset_password') {
        setConfirmTarget(null);
        setCredentialModal({
          teamName: data.teamName,
          loginId: data.credentials.loginId,
          password: data.credentials.password,
        });
        toast.success('New credentials generated.');
      } else if (type === 'archive') {
        setTeams((prev) =>
          prev.map((t) => (t.id === team.id ? { ...t, is_active: false } : t))
        );
        setConfirmTarget(null);
        toast.success(`"${team.team_name}" archived.`);
        router.refresh();
      } else if (type === 'unarchive') {
        setTeams((prev) =>
          prev.map((t) => (t.id === team.id ? { ...t, is_active: true } : t))
        );
        setConfirmTarget(null);
        toast.success(`"${team.team_name}" restored to active competition.`);
        router.refresh();
      } else if (type === 'delete_permanent') {
        setTeams((prev) => prev.filter((t) => t.id !== team.id));
        setConfirmTarget(null);
        toast.success(`"${team.team_name}" permanently deleted.`);
        router.refresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  }

  function copyText(label: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard.`);
    setTimeout(() => setCopiedField(null), 2000);
  }

  const getDialogMeta = (target: { type: ConfirmActionType; team: AdminTeamRow }) => {
    switch (target.type) {
      case 'reset_password':
        return {
          title: 'RESET TEAM PASSWORD?',
          description: `Generate a brand-new password for "${target.team.team_name}" (${target.team.team_code})? Their previous password stops working immediately.`,
          warning: null,
          confirmLabel: 'Reset Password',
          btnClass: 'bg-[#F4F2EC] text-[#09090B] active:bg-[#FF2E17] active:text-white sm:hover:bg-[#FF2E17] sm:hover:text-white',
        };
      case 'archive':
        return {
          title: `ARCHIVE "${target.team.team_name}"?`,
          description: `Suspends login access for ${target.team.team_code} and hides them from the live stage. You can restore them anytime.`,
          warning: 'Any vote cast by this team is invalidated while archived.',
          confirmLabel: 'Archive Team',
          btnClass: 'bg-[#F4F2EC] text-[#09090B] active:bg-[#FF2E17] active:text-white sm:hover:bg-[#FF2E17] sm:hover:text-white',
        };
      case 'unarchive':
        return {
          title: `RESTORE "${target.team.team_name}"?`,
          description: `Re-enables login access for ${target.team.team_code} and puts them back on the live competition board immediately.`,
          warning: null,
          confirmLabel: 'Unarchive Team',
          btnClass: 'bg-[#F4F2EC] text-[#09090B] active:bg-[#22C55E] active:text-[#09090B] sm:hover:bg-[#22C55E] sm:hover:text-[#09090B]',
        };
      case 'delete_permanent':
        return {
          title: `DELETE "${target.team.team_name}"?`,
          description: `Permanently erases "${target.team.team_name}" (${target.team.team_code}), deletes their login account, and wipes any associated votes.`,
          warning: 'This action is permanent and cannot be undone.',
          confirmLabel: 'Delete Permanently',
          btnClass: 'bg-[#FF2E17] text-white active:bg-[#DC2626] sm:hover:bg-[#DC2626]',
        };
    }
  };

  const dialogMeta = confirmTarget ? getDialogMeta(confirmTarget) : null;

  return (
    <div className="space-y-4">
      {/* Add Team Strip */}
      <form
        onSubmit={handleCreateTeam}
        className="flex flex-col border border-[#222226] bg-[#0D0D10] sm:flex-row"
      >
        <input
          placeholder="ENTER NEW TEAM NAME (E.G., TEAM ALPHA)"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          className="min-h-[48px] flex-1 bg-transparent px-4 py-3 font-mono text-base uppercase tracking-[0.12em] text-[#F4F2EC] placeholder:text-[#52525B] focus:outline-none sm:px-5 sm:py-4 sm:text-xs"
        />
        <button
          type="submit"
          disabled={isCreating}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 border-t border-[#222226] bg-[#F4F2EC] px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#09090B] transition-colors active:bg-[#FF2E17] active:text-white disabled:opacity-50 sm:border-l sm:border-t-0 sm:hover:bg-[#FF2E17] sm:hover:text-white"
        >
          {isCreating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Add Team &amp; Generate Credentials
        </button>
      </form>

      {/* Search & Filter Bar */}
      <div className="flex flex-col justify-between gap-3 border border-[#222226] bg-[#0D0D10] p-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2.5 px-2">
          <Search className="h-4 w-4 shrink-0 text-[#71717A]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH TEAMS OR LOGIN ID..."
            className="min-h-[40px] w-full bg-transparent py-1 font-mono text-base uppercase tracking-[0.12em] text-[#F4F2EC] placeholder:text-[#52525B] focus:outline-none sm:text-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="min-h-[36px] px-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8E8E93] active:text-[#F4F2EC] sm:hover:text-[#F4F2EC]"
            >
              Clear
            </button>
          )}
        </div>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
          {(['all', 'active', 'pending', 'archived'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`min-h-[36px] shrink-0 px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] transition-colors ${
                statusFilter === tab
                  ? 'bg-[#F4F2EC] text-[#09090B]'
                  : 'border border-[#27272A] text-[#8E8E93] active:text-[#F4F2EC] sm:hover:text-[#F4F2EC]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Card Stack (Phones) */}
      <div className="space-y-3 md:hidden">
        {filteredTeams.length === 0 ? (
          <div className="border border-[#222226] bg-[#0D0D10] py-12 text-center font-mono text-xs uppercase tracking-[0.18em] text-[#52525B]">
            {teams.length === 0
              ? 'NO TEAMS REGISTERED YET.'
              : 'NO TEAMS MATCH YOUR FILTER.'}
          </div>
        ) : (
          filteredTeams.map((team) => (
            <div
              key={team.id}
              className="border border-[#222226] bg-[#0D0D10] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-2xl font-extrabold uppercase text-[#F4F2EC]">
                    {team.team_name}
                  </p>
                  <p className="mt-0.5 font-mono text-xs uppercase tracking-[0.14em] text-[#8E8E93]">
                    {team.team_code}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {team.is_active ? (
                    <span className="border border-[#22C55E]/30 bg-[#22C55E]/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#22C55E]">
                      ● Active
                    </span>
                  ) : (
                    <span className="border border-[#27272A] bg-[#18181B] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#71717A]">
                      Archived
                    </span>
                  )}
                  {team.has_voted ? (
                    <span className="bg-[#F4F2EC] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#09090B]">
                      Voted
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#52525B]">
                      Pending
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-[#222226] pt-3">
                {team.is_active ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setRenameTarget({ team, name: team.team_name })}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 border border-[#27272A] bg-[#09090B] px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#F4F2EC] active:border-[#F4F2EC]"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmTarget({ type: 'reset_password', team })}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 border border-[#27272A] bg-[#09090B] px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#F4F2EC] active:border-[#F4F2EC]"
                    >
                      <KeyRound className="h-3.5 w-3.5" /> Key
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmTarget({ type: 'archive', team })}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center border border-[#27272A] bg-[#09090B] px-3 text-[#A1A1AA] active:border-[#F4F2EC]"
                      aria-label="Archive Team"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmTarget({ type: 'delete_permanent', team })}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center border border-[#FF2E17]/40 bg-[#FF2E17]/10 px-3 text-[#FF2E17] active:bg-[#FF2E17] active:text-white"
                      aria-label="Delete Permanently"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setConfirmTarget({ type: 'unarchive', team })}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 border border-[#22C55E]/40 bg-[#22C55E]/10 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#22C55E] active:bg-[#22C55E] active:text-[#09090B]"
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" /> Unarchive
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmTarget({ type: 'delete_permanent', team })}
                      className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center border border-[#FF2E17]/40 bg-[#FF2E17]/10 px-3.5 text-[#FF2E17] active:bg-[#FF2E17] active:text-white"
                      aria-label="Delete Permanently"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Hairline Teams Table */}
      <div className="hidden border border-[#222226] bg-[#0D0D10] md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-[#222226] hover:bg-transparent">
              <TableHead className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                Team Name
              </TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                Login ID
              </TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                Status
              </TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                Ballot
              </TableHead>
              <TableHead className="text-right font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeams.length === 0 ? (
              <TableRow className="border-[#222226] hover:bg-transparent">
                <TableCell
                  colSpan={5}
                  className="py-12 text-center font-mono text-xs uppercase tracking-[0.2em] text-[#52525B]"
                >
                  {teams.length === 0
                    ? 'NO TEAMS REGISTERED FOR THIS EVENT YET.'
                    : 'NO TEAMS MATCH YOUR CURRENT FILTER.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredTeams.map((team) => (
                <TableRow
                  key={team.id}
                  className="border-[#222226] transition-colors hover:bg-[#141418]"
                >
                  <TableCell className="font-display text-2xl font-bold uppercase tracking-tight text-[#F4F2EC]">
                    {team.team_name}
                  </TableCell>
                  <TableCell className="font-mono text-xs uppercase tracking-[0.14em] text-[#A1A1AA]">
                    {team.team_code}
                  </TableCell>
                  <TableCell>
                    {team.is_active ? (
                      <span className="inline-flex items-center gap-1.5 border border-[#22C55E]/30 bg-[#22C55E]/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#22C55E]">
                        ● Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center border border-[#27272A] bg-[#18181B] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[#71717A]">
                        Archived
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {team.has_voted ? (
                      <span className="inline-flex items-center border border-[#F4F2EC]/30 bg-[#F4F2EC] px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#09090B]">
                        Voted
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#52525B]">
                        Pending
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="space-x-1.5 text-right">
                    {team.is_active ? (
                      <>
                        <button
                          type="button"
                          title="Rename Team"
                          onClick={() => setRenameTarget({ team, name: team.team_name })}
                          className="inline-flex h-8 w-8 items-center justify-center border border-[#27272A] bg-[#09090B] text-[#A1A1AA] transition-colors hover:border-[#F4F2EC] hover:text-[#F4F2EC]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Reset Password"
                          onClick={() => setConfirmTarget({ type: 'reset_password', team })}
                          className="inline-flex h-8 w-8 items-center justify-center border border-[#27272A] bg-[#09090B] text-[#A1A1AA] transition-colors hover:border-[#F4F2EC] hover:text-[#F4F2EC]"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Archive Team"
                          onClick={() => setConfirmTarget({ type: 'archive', team })}
                          className="inline-flex h-8 w-8 items-center justify-center border border-[#27272A] bg-[#09090B] text-[#A1A1AA] transition-colors hover:border-[#F4F2EC] hover:text-[#F4F2EC]"
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Permanently Delete Team"
                          onClick={() => setConfirmTarget({ type: 'delete_permanent', team })}
                          className="inline-flex h-8 w-8 items-center justify-center border border-[#FF2E17]/40 bg-[#FF2E17]/10 text-[#FF2E17] transition-colors hover:bg-[#FF2E17] hover:text-white"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          title="Unarchive Team"
                          onClick={() => setConfirmTarget({ type: 'unarchive', team })}
                          className="inline-flex items-center gap-1.5 border border-[#22C55E]/40 bg-[#22C55E]/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#22C55E] transition-colors hover:bg-[#22C55E] hover:text-[#09090B]"
                        >
                          <ArchiveRestore className="h-3.5 w-3.5" />
                          Unarchive
                        </button>
                        <button
                          type="button"
                          title="Permanently Delete Team"
                          onClick={() => setConfirmTarget({ type: 'delete_permanent', team })}
                          className="inline-flex h-8 w-8 items-center justify-center border border-[#FF2E17]/40 bg-[#FF2E17]/10 text-[#FF2E17] transition-colors hover:bg-[#FF2E17] hover:text-white"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Rename Team Dialog */}
      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => !open && !actionLoading && setRenameTarget(null)}
      >
        <DialogContent className="rounded-none border-[#F4F2EC] bg-[#09090B] text-[#F4F2EC] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl font-extrabold uppercase tracking-tight">
              RENAME TEAM
            </DialogTitle>
            <DialogDescription className="text-sm text-[#A1A1AA]">
              Syncs live across all stage displays without changing credentials or vote history.
            </DialogDescription>
          </DialogHeader>

          {renameTarget && (
            <form onSubmit={submitRename} className="space-y-5 pt-2">
              <div className="space-y-2">
                <label
                  htmlFor="rename-team-input"
                  className="block font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]"
                >
                  New Team Name
                </label>
                <input
                  id="rename-team-input"
                  autoFocus
                  value={renameTarget.name}
                  onChange={(e) =>
                    setRenameTarget({ ...renameTarget, name: e.target.value })
                  }
                  className="min-h-[48px] w-full border border-[#27272A] bg-[#0D0D10] px-4 py-3 font-mono text-base text-[#F4F2EC] focus:border-[#F4F2EC] focus:outline-none sm:text-sm"
                />
              </div>

              <DialogFooter className="gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setRenameTarget(null)}
                  className="min-h-[44px] border border-[#27272A] px-4 py-2.5 font-mono text-xs uppercase tracking-[0.16em] text-[#F4F2EC] active:border-[#F4F2EC] sm:hover:border-[#F4F2EC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || !renameTarget.name.trim()}
                  className="inline-flex min-h-[44px] items-center justify-center bg-[#F4F2EC] px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#09090B] transition-colors active:bg-[#FF2E17] active:text-white disabled:opacity-50 sm:hover:bg-[#FF2E17] sm:hover:text-white"
                >
                  {actionLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                  Save Name
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <Dialog
        open={confirmTarget !== null}
        onOpenChange={(open) => !open && !actionLoading && setConfirmTarget(null)}
      >
        <DialogContent className="rounded-none border-[#F4F2EC] bg-[#09090B] text-[#F4F2EC] sm:max-w-md">
          {dialogMeta && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-3xl font-extrabold uppercase tracking-tight">
                  {dialogMeta.title}
                </DialogTitle>
                <DialogDescription className="pt-1 text-sm text-[#A1A1AA]">
                  {dialogMeta.description}
                </DialogDescription>
              </DialogHeader>

              {dialogMeta.warning && (
                <div className="flex items-start gap-3 border border-[#FF2E17]/40 bg-[#FF2E17]/10 p-3 font-mono text-xs text-[#FF2E17]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{dialogMeta.warning}</span>
                </div>
              )}

              <DialogFooter className="mt-2 gap-2">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setConfirmTarget(null)}
                  className="min-h-[44px] border border-[#27272A] px-4 py-2.5 font-mono text-xs uppercase tracking-[0.16em] text-[#F4F2EC] active:border-[#F4F2EC] sm:hover:border-[#F4F2EC]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={submitConfirmAction}
                  className={`inline-flex min-h-[44px] items-center justify-center px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.16em] transition-colors ${dialogMeta.btnClass}`}
                >
                  {actionLoading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                  {dialogMeta.confirmLabel}
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* One-Time Credential Modal */}
      <Dialog
        open={!!credentialModal}
        onOpenChange={(open) => !open && setCredentialModal(null)}
      >
        <DialogContent className="rounded-none border-[#F4F2EC] bg-[#09090B] text-[#F4F2EC] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl font-extrabold uppercase tracking-tight text-[#FF2E17]">
              CREDENTIALS GENERATED
            </DialogTitle>
            <DialogDescription className="text-sm text-[#A1A1AA]">
              Share privately with <strong className="text-[#F4F2EC]">{credentialModal?.teamName}</strong>.
              For security, this password is shown once.
            </DialogDescription>
          </DialogHeader>

          {credentialModal && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border border-[#222226] bg-[#0D0D10] p-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8E8E93]">
                    Team Login ID
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-[#F4F2EC]">
                    {credentialModal.loginId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyText('Login ID', credentialModal.loginId)}
                  className="flex h-11 w-11 items-center justify-center border border-[#27272A] text-[#A1A1AA] active:border-[#F4F2EC] active:text-[#F4F2EC] sm:h-9 sm:w-9 sm:hover:border-[#F4F2EC] sm:hover:text-[#F4F2EC]"
                >
                  {copiedField === 'Login ID' ? (
                    <Check className="h-4 w-4 text-[#22C55E]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between border border-[#222226] bg-[#0D0D10] p-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8E8E93]">
                    Generated Password
                  </p>
                  <p className="mt-1 font-mono text-lg font-bold text-[#FF2E17]">
                    {credentialModal.password}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyText('Password', credentialModal.password)}
                  className="flex h-11 w-11 items-center justify-center border border-[#27272A] text-[#A1A1AA] active:border-[#F4F2EC] active:text-[#F4F2EC] sm:h-9 sm:w-9 sm:hover:border-[#F4F2EC] sm:hover:text-[#F4F2EC]"
                >
                  {copiedField === 'Password' ? (
                    <Check className="h-4 w-4 text-[#22C55E]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  copyText(
                    'Both credentials',
                    `Team: ${credentialModal.teamName}\nLogin ID: ${credentialModal.loginId}\nPassword: ${credentialModal.password}`
                  )
                }
                className="flex min-h-[48px] w-full items-center justify-center gap-2 bg-[#F4F2EC] py-3.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#09090B] transition-colors active:bg-[#FF2E17] active:text-white sm:hover:bg-[#FF2E17] sm:hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" /> Copy Both Credentials
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}