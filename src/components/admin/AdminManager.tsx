'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserPlus,
  Trash2,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export interface AdminRow {
  user_id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

export function AdminManager({
  initialAdmins,
  currentAdminId,
}: {
  initialAdmins: AdminRow[];
  currentAdminId: string;
}) {
  const router = useRouter();
  const [admins, setAdmins] = useState<AdminRow[]>(initialAdmins);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const [credentialModal, setCredentialModal] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<AdminRow | null>(null);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    setAdmins(initialAdmins);
  }, [initialAdmins]);

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setIsAdding(true);

    try {
      const payload: { email: string; displayName?: string; password?: string } = {
        email: email.trim(),
      };
      if (displayName.trim()) payload.displayName = displayName.trim();
      if (password.trim()) payload.password = password.trim();

      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add admin');

      setAdmins((prev) => [...prev, data.admin]);
      setDisplayName('');
      setEmail('');
      setPassword('');

      if (data.credentials) {
        setCredentialModal(data.credentials);
      }
      toast.success(`Admin access granted to ${data.admin.email}.`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error adding admin');
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRevokeAdmin() {
    if (!revokeTarget) return;
    setRevoking(true);

    try {
      const res = await fetch(`/api/admin/admins/${revokeTarget.user_id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke access');

      setAdmins((prev) => prev.filter((a) => a.user_id !== revokeTarget.user_id));
      toast.success(`Admin access revoked for ${revokeTarget.email}.`);
      setRevokeTarget(null);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error revoking access');
    } finally {
      setRevoking(false);
    }
  }

  function copyText(label: string, value: string) {
    navigator.clipboard.writeText(value);
    setCopiedField(label);
    toast.success(`${label} copied to clipboard.`);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Add Admin Form */}
      <form
        onSubmit={handleAddAdmin}
        className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 lg:grid-cols-4"
      >
        <Input
          type="text"
          placeholder="Name (optional)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="border-slate-800 bg-slate-900 text-white"
        />
        <Input
          type="email"
          required
          placeholder="Admin email (e.g., cohost@company.com)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border-slate-800 bg-slate-900 text-white"
        />
        <Input
          type="text"
          placeholder="Password (blank = auto-generate)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border-slate-800 bg-slate-900 text-white"
        />
        <Button
          type="submit"
          disabled={isAdding}
          className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
        >
          {isAdding ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          Add Admin
        </Button>
      </form>

      {/* Admins Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/70">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800">
              <TableHead>Name</TableHead>
              <TableHead>Admin Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Added On</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => {
              const isSelf = admin.user_id === currentAdminId;
              return (
                <TableRow key={admin.user_id} className="border-slate-800">
                  <TableCell className="font-semibold text-white">
                    {admin.display_name || 'Admin'}
                    {isSelf && (
                      <Badge className="ml-2 bg-amber-500/15 text-amber-400">You</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-300">{admin.email}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <ShieldCheck className="h-3.5 w-3.5" /> Administrator
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-400">
                    {new Date(admin.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    {!isSelf && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setRevokeTarget(admin)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Revoke Access Dialog */}
      <Dialog
        open={revokeTarget !== null}
        onOpenChange={(open) => !open && !revoking && setRevokeTarget(null)}
      >
        <DialogContent className="border-slate-800 bg-slate-950 text-white sm:max-w-md">
          {revokeTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black text-white">
                  Revoke Admin Access?
                </DialogTitle>
                <DialogDescription className="pt-1 text-slate-300">
                  Remove administrator privileges from{' '}
                  <strong className="text-white">{revokeTarget.email}</strong>? They will immediately lose access to the Admin Control Panel.
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <span>You can re-add them later if needed.</span>
              </div>

              <DialogFooter className="mt-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={revoking}
                  onClick={() => setRevokeTarget(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={revoking}
                  onClick={handleRevokeAdmin}
                  className="bg-red-600 font-bold text-white hover:bg-red-500"
                >
                  {revoking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Revoke Access
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* One-Time Admin Credentials Modal */}
      <Dialog
        open={credentialModal !== null}
        onOpenChange={(open) => !open && setCredentialModal(null)}
      >
        <DialogContent className="border-amber-500/40 bg-slate-950 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-amber-400">
              Admin Credentials Ready
            </DialogTitle>
            <DialogDescription className="text-slate-300">
              Share these login details privately. They can sign in via the{' '}
              <strong>Admin Login</strong> button on the main page.
            </DialogDescription>
          </DialogHeader>

          {credentialModal && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-3">
                <div>
                  <p className="text-xs uppercase text-slate-400">Admin Email</p>
                  <p className="font-mono text-sm font-bold text-white">
                    {credentialModal.email}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyText('Email', credentialModal.email)}
                >
                  {copiedField === 'Email' ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-3">
                <div>
                  <p className="text-xs uppercase text-slate-400">Password</p>
                  <p className="font-mono text-sm font-bold text-amber-400">
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
                    'Admin credentials',
                    `Admin Login: ${window.location.origin}/admin/login\nEmail: ${credentialModal.email}\nPassword: ${credentialModal.password}`
                  )
                }
              >
                <Copy className="mr-2 h-4 w-4" /> Copy Login Link &amp; Credentials
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}