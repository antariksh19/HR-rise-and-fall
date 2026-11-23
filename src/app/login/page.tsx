'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Flame, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

    toast.success('Signed in! Loading your voting dashboard...');
    router.push('/vote');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-6 w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-amber-400"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Event Dashboard
        </Link>
      </div>

      <Card className="w-full max-w-md border-slate-800 bg-slate-950/90 shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <Flame className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-black tracking-tight text-white">
            TEAM VOTING LOGIN
          </CardTitle>
          <CardDescription className="text-slate-400">
            Enter the unique Login ID and password issued by the event administrator.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleTeamLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loginId">Team Login ID</Label>
              <Input
                id="loginId"
                type="text"
                required
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="HRS-8K29Q"
                className="border-slate-800 bg-slate-900 font-mono uppercase"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="border-slate-800 bg-slate-900 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enter Voting Room
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}