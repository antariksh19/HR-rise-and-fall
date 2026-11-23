import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const voteSchema = z.object({
  targetTeamId: z.string().uuid(),
});

export async function POST(req: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const parsed = voteSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid team selection.' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc('cast_vote', {
    p_target_team_id: parsed.data.targetTeamId,
  });

  if (error) {
    const msg = error.message;
    if (msg.includes('unique_voter_per_event')) {
      return NextResponse.json({ error: 'Your team has already cast its vote.' }, { status: 409 });
    }
    if (msg.includes('SELF_VOTE_FORBIDDEN')) {
      return NextResponse.json({ error: 'A team cannot vote for itself.' }, { status: 400 });
    }
    if (msg.includes('VOTING_NOT_LIVE')) {
      return NextResponse.json({ error: 'Voting is not currently live.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unable to record vote. Please try again.' }, { status: 400 });
  }

  return NextResponse.json(data, { status: 200 });
}