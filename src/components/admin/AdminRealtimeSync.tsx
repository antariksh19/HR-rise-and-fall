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
      // Debounce slightly because a single vote updates both `teams` and `events`
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
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
        connected
          ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
          : 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          connected ? 'animate-pulse bg-emerald-400' : 'bg-amber-400'
        }`}
      />
      {connected ? 'Live Sync Active' : 'Connecting...'}
    </span>
  );
}