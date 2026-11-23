'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function AdminSignOutButton() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="inline-flex items-center gap-2 border border-[#27272A] bg-[#111114] px-3.5 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8E8E93] transition-colors hover:border-[#FF2E17] hover:text-[#FF2E17]"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Sign Out</span>
    </button>
  );
}