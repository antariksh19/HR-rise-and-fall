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
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
          title: 'Reset Team Password?',
          description: `Generate a brand-new password for "${target.team.team_name}" (${target.team.team_code})? Their previous password will stop working immediately.`,
          warning: null,
          confirmLabel: 'Reset Password',
          btnClass: 'bg-amber-500 font-bold text-slate-950 hover:bg-amber-400',
        };
      case 'archive':
        return {
          title: `Archive "${target.team.team_name}"?`,
          description: `This temporarily suspends login access for ${target.team.team_code} and hides them from the live competition board. You can restore them anytime.`,
          warning: 'Any vote cast by this team is invalidated while archived.',
          confirmLabel: 'Archive Team',
          btnClass: 'bg-amber-500 font-bold text-slate-950 hover:bg-amber-400',
        };
      case 'unarchive':
        return {
          title: `Restore "${target.team.team_name}"?`,
          description: `This will re-enable login access for ${target.team.team_code} and put them back on the live competition board.`,
          warning: null,
          confirmLabel: 'Unarchive Team',
          btnClass: 'bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400',
        };
      case 'delete_permanent':
        return {
          title: `Permanently Delete "${target.team.team_name}"?`,
          description: `This will completely erase "${target.team.team_name}" (${target.team.team_code}), delete their login account, and wipe any votes associated with them.`,
          warning: 'This action is permanent and cannot be undone.',
          confirmLabel: 'Delete Permanently',
          btnClass: 'bg-red-600 font-bold text-white hover:bg-red-500',
        };
    }
  };

  const dialogMeta = confirmTarget ? getDialogMeta(confirmTarget) : null;

  return (
    <div className="space-y-6">
      {/* Add Team Form */}
      <form onSubmit={handleCreateTeam} className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Enter new team name (e.g., Team Alpha)"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          className="border-slate-800 bg-slate-900 text-white"
        />
        <Button
          type="submit"
          disabled={isCreating}
          className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
        >
          {isCreating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Add Team &amp; Generate Credentials
        </Button>
      </form>

      {/* Teams Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/70">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800">
              <TableHead>Team Name</TableHead>
              <TableHead>Login ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Vote Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-slate-400">
                  No teams registered for this event yet.
                </TableCell>
              </TableRow>
            ) : (
              teams.map((team) => (
                <TableRow key={team.id} className="border-slate-800">
                  <TableCell className="font-semibold text-white">
                    {team.team_name}
                  </TableCell>
                  <TableCell className="font-mono text-amber-400">
                    {team.team_code}
                  </TableCell>
                  <TableCell>
                    {team.is_active ? (
                      <Badge className="bg-emerald-500/15 text-emerald-400">
                        Active
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-slate-800 text-slate-400"
                      >
                        Archived
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {team.has_voted ? (
                      <Badge className="bg-amber-500/15 text-amber-400">
                        Voted
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-500">Pending</span>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2 text-right">
                    {team.is_active ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          title="Rename Team"
                          onClick={() =>
                            setRenameTarget({ team, name: team.team_name })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          title="Reset Password"
                          onClick={() =>
                            setConfirmTarget({ type: 'reset_password', team })
                          }
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          title="Archive Team"
                          className="border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                          onClick={() =>
                            setConfirmTarget({ type: 'archive', team })
                          }
                        >
                          <Archive className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          title="Permanently Delete Team"
                          onClick={() =>
                            setConfirmTarget({ type: 'delete_permanent', team })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          title="Unarchive Team"
                          className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                          onClick={() =>
                            setConfirmTarget({ type: 'unarchive', team })
                          }
                        >
                          <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />
                          Unarchive
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          title="Permanently Delete Team"
                          onClick={() =>
                            setConfirmTarget({ type: 'delete_permanent', team })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
        <DialogContent className="border-slate-800 bg-slate-950 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-white">
              Rename Team
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Changes sync immediately across all connected screens without affecting login credentials or vote history.
            </DialogDescription>
          </DialogHeader>

          {renameTarget && (
            <form onSubmit={submitRename} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="rename-team-input">New Team Name</Label>
                <Input
                  id="rename-team-input"
                  autoFocus
                  value={renameTarget.name}
                  onChange={(e) =>
                    setRenameTarget({ ...renameTarget, name: e.target.value })
                  }
                  className="border-slate-800 bg-slate-900 text-white"
                />
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() => setRenameTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading || !renameTarget.name.trim()}
                  className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
                >
                  {actionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save Name
                </Button>
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
        <DialogContent className="border-slate-800 bg-slate-950 text-white sm:max-w-md">
          {dialogMeta && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-white">
                  {dialogMeta.title}
                </DialogTitle>
                <DialogDescription className="pt-1 text-slate-300">
                  {dialogMeta.description}
                </DialogDescription>
              </DialogHeader>

              {dialogMeta.warning && (
                <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <span>{dialogMeta.warning}</span>
                </div>
              )}

              <DialogFooter className="mt-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={actionLoading}
                  onClick={() => setConfirmTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={actionLoading}
                  onClick={submitConfirmAction}
                  className={dialogMeta.btnClass}
                >
                  {actionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {dialogMeta.confirmLabel}
                </Button>
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
        <DialogContent className="border-amber-500/40 bg-slate-950 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-amber-400">
              Team Credentials Generated
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              Share these credentials privately with{' '}
              <strong>{credentialModal?.teamName}</strong>. For security, this
              password will not be shown again.
            </DialogDescription>
          </DialogHeader>

          {credentialModal && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-3">
                <div>
                  <p className="text-xs uppercase text-slate-400">Team Login ID</p>
                  <p className="font-mono text-lg font-bold text-white">
                    {credentialModal.loginId}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyText('Login ID', credentialModal.loginId)}
                >
                  {copiedField === 'Login ID' ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-3">
                <div>
                  <p className="text-xs uppercase text-slate-400">
                    Generated Password
                  </p>
                  <p className="font-mono text-lg font-bold text-amber-400">
                    {credentialModal.password}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyText('Password', credentialModal.password)}
                >
                  {copiedField === 'Password' ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <Button
                className="w-full bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
                onClick={() =>
                  copyText(
                    'Both credentials',
                    `Team: ${credentialModal.teamName}\nLogin ID: ${credentialModal.loginId}\nPassword: ${credentialModal.password}`
                  )
                }
              >
                <Copy className="mr-2 h-4 w-4" /> Copy Both Credentials
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}