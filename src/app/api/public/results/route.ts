import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { RankedTeam } from '@/types/database';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('eventId');

  const adminClient = createAdminClient();

  const eventQuery = eventId
    ? adminClient.from('events').select('*').eq('id', eventId).single()
    : adminClient.from('events').select('*').eq('is_current', true).single();

  const { data: event } = await eventQuery;
  if (!event) {
    return NextResponse.json({ revealed: [], stage: 'locked' });
  }

  // Never expose rankings while voting is not started, live, locked, or in intro
  if (
    !['revealing', 'completed'].includes(event.status) ||
    ['locked', 'intro'].includes(event.reveal_stage)
  ) {
    return NextResponse.json({ revealed: [], stage: event.reveal_stage });
  }

  let rankings: RankedTeam[] = [];

  if (event.status === 'completed') {
    const { data: snap } = await adminClient
      .from('results_snapshots')
      .select('top_three')
      .eq('event_id', event.id)
      .single();
    rankings = (snap?.top_three ?? []) as RankedTeam[];
  } else {
    const { data: computed } = await adminClient.rpc('compute_event_rankings', {
      p_event_id: event.id,
    });
    rankings = ((computed ?? []) as RankedTeam[]).filter((t) => t.rank <= 3);
  }

  // Filter strictly to the currently unlocked reveal stage
  let revealed: RankedTeam[] = [];
  if (event.reveal_stage === 'third_place') {
    revealed = rankings.filter((t) => t.rank === 3);
  } else if (event.reveal_stage === 'second_place') {
    revealed = rankings.filter((t) => t.rank === 2 || t.rank === 3);
  } else if (event.reveal_stage === 'first_place' || event.reveal_stage === 'finished') {
    revealed = rankings.filter((t) => t.rank <= 3);
  }

  return NextResponse.json({
    revealed,
    stage: event.reveal_stage,
    status: event.status,
  });
}