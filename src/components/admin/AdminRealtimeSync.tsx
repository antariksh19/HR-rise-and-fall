'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

export function AdminRealtimeSync({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    const triggerRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        router.refresh();
      }, 150);
    };

    const channel = supabase
      .channel(`admin-sync-${eventId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` },
        triggerRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `event_id=eq.${eventId}` },
        triggerRefresh
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [eventId, router]);

  return (
    <span className="inline-flex items-center gap-2 border border-[#27272A] bg-[#111114] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#A1A1AA]">
      <span
        className={`h-2 w-2 ${
          connected ? 'animate-pulse bg-[#22C55E]' : 'bg-[#FF2E17]'
        }`}
      />
      {connected ? 'LIVE SYNC' : 'CONNECTING'}
    </span>
  );
}