import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ adminId: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  }

  const { adminId } = await context.params;

  if (adminId === auth.user.id) {
    return NextResponse.json(
      { error: 'You cannot revoke your own admin access.' },
      { status: 400 }
    );
  }

  const adminClient = createAdminClient();
  const { data: target } = await adminClient
    .from('admin_users')
    .select('user_id, email')
    .eq('user_id', adminId)
    .single();

  if (!target) {
    return NextResponse.json({ error: 'Admin not found.' }, { status: 404 });
  }

  const { error } = await adminClient
    .from('admin_users')
    .delete()
    .eq('user_id', adminId);

  if (error) {
    return NextResponse.json({ error: 'Failed to revoke admin access.' }, { status: 500 });
  }

  const { data: currentEvent } = await adminClient
    .from('events')
    .select('id')
    .eq('is_current', true)
    .maybeSingle();

  if (currentEvent) {
    await adminClient.from('admin_activity_logs').insert({
      admin_user_id: auth.user.id,
      event_id: currentEvent.id,
      action: 'ADMIN_REMOVED',
      entity_type: 'admin',
      entity_id: target.user_id,
      details: { email: target.email },
    });
  }

  return NextResponse.json({ removed: true, adminId });
}