import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { authorized: false as const, status: 401, user: null };

  const { data: adminRecord } = await supabase
    .from('admin_users')
    .select('user_id, email, display_name')
    .eq('user_id', user.id)
    .single();

  if (!adminRecord) return { authorized: false as const, status: 403, user: null };

  return { authorized: true as const, status: 200, user, admin: adminRecord };
}