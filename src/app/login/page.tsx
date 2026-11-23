'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { LiveTimecode, CornerMarks } from '@/components/ui/BroadcastPrimitives';

export default function TeamLoginPage() {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleTeamLogin(e: React.FormEvent) {
    e.preventDefault();
    const cleanedCode = loginId.trim().toUpperCase();
    if (!cleanedCode) {
      toast.error('Please enter your Team Login ID.');
      return;
    }

    setLoading(true);
    const internalEmail = `${cleanedCode.toLowerCase()}@team.hrrisefall.internal`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email: internalEmail,
      password,
    });

    if (error || !data.user) {
      toast.error('Invalid Team Login ID or password.');
      setLoading(false);
      return;
    }

    toast.success('Authenticated. Entering voting room...');
    router.push('/vote');
    router.refresh();
  }

  return (
    <main className="broadcast-grain flex min-h-screen flex-col bg-[#09090B] text-[#F4F2EC]">
      {/* Top Strip */}
      <header className="flex items-stretch justify-between border-b border-[#222226]">
        <Link
          href="/"
          className="flex items-center gap-3 border-r border-[#222226] px-6 py-4 font-mono text-xs uppercase tracking-[0.18em] text-[#8E8E93] transition-colors hover:bg-[#141417] hover:text-[#F4F2EC]"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Stage
        </Link>
        <div className="flex items-center gap-4 px-6 font-mono text-[11px] uppercase tracking-[0.2em] text-[#52525B]">
          <span className="hidden sm:inline">HR RISE &amp; FALL // TEAM ACCESS</span>
          <span className="text-[#27272A]">/</span>
          <LiveTimecode />
        </div>
      </header>

      {/* Split Editorial Login */}
      <div className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 lg:grid-cols-12">
        {/* Left Statement */}
        <div className="relative flex flex-col justify-between border-b border-[#222226] p-8 sm:p-12 lg:col-span-7 lg:border-r lg:border-b-0 lg:p-16">
          <CornerMarks />
          <span className="font-mono text-xs uppercase tracking-[0.22em] text-[#FF2E17]">
            [ 01 / BALLOT AUTHENTICATION ]
          </span>

          <div className="my-12">
            <h1 className="font-display text-6xl font-extrabold uppercase leading-[0.86] tracking-tight sm:text-8xl">
              {['TEAM', 'VOTING'].map((line, i) => (
                <span key={line} className="block overflow-hidden">
                  <motion.span
                    className="block"
                    initial={{ y: '105%' }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
              <span className="block overflow-hidden">
                <motion.span
                  className="block text-[#FF2E17]"
                  initial={{ y: '105%' }}
                  animate={{ y: 0 }}
                  transition={{ duration: 0.5, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
                >
                  ROOM.
                </motion.span>
              </span>
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-[#A1A1AA]">
              Enter the unique Team Login ID and one-time password issued by the
              event control room. Each team receives exactly one irrevocable save vote.
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-[#222226] pt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-[#52525B]">
            <span>ONE BALLOT PER TEAM</span>
            <span>ZERO SELF-VOTING</span>
          </div>
        </div>

        {/* Right Form */}
        <div className="bg-telemetry-dots relative flex flex-col justify-center bg-[#0D0D10] p-8 sm:p-12 lg:col-span-5 lg:p-16">
          <div className="relative border border-[#222226] bg-[#09090B]/95 p-7 sm:p-9">
            <CornerMarks />
            <div className="mb-8 border-b border-[#222226] pb-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#8E8E93]">
                CREDENTIALS REQUIRED
              </p>
              <h2 className="mt-1 font-display text-3xl font-extrabold uppercase">
                SIGN IN TO VOTE
              </h2>
            </div>

            <form onSubmit={handleTeamLogin} className="space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="loginId"
                  className="block font-mono text-[11px] uppercase tracking-[0.2em] text-[#8E8E93]"
                >
                  Team Login ID
                </label>
                <input
                  id="loginId"
                  type="text"
                  required
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="HRS-8K29Q"
                  className="w-full border border-[#27272A] bg-[#0D0D10] px-4 py-3.5 font-mono text-sm uppercase tracking-wider text-[#F4F2EC] placeholder:text-[#52525B] focus:border-[#F4F2EC] focus:outline-none"
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
                    className="w-full border border-[#27272A] bg-[#0D0D10] px-4 py-3.5 pr-12 font-mono text-sm text-[#F4F2EC] placeholder:text-[#52525B] focus:border-[#F4F2EC] focus:outline-none"
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
                className="group flex w-full items-center justify-center gap-2 bg-[#F4F2EC] px-6 py-4 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#09090B] transition-colors hover:bg-[#FF2E17] hover:text-white disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Enter Voting Room
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}