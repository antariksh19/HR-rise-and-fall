import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/admin';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateSecurePassword } from '@/lib/auth/credentials';

const createAdminSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
  displayName: z.string().trim().max(80).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters.').optional(),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Forbidden' }, { status: auth.status });
  }

  const parsed = createAdminSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid input.' },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const displayName =
    parsed.data.displayName?.trim() || email.split('@')[0];
  const password = parsed.data.password || generateSecurePassword(12);
  const adminClient = createAdminClient();

  // Check if already an admin
  const { data: existingAdmin } = await adminClient
    .from('admin_users')
    .select('user_id, email')
    .eq('email', email)
    .maybeSingle();

  if (existingAdmin) {
    return NextResponse.json(
      { error: 'This email already has admin access.' },
      { status: 409 }
    );
  }

  let targetUserId: string | null = null;
  let createdNewAuthUser = false;

  // Attempt to create Supabase Auth account
  const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authData?.user) {
    targetUserId = authData.user.id;
    createdNewAuthUser = true;
  } else {
    // If the user already exists in Auth, locate them and update their password if provided
    const { data: usersList } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const existingAuthUser = usersList?.users.find(
      (u) => u.email?.toLowerCase() === email
    );

    if (!existingAuthUser) {
      return NextResponse.json(
        { error: authErr?.message || 'Failed to create admin account.' },
        { status: 500 }
      );
    }

    targetUserId = existingAuthUser.id;
    if (parsed.data.password) {
      await adminClient.auth.admin.updateUserById(targetUserId, { password });
    }
  }

  // Insert into public.admin_users
  const { data: addedAdmin, error: insertErr } = await adminClient
    .from('admin_users')
    .insert({
      user_id: targetUserId,
      email,
      display_name: displayName,
    })
    .select('user_id, email, display_name, created_at')
    .single();

  if (insertErr || !addedAdmin) {
    return NextResponse.json(
      { error: insertErr?.message || 'Failed to grant admin access.' },
      { status: 500 }
    );
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
      action: 'ADMIN_ADDED',
      entity_type: 'admin',
      entity_id: addedAdmin.user_id,
      details: { email, display_name: displayName },
    });
  }

  return NextResponse.json(
    {
      admin: addedAdmin,
      credentials: createdNewAuthUser || parsed.data.password ? { email, password } : null,
    },
    { status: 201 }
  );
}