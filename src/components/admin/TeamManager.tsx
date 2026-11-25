'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
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

type ConfirmActionType = 'archive' | 'unarchive' | 'delete_permanent';

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');

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
      if (!res.ok) throw new Error(data.error || 'Failed to add team');

      setTeams((prev) => [...prev, data.team]);
      setNewTeamName('');
      toast.success(`"${data.team.team_name}" added to the live roster.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error adding team');
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
      toast.success('Team renamed and synced live.');
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

      if (type === 'archive') {
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
        toast.success(`"${team.team_name}" restored to the roster.`);
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

  const getDialogMeta = (target: { type: ConfirmActionType; team: AdminTeamRow }) => {
    switch (target.type) {
      case 'archive':
        return {
          title: `ARCHIVE "${target.team.team_name}"?`,
          description: `Hides "${target.team.team_name}" from the audience ballot and stage display. You can restore them anytime.`,
          warning: null,
          confirmLabel: 'Archive Team',
          btnClass:
            'bg-[#F4F2EC] text-[#09090B] active:bg-[#FF2E17] active:text-white sm:hover:bg-[#FF2E17] sm:hover:text-white',
        };
      case 'unarchive':
        return {
          title: `RESTORE "${target.team.team_name}"?`,
          description: `Returns "${target.team.team_name}" to the active audience ballot and live stage immediately.`,
          warning: null,
          confirmLabel: 'Restore Team',
          btnClass:
            'bg-[#F4F2EC] text-[#09090B] active:bg-[#22C55E] active:text-[#09090B] sm:hover:bg-[#22C55E] sm:hover:text-[#09090B]',
        };
      case 'delete_permanent':
        return {
          title: `DELETE "${target.team.team_name}"?`,
          description: `Permanently removes "${target.team.team_name}" and wipes any audience votes cast for them.`,
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
        className="flex flex-col border border-[#24242A] bg-[#0E0E12] transition-colors focus-within:border-[#3F3F46] sm:flex-row"
      >
        <input
          placeholder="ENTER NEW TEAM NAME (E.G., HUNTERS)"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          className="min-h-[50px] flex-1 bg-transparent px-4 py-3 font-mono text-base uppercase tracking-[0.12em] text-[#F4F2EC] placeholder:text-[#52525B] focus:outline-none sm:px-5 sm:py-4 sm:text-xs"
        />
        <button
          type="submit"
          disabled={isCreating || !newTeamName.trim()}
          className="inline-flex min-h-[50px] items-center justify-center gap-2 border-t border-[#24242A] bg-[#F4F2EC] px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#09090B] transition-colors active:bg-[#FF2E17] active:text-white disabled:opacity-45 sm:border-l sm:border-t-0 sm:hover:bg-[#FF2E17] sm:hover:text-white"
        >
          {isCreating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Add Team
        </button>
      </form>

      {/* Search & Filter Bar */}
      <div className="flex flex-col justify-between gap-3 border border-[#24242A] bg-[#0E0E12] p-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2.5 px-2">
          <Search className="h-4 w-4 shrink-0 text-[#71717A]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH TEAMS OR CODE..."
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
          {(['all', 'active', 'archived'] as const).map((tab) => (
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

      {/* Mobile Card Stack */}
      <div className="space-y-3 md:hidden">
        {filteredTeams.length === 0 ? (
          <div className="border border-[#24242A] bg-[#0E0E12] py-12 text-center font-mono text-xs uppercase tracking-[0.18em] text-[#52525B]">
            {teams.length === 0
              ? 'NO TEAMS REGISTERED YET.'
              : 'NO TEAMS MATCH YOUR FILTER.'}
          </div>
        ) : (
          filteredTeams.map((team, idx) => (
            <div
              key={team.id}
              className="border border-[#24242A] bg-[#0E0E12] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#71717A]">
                    #{String(idx + 1).padStart(2, '0')} // {team.team_code}
                  </p>
                  <p className="mt-1 truncate font-display text-3xl font-extrabold uppercase leading-none text-[#F4F2EC]">
                    {team.team_name}
                  </p>
                </div>
                {team.is_active ? (
                  <span className="shrink-0 border border-[#22C55E]/30 bg-[#22C55E]/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#22C55E]">
                    ● Active
                  </span>
                ) : (
                  <span className="shrink-0 border border-[#27272A] bg-[#18181B] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#71717A]">
                    Archived
                  </span>
                )}
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
                      onClick={() => setConfirmTarget({ type: 'archive', team })}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 border border-[#27272A] bg-[#09090B] px-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#A1A1AA] active:border-[#F4F2EC] active:text-[#F4F2EC]"
                    >
                      <Archive className="h-3.5 w-3.5" /> Archive
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
                      <ArchiveRestore className="h-3.5 w-3.5" /> Restore
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
      <div className="hidden border border-[#24242A] bg-[#0E0E12] md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-[#222226] hover:bg-transparent">
              <TableHead className="w-16 font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                No.
              </TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                Team Name
              </TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                Code
              </TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                Status
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
              filteredTeams.map((team, idx) => (
                <TableRow
                  key={team.id}
                  className="border-[#222226] transition-colors hover:bg-[#16161B]"
                >
                  <TableCell className="font-mono text-xs text-[#71717A]">
                    {String(idx + 1).padStart(2, '0')}
                  </TableCell>
                  <TableCell className="font-display text-2xl font-bold uppercase tracking-tight text-[#F4F2EC]">
                    {team.team_name}
                  </TableCell>
                  <TableCell className="font-mono text-xs uppercase tracking-[0.14em] text-[#8E8E93]">
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
                          title="Restore Team"
                          onClick={() => setConfirmTarget({ type: 'unarchive', team })}
                          className="inline-flex items-center gap-1.5 border border-[#22C55E]/40 bg-[#22C55E]/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#22C55E] transition-colors hover:bg-[#22C55E] hover:text-[#09090B]"
                        >
                          <ArchiveRestore className="h-3.5 w-3.5" />
                          Restore
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
              Syncs live across the audience ballot and stage display immediately.
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
                  className="min-h-[48px] w-full border border-[#27272A] bg-[#0E0E12] px-4 py-3 font-mono text-base text-[#F4F2EC] focus:border-[#F4F2EC] focus:outline-none sm:text-sm"
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
    </div>
  );
}