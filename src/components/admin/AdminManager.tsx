'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserPlus,
  Trash2,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
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
      {/* Add Admin Strip */}
      <form
        onSubmit={handleAddAdmin}
        className="grid grid-cols-1 divide-y divide-[#222226] border border-[#222226] bg-[#0D0D10] lg:grid-cols-4 lg:divide-x lg:divide-y-0"
      >
        <input
          type="text"
          placeholder="NAME (OPTIONAL)"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="bg-transparent px-4 py-4 font-mono text-base text-[#F4F2EC] placeholder:text-[#52525B] focus:outline-none sm:text-xs"
        />
        <input
          type="email"
          required
          placeholder="ADMIN EMAIL"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-transparent px-4 py-4 font-mono text-base text-[#F4F2EC] placeholder:text-[#52525B] focus:outline-none sm:text-xs"
        />
        <input
          type="text"
          placeholder="PASSWORD (BLANK = AUTO)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-transparent px-4 py-4 font-mono text-base text-[#F4F2EC] placeholder:text-[#52525B] focus:outline-none sm:text-xs"
        />
        <button
          type="submit"
          disabled={isAdding}
          className="inline-flex items-center justify-center gap-2 bg-[#F4F2EC] px-5 py-4 font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#09090B] transition-colors hover:bg-[#FF2E17] hover:text-white disabled:opacity-50"
        >
          {isAdding ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UserPlus className="h-3.5 w-3.5" />
          )}
          Grant Admin Access
        </button>
      </form>

      {/* Admins Table */}
      <div className="border border-[#222226] bg-[#0D0D10]">
        <Table>
          <TableHeader>
            <TableRow className="border-[#222226] hover:bg-transparent">
              <TableHead className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                Name
              </TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                Admin Email
              </TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                Role
              </TableHead>
              <TableHead className="font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                Added On
              </TableHead>
              <TableHead className="text-right font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {admins.map((admin) => {
              const isSelf = admin.user_id === currentAdminId;
              return (
                <TableRow
                  key={admin.user_id}
                  className="border-[#222226] transition-colors hover:bg-[#141418]"
                >
                  <TableCell className="font-display text-2xl font-bold uppercase text-[#F4F2EC]">
                    {admin.display_name || 'Admin'}
                    {isSelf && (
                      <span className="ml-2.5 border border-[#F4F2EC] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[#F4F2EC]">
                        YOU
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[#A1A1AA]">
                    {admin.email}
                  </TableCell>
                  <TableCell className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#22C55E]">
                    ● ADMINISTRATOR
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[#71717A]">
                    {new Intl.DateTimeFormat('en-GB', {
                      timeZone: 'UTC',
                      dateStyle: 'medium',
                    }).format(new Date(admin.created_at))}
                  </TableCell>
                  <TableCell className="text-right">
                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => setRevokeTarget(admin)}
                        className="inline-flex items-center gap-1.5 border border-[#FF2E17]/40 bg-[#FF2E17]/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#FF2E17] transition-colors hover:bg-[#FF2E17] hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Revoke
                      </button>
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
        <DialogContent className="rounded-none border-[#F4F2EC] bg-[#09090B] text-[#F4F2EC] sm:max-w-md">
          {revokeTarget && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-3xl font-extrabold uppercase tracking-tight">
                  REVOKE ADMIN ACCESS?
                </DialogTitle>
                <DialogDescription className="pt-1 text-sm text-[#A1A1AA]">
                  Remove administrator privileges from{' '}
                  <strong className="text-[#F4F2EC]">{revokeTarget.email}</strong>?
                </DialogDescription>
              </DialogHeader>

              <div className="flex items-start gap-3 border border-[#FF2E17]/40 bg-[#FF2E17]/10 p-3 font-mono text-xs text-[#FF2E17]">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>They will immediately lose access to the Control Room.</span>
              </div>

              <DialogFooter className="mt-2 gap-2">
                <button
                  type="button"
                  disabled={revoking}
                  onClick={() => setRevokeTarget(null)}
                  className="border border-[#27272A] px-4 py-2.5 font-mono text-xs uppercase tracking-[0.16em] text-[#F4F2EC] hover:border-[#F4F2EC]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={revoking}
                  onClick={handleRevokeAdmin}
                  className="inline-flex items-center justify-center bg-[#FF2E17] px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-white transition-colors hover:bg-[#DC2626]"
                >
                  {revoking ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
                  Revoke Access
                </button>
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
        <DialogContent className="rounded-none border-[#F4F2EC] bg-[#09090B] text-[#F4F2EC] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl font-extrabold uppercase tracking-tight text-[#FF2E17]">
              ADMIN CREDENTIALS READY
            </DialogTitle>
            <DialogDescription className="text-sm text-[#A1A1AA]">
              Share privately. They can sign in via the{' '}
              <strong className="text-[#F4F2EC]">Admin</strong> button on the main page.
            </DialogDescription>
          </DialogHeader>

          {credentialModal && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border border-[#222226] bg-[#0D0D10] p-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8E8E93]">
                    Admin Email
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-[#F4F2EC]">
                    {credentialModal.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyText('Email', credentialModal.email)}
                  className="flex h-11 w-11 items-center justify-center border border-[#27272A] text-[#A1A1AA] hover:border-[#F4F2EC] hover:text-[#F4F2EC]"
                >
                  {copiedField === 'Email' ? (
                    <Check className="h-4 w-4 text-[#22C55E]" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-between border border-[#222226] bg-[#0D0D10] p-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8E8E93]">
                    Password
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-[#FF2E17]">
                    {credentialModal.password}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyText('Password', credentialModal.password)}
                  className="flex h-11 w-11 items-center justify-center border border-[#27272A] text-[#A1A1AA] hover:border-[#F4F2EC] hover:text-[#F4F2EC]"
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
                    'Admin credentials',
                    `Admin Login: ${window.location.origin}/admin/login\nEmail: ${credentialModal.email}\nPassword: ${credentialModal.password}`
                  )
                }
                className="flex w-full items-center justify-center gap-2 bg-[#F4F2EC] py-3.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#09090B] transition-colors hover:bg-[#FF2E17] hover:text-white"
              >
                <Copy className="h-3.5 w-3.5" /> Copy Login Link &amp; Credentials
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}