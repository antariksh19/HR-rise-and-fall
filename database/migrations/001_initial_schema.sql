-- Enable extensions
create extension if not exists "pgcrypto";

-- Enums
create type event_status as enum (
  'not_started',
  'voting_live',
  'voting_completed',
  'revealing',
  'completed'
);

create type reveal_stage as enum (
  'locked',
  'intro',
  'third_place',
  'second_place',
  'first_place',
  'finished'
);

create type vote_status as enum ('valid', 'invalidated');

-- 1. ADMIN USERS (Database-backed RBAC; seeded manually, no public signup)
create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  created_at timestamptz not null default now()
);

-- Helper function for RLS
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

-- 2. EVENTS (Single source of truth for event state & safe public progress metrics)
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date not null default current_date,
  is_current boolean not null default false,
  status event_status not null default 'not_started',
  reveal_stage reveal_stage not null default 'locked',
  active_team_count integer not null default 0,
  valid_vote_count integer not null default 0,
  voting_started_at timestamptz,
  voting_closed_at timestamptz,
  reveal_started_at timestamptz,
  reveal_completed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure only one active current event at a time
create unique index idx_events_single_current on public.events (is_current) where (is_current = true);

-- 3. TEAMS
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  team_name text not null,
  team_code text not null unique,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  is_active boolean not null default true,
  has_voted boolean not null default false, -- Only readable by the team itself & admins via RLS/API
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index idx_teams_event_active on public.teams (event_id, is_active);

-- 4. VOTES
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  voter_team_id uuid not null references public.teams(id) on delete restrict,
  target_team_id uuid not null references public.teams(id) on delete restrict,
  status vote_status not null default 'valid',
  created_at timestamptz not null default now(),
  constraint unique_voter_per_event unique (event_id, voter_team_id),
  constraint prevent_self_vote check (voter_team_id <> target_team_id)
);

create index idx_votes_event_status on public.votes (event_id, status);

-- 5. IMMUTABLE RESULTS SNAPSHOTS
create table public.results_snapshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events(id) on delete restrict,
  event_name text not null,
  event_date date not null,
  final_rankings jsonb not null,          -- Array of { rank, team_id, team_name, team_code, votes, is_tied }
  top_three jsonb not null,               -- Includes all teams tied at rank <= 3
  valid_vote_count integer not null,
  participating_team_count integer not null,
  voting_completion_percentage numeric(5,2) not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- 6. ADMIN ACTIVITY LOGS
create table public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.admin_users(user_id) on delete restrict,
  event_id uuid references public.events(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ==========================================
-- METRICS SYNCHRONIZATION TRIGGER
-- ==========================================
create or replace function public.sync_event_metrics(p_event_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_active_teams integer;
  v_valid_votes integer;
begin
  select count(*) into v_active_teams
  from public.teams
  where event_id = p_event_id and is_active = true;

  select count(*) into v_valid_votes
  from public.votes v
  join public.teams vt on vt.id = v.voter_team_id
  where v.event_id = p_event_id
    and v.status = 'valid'
    and vt.is_active = true;

  update public.events
  set active_team_count = v_active_teams,
      valid_vote_count = v_valid_votes,
      updated_at = now()
  where id = p_event_id;
end;
$$;

create or replace function public.trg_sync_metrics_on_team_change()
returns trigger
language plpgsql
security definer
as $$
begin
  -- If a team is archived, invalidate any vote it cast while preserving audit history
  if (tg_op = 'UPDATE' and old.is_active = true and new.is_active = false) then
    update public.votes
    set status = 'invalidated'
    where event_id = new.event_id and voter_team_id = new.id;
  end if;

  perform public.sync_event_metrics(coalesce(new.event_id, old.event_id));
  return coalesce(new, old);
end;
$$;

create trigger after_team_change
after insert or update of is_active or delete on public.teams
for each row execute function public.trg_sync_metrics_on_team_change();

-- ==========================================
-- ATOMIC RPC: CAST VOTE
-- ==========================================
create or replace function public.cast_vote(p_target_team_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_voter_team public.teams%rowtype;
  v_target_team public.teams%rowtype;
  v_event public.events%rowtype;
  v_new_vote_count integer;
begin
  -- 1. Identify voter strictly from auth.uid()
  select * into v_voter_team
  from public.teams
  where auth_user_id = auth.uid() and is_active = true
  limit 1;

  if not found then
    raise exception 'UNAUTHORIZED_OR_INACTIVE_TEAM';
  end if;

  -- 2. Lock the event row to prevent race conditions and verify status
  select * into v_event
  from public.events
  where id = v_voter_team.event_id
  for update;

  if v_event.status <> 'voting_live' then
    raise exception 'VOTING_NOT_LIVE';
  end if;

  -- 3. Prevent self-voting
  if v_voter_team.id = p_target_team_id then
    raise exception 'SELF_VOTE_FORBIDDEN';
  end if;

  -- 4. Verify target team is active in the same event
  select * into v_target_team
  from public.teams
  where id = p_target_team_id
    and event_id = v_voter_team.event_id
    and is_active = true;

  if not found then
    raise exception 'INVALID_TARGET_TEAM';
  end if;

  -- 5. Insert vote (unique constraint guarantees single vote per event)
  insert into public.votes (event_id, voter_team_id, target_team_id, status)
  values (v_voter_team.event_id, v_voter_team.id, v_target_team.id, 'valid');

  update public.teams
  set has_voted = true, updated_at = now()
  where id = v_voter_team.id;

  -- 6. Recalculate safe public metrics
  perform public.sync_event_metrics(v_voter_team.event_id);

  -- 7. Auto-close voting if all active eligible teams have voted
  select valid_vote_count into v_new_vote_count
  from public.events where id = v_voter_team.event_id;

  if v_new_vote_count >= v_event.active_team_count and v_event.active_team_count > 0 then
    update public.events
    set status = 'voting_completed',
        voting_closed_at = now(),
        updated_at = now()
    where id = v_voter_team.event_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'voter_team_id', v_voter_team.id,
    'auto_closed', (v_new_vote_count >= v_event.active_team_count)
  );
end;
$$;

-- ==========================================
-- ATOMIC RPC: COMPUTE & ARCHIVE FINAL RESULTS
-- ==========================================
create or replace function public.compute_event_rankings(p_event_id uuid)
returns jsonb
language sql
security definer
stable
as $$
  with vote_counts as (
    select
      t.id as team_id,
      t.team_name,
      t.team_code,
      count(v.id)::integer as votes
    from public.teams t
    left join public.votes v
      on v.target_team_id = t.id
      and v.event_id = p_event_id
      and v.status = 'valid'
    where t.event_id = p_event_id
      and t.is_active = true
    group by t.id, t.team_name, t.team_code
  ),
  ranked as (
    select
      team_id,
      team_name,
      team_code,
      votes,
      dense_rank() over (order by votes desc) as rank,
      count(*) over (partition by votes) > 1 as is_tied
    from vote_counts
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'rank', rank,
        'team_id', team_id,
        'team_name', team_name,
        'team_code', team_code,
        'votes', votes,
        'is_tied', is_tied
      )
      order by rank asc, team_name asc
    ),
    '[]'::jsonb
  )
  from ranked;
