import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const eventActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start_voting'), eventId: z.string().uuid() }),
  z.object({ action: z.literal('close_voting'), eventId: z.string().uuid() }),
  z.object({ action: z.literal('reset_voting'), eventId: z.string().uuid() }),
]);

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  }

  const parsed = eventActionSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  if (parsed.data.action === 'start_voting') {
    const { data: ev } = await adminClient
      .from('events')
      .select('id, active_team_count, status')
      .eq('id', parsed.data.eventId)
      .single();

    if (!ev || ev.status !== 'not_started') {
      return NextResponse.json(
        { error: 'Voting can only be started from Not Started state.' },
        { status: 400 }
      );
    }
    if (ev.active_team_count < 2) {
      return NextResponse.json(
        { error: 'At least 2 active teams are required to start voting.' },
        { status: 400 }
      );
    }

    const { data: updated, error } = await adminClient
      .from('events')
      .update({
        status: 'voting_live',
        voting_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', ev.id)
      .eq('status', 'not_started')
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: 'Failed to start voting.' }, { status: 500 });

    await adminClient.from('admin_activity_logs').insert({
      admin_user_id: auth.user.id,
      event_id: ev.id,
      action: 'VOTING_STARTED',
      entity_type: 'event',
      entity_id: ev.id,
    });

    return NextResponse.json({ event: updated });
  }

  if (parsed.data.action === 'close_voting') {
    const { data: updated, error } = await adminClient
      .from('events')
      .update({
        status: 'voting_completed',
        voting_closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.eventId)
      .eq('status', 'voting_live')
      .select('*')
      .single();

    if (error || !updated) {
      return NextResponse.json({ error: 'Voting is not currently live.' }, { status: 400 });
    }

    await adminClient.from('admin_activity_logs').insert({
      admin_user_id: auth.user.id,
      event_id: updated.id,
      action: 'VOTING_CLOSED_MANUALLY',
      entity_type: 'event',
      entity_id: updated.id,
      details: {
        valid_vote_count: updated.valid_vote_count,
        active_team_count: updated.active_team_count,
      },
    });

    return NextResponse.json({ event: updated });
  }

  if (parsed.data.action === 'reset_voting') {
    const supabase = await createServerSupabaseClient();
    const { data: updated, error } = await supabase.rpc('reset_event_voting', {
      p_event_id: parsed.data.eventId,
    });

    if (error) {
      const status = error.message.includes('EVENT_NOT_FOUND') ? 404 : 500;
      return NextResponse.json(
        { error: status === 404 ? 'Event not found.' : 'Failed to reset event.' },
        { status }
      );
    }

    return NextResponse.json({ event: updated });
  }

  return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
}