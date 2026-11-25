import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const STAGE_ORDER = [
  'locked',
  'intro',
  'third_place',
  'second_place',
  'first_place',
  'finished',
] as const;

const revealSchema = z.object({
  eventId: z.string().uuid(),
  nextStage: z.enum(['intro', 'third_place', 'second_place', 'first_place', 'finished']),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  }

  const parsed = revealSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid reveal stage.' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: event } = await adminClient
    .from('events')
    .select('*')
    .eq('id', parsed.data.eventId)
    .single();

  if (!event || !['voting_completed', 'revealing'].includes(event.status)) {
    return NextResponse.json(
      { error: 'Voting must be closed before revealing results.' },
      { status: 400 }
    );
  }

  const currentIdx = STAGE_ORDER.indexOf(event.reveal_stage);
  const nextIdx = STAGE_ORDER.indexOf(parsed.data.nextStage);

  if (nextIdx !== currentIdx + 1) {
    return NextResponse.json(
      { error: `Invalid stage transition from ${event.reveal_stage} to ${parsed.data.nextStage}.` },
      { status: 409 }
    );
  }

  // Final stage: compute rankings, persist immutable archive snapshot, mark completed
  if (parsed.data.nextStage === 'finished') {
    const supabase = await createServerSupabaseClient();
    const { data: snapshot, error: snapErr } = await supabase.rpc('finalize_and_archive_event', {
      p_event_id: event.id,
    });

    if (snapErr || !snapshot) {
      return NextResponse.json(
        { error: snapErr?.message || 'Failed to finalize and archive results.' },
        { status: 500 }
      );
    }

    await adminClient.from('admin_activity_logs').insert({
      admin_user_id: auth.user.id,
      event_id: event.id,
      action: 'RESULTS_ARCHIVED',
      entity_type: 'results_snapshot',
      entity_id: snapshot.id,
    });

    return NextResponse.json({ stage: 'finished', snapshot });
  }

  // Advance synchronized reveal stage
  const { data: updatedEvent, error: updateErr } = await adminClient
    .from('events')
    .update({
      status: 'revealing',
      reveal_stage: parsed.data.nextStage,
      reveal_started_at: event.reveal_started_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', event.id)
    .eq('reveal_stage', event.reveal_stage)
    .in('status', ['voting_completed', 'revealing'])
    .select('id')
    .maybeSingle();

  if (updateErr || !updatedEvent) {
    if (!updateErr) {
      return NextResponse.json({ error: 'Reveal stage changed. Refresh and try again.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to advance reveal stage.' }, { status: 500 });
  }

  await adminClient.from('admin_activity_logs').insert({
    admin_user_id: auth.user.id,
    event_id: event.id,
    action: `REVEAL_STAGE_${parsed.data.nextStage.toUpperCase()}`,
    entity_type: 'event',
    entity_id: event.id,
  });

  return NextResponse.json({ stage: parsed.data.nextStage });
}