$$;

create or replace function public.finalize_and_archive_event(p_event_id uuid)
returns public.results_snapshots
language plpgsql
security definer
as $$
declare
  v_event public.events%rowtype;
  v_rankings jsonb;
  v_top_three jsonb;
  v_completion numeric(5,2);
  v_snapshot public.results_snapshots%rowtype;
begin
  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  -- Prevent overwriting an already archived snapshot
  if exists (select 1 from public.results_snapshots where event_id = p_event_id) then
    select * into v_snapshot from public.results_snapshots where event_id = p_event_id;
    return v_snapshot;
  end if;

  v_rankings := public.compute_event_rankings(p_event_id);

  select coalesce(jsonb_agg(elem), '[]'::jsonb)
  into v_top_three
  from jsonb_array_elements(v_rankings) as elem
  where (elem->>'rank')::integer <= 3;

  v_completion := case
    when v_event.active_team_count = 0 then 0
    else round((v_event.valid_vote_count::numeric / v_event.active_team_count::numeric) * 100, 2)
  end;

  insert into public.results_snapshots (
    event_id, event_name, event_date, final_rankings, top_three,
    valid_vote_count, participating_team_count, voting_completion_percentage, completed_at
  )
  values (
    v_event.id, v_event.name, v_event.event_date, v_rankings, v_top_three,
    v_event.valid_vote_count, v_event.active_team_count, v_completion, now()
  )
  returning * into v_snapshot;

  update public.events
  set status = 'completed',
      reveal_stage = 'finished',
      reveal_completed_at = now(),
      completed_at = now(),
      updated_at = now()
  where id = p_event_id;

  return v_snapshot;
end;
$$;

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================
alter table public.events enable row level security;
alter table public.teams enable row level security;
alter table public.votes enable row level security;
alter table public.results_snapshots enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_activity_logs enable row level security;

-- Events: Public read, Admin write
create policy "Public read events" on public.events for select using (true);
create policy "Admin manage events" on public.events for all using (public.is_admin());

-- Teams: Public can see active teams (Note: use column-level security or public view to hide has_voted!)
create policy "Public read active teams" on public.teams
  for select using (is_active = true or auth_user_id = auth.uid() or public.is_admin());
create policy "Admin manage teams" on public.teams for all using (public.is_admin());

-- Column-level security so public anon users cannot read `has_voted` or `auth_user_id`
revoke select on public.teams from anon, authenticated;
grant select (id, event_id, team_name, team_code, is_active, created_at, updated_at) on public.teams to anon, authenticated;

-- Votes: STRICTLY ADMIN ONLY (Teams submit via cast_vote RPC)
create policy "Admin read votes" on public.votes for select using (public.is_admin());

-- Results Snapshots: Public read (immutable archive), no direct client writes
create policy "Public read snapshots" on public.results_snapshots for select using (true);

-- Admin tables: Admin only
create policy "Admin read self" on public.admin_users for select using (user_id = auth.uid());
create policy "Admin read logs" on public.admin_activity_logs for select using (public.is_admin());
create policy "Admin insert logs" on public.admin_activity_logs for insert with check (public.is_admin());

-- Enable Supabase Realtime ONLY on safe tables (NEVER add public.votes!)
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.results_snapshots;