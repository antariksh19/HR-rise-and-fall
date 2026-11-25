'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { EventRecord, TeamRecord } from '@/types/database';

export function useEventRealtime(
  initialEvent: EventRecord | null,
  initialTeams: TeamRecord[]
) {
  const [event, setEvent] = useState<EventRecord | null>(initialEvent);
  const [teams, setTeams] = useState<TeamRecord[]>(initialTeams);
  const [recentTeamIds, setRecentTeamIds] = useState<Set<string>>(new Set());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting'>('connected');

  const prevTeamCountRef = useRef<number | null>(initialEvent?.active_team_count ?? null);
  const supabase = createBrowserSupabaseClient();

  const highlightTeam = useCallback((teamId: string) => {
    setRecentTeamIds((prev) => new Set(prev).add(teamId));
    setTimeout(() => {
      setRecentTeamIds((prev) => {
        const next = new Set(prev);
        next.delete(teamId);
        return next;
      });
    }, 4000);
  }, []);

  const refreshTeams = useCallback(
    async (eventId: string) => {
      const { data: tm } = await supabase
        .from('teams')
        .select('id, event_id, team_name, team_code, is_active, created_at')
        .eq('event_id', eventId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (tm) setTeams(tm as TeamRecord[]);
    },
    [supabase]
  );

  const refreshAuthoritativeState = useCallback(async () => {
    const { data: ev } = await supabase
      .from('events')
      .select('*')
      .eq('is_current', true)
      .single();

    if (ev) {
      const eventData = ev as EventRecord;
      setEvent(eventData);
      prevTeamCountRef.current = eventData.active_team_count;
      await refreshTeams(eventData.id);
    }
  }, [supabase, refreshTeams]);

  useEffect(() => {
    if (!event?.id) return;

    const channel = supabase
      .channel(`event-live-${event.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${event.id}` },
        (payload) => {
          const nextEvent = payload.new as EventRecord;
          setEvent(nextEvent);

          // Fallback sync if active team count changed (covers RLS-filtered archive/unarchive)
          if (
            prevTeamCountRef.current !== null &&
            prevTeamCountRef.current !== nextEvent.active_team_count
          ) {
            void refreshTeams(nextEvent.id);
          }
          prevTeamCountRef.current = nextEvent.active_team_count;
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `event_id=eq.${event.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const added = payload.new as TeamRecord;
            if (!added.is_active) return;
            setTeams((prev) => (prev.some((t) => t.id === added.id) ? prev : [...prev, added]));
            highlightTeam(added.id);
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as TeamRecord;
            if (!updated.is_active) {
              setTeams((prev) => prev.filter((t) => t.id !== updated.id));
            } else {
              setTeams((prev) => {
                const exists = prev.some((t) => t.id === updated.id);
                if (exists) {
                  return prev.map((t) => (t.id === updated.id ? updated : t));
                }
                // Team was unarchived — add it back in chronological order
                highlightTeam(updated.id);
                return [...prev, updated].sort(
                  (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const removedId = (payload.old as { id: string }).id;
            setTeams((prev) => prev.filter((t) => t.id !== removedId));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          refreshAuthoritativeState();
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('reconnecting');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event?.id, supabase, refreshAuthoritativeState, refreshTeams, highlightTeam]);

  return { event, teams, recentTeamIds, connectionStatus };
}