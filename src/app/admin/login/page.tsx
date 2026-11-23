'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, ArrowLeft, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      toast.error('Invalid administrator email or password.');
      setLoading(false);
      return;
    }

    toast.success('Welcome to the Control Room.');
    router.push('/admin');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#09090B] text-[#F4F2EC]">
      <header className="flex items-stretch justify-between border-b border-[#222226]">
        <Link
          href="/"
          className="flex items-center gap-3 border-r border-[#222226] px-6 py-4 font-mono text-xs uppercase tracking-[0.18em] text-[#8E8E93] transition-colors hover:bg-[#141417] hover:text-[#F4F2EC]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Stage
        </Link>
        <div className="flex items-center px-6 font-mono text-[11px] uppercase tracking-[0.2em] text-[#52525B]">
          RESTRICTED // CONTROL ROOM
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-12">
        <div className="border border-[#222226] bg-[#0D0D10] p-8 sm:p-10">
          <div className="mb-8 border-b border-[#222226] pb-6">
            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#FF2E17]">
              <Shield className="h-3.5 w-3.5" />
              <span>ADMINISTRATOR ACCESS</span>
            </div>
            <h1 className="mt-2 font-display text-5xl font-extrabold uppercase leading-none">
              CONTROL ROOM
            </h1>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block font-mono text-[11px] uppercase tracking-[0.2em] text-[#8E8E93]"
              >
                Admin Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@domain.com"
                className="w-full border border-[#27272A] bg-[#09090B] px-4 py-3.5 font-mono text-sm text-[#F4F2EC] placeholder:text-[#52525B] focus:border-[#F4F2EC] focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block font-mono text-[11px] uppercase tracking-[0.2em] text-[#8E8E93]"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full border border-[#27272A] bg-[#09090B] px-4 py-3.5 pr-12 font-mono text-sm text-[#F4F2EC] placeholder:text-[#52525B] focus:border-[#F4F2EC] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8E8E93] transition-colors hover:text-[#F4F2EC]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 bg-[#F4F2EC] px-6 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#09090B] transition-colors hover:bg-[#FF2E17] hover:text-white disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Authenticate'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}