-- Audience ballots replace team-authenticated ballots. This migration is safe to re-run.

alter table public.teams drop constraint if exists teams_auth_user_id_fkey;
alter table public.teams drop constraint if exists teams_auth_user_id_key;
drop policy if exists "Public read active teams" on public.teams;
alter table public.teams drop column if exists auth_user_id;
alter table public.teams drop column if exists has_voted;

alter table public.votes alter column voter_team_id drop not null;
alter table public.votes
  add column if not exists voter_type text not null default 'team',
  add column if not exists voter_name text,
  add column if not exists voter_contact_hash text,
  add column if not exists device_id text,
  add column if not exists device_fingerprint_hash text,
  add column if not exists cross_browser_hash text;

update public.votes
set voter_type = case when voter_team_id is null then 'audience' else 'team' end
where voter_type is null
   or (voter_type = 'team' and voter_team_id is null);

alter table public.votes alter column voter_type set default 'audience';
alter table public.votes drop constraint if exists unique_voter_per_event;
alter table public.votes drop constraint if exists prevent_self_vote;
alter table public.votes drop constraint if exists votes_voter_type_check;
alter table public.votes drop constraint if exists votes_audience_identity_check;
alter table public.votes
  add constraint votes_voter_type_check check (voter_type in ('audience', 'team')),
  add constraint votes_audience_identity_check check (
    voter_type <> 'audience'
    or (
      voter_team_id is null
      and voter_name is not null
      and char_length(btrim(voter_name)) >= 2
      and voter_contact_hash is not null
      and device_id is not null
      and device_fingerprint_hash is not null
    )
  ),
  add constraint votes_no_self_vote check (
    voter_team_id is null or voter_team_id <> target_team_id
  );

create unique index if not exists idx_votes_team_voter_valid
  on public.votes (event_id, voter_team_id)
  where voter_team_id is not null and status = 'valid';
create unique index if not exists idx_votes_device_valid
  on public.votes (event_id, device_id)
  where device_id is not null and status = 'valid';
create unique index if not exists idx_votes_fingerprint_valid
  on public.votes (event_id, device_fingerprint_hash)
  where device_fingerprint_hash is not null and status = 'valid';
create unique index if not exists idx_votes_cross_browser_valid
  on public.votes (event_id, cross_browser_hash)
  where cross_browser_hash is not null and status = 'valid';
create unique index if not exists idx_votes_contact_valid
  on public.votes (event_id, voter_contact_hash)
  where voter_contact_hash is not null and status = 'valid';

alter table public.events drop constraint if exists events_active_team_count_check;
alter table public.events drop constraint if exists events_valid_vote_count_check;
alter table public.events
  add constraint events_active_team_count_check check (active_team_count >= 0),
  add constraint events_valid_vote_count_check check (valid_vote_count >= 0);

create or replace function public.sync_event_metrics(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_active_teams integer;
  v_valid_votes integer;
begin
  perform 1 from public.events where id = p_event_id for update;
  if not found then
    return;
  end if;

  select count(*) into v_active_teams
  from public.teams
  where event_id = p_event_id and is_active = true;

  -- Audience ballots have no voter_team_id; count every valid ballot directly.
  select count(*) into v_valid_votes
  from public.votes
  where event_id = p_event_id
    and status = 'valid'
    and voter_type = 'audience';

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
set search_path = public, pg_temp
as $$
declare
  v_event_id uuid;
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;

  v_event_id := case when tg_op = 'DELETE' then old.event_id else new.event_id end;

  -- Legacy team ballots are invalidated when their team is archived.
  if tg_op = 'UPDATE' and old.is_active and not new.is_active then
    update public.votes
    set status = 'invalidated'
    where event_id = new.event_id
      and voter_team_id = new.id
      and status = 'valid';
  end if;

  perform public.sync_event_metrics(v_event_id);
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists after_team_change on public.teams;
create trigger after_team_change
after insert or update of is_active or delete on public.teams
for each row execute function public.trg_sync_metrics_on_team_change();

create or replace function public.trg_sync_metrics_on_vote_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_delta integer;
begin
  if tg_op = 'DELETE' then
    if pg_trigger_depth() > 1 then
      return old;
    end if;
    if old.status = 'valid' and old.voter_type = 'audience' then
      update public.events
      set valid_vote_count = greatest(valid_vote_count - 1, 0), updated_at = now()
      where id = old.event_id;
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.status = 'valid' and new.voter_type = 'audience' then
      update public.events
      set valid_vote_count = valid_vote_count + 1, updated_at = now()
      where id = new.event_id;
    end if;
    return new;
  end if;

  if old.event_id is distinct from new.event_id then
    if old.status = 'valid' and old.voter_type = 'audience' then
      update public.events
      set valid_vote_count = greatest(valid_vote_count - 1, 0), updated_at = now()
      where id = old.event_id;
    end if;
    if new.status = 'valid' and new.voter_type = 'audience' then
      update public.events
      set valid_vote_count = valid_vote_count + 1, updated_at = now()
      where id = new.event_id;
    end if;
    return new;
  end if;

  v_delta := (
    case when new.status = 'valid' and new.voter_type = 'audience' then 1 else 0 end
  ) - (
    case when old.status = 'valid' and old.voter_type = 'audience' then 1 else 0 end
  );
  if v_delta <> 0 then
    update public.events
    set valid_vote_count = greatest(valid_vote_count + v_delta, 0), updated_at = now()
    where id = new.event_id;
  end if;
  return new;
end;
$$;

drop trigger if exists after_vote_change on public.votes;
create trigger after_vote_change
after insert or update or delete on public.votes
for each row execute function public.trg_sync_metrics_on_vote_change();

create or replace function public.validate_audience_vote()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status public.event_status;
begin
  if new.voter_type <> 'audience' or new.voter_team_id is not null then
    raise exception 'AUDIENCE_VOTING_ONLY';
  end if;

  select status into v_status
  from public.events
  where id = new.event_id
  for update;
  if not found or v_status <> 'voting_live' then
    raise exception 'VOTING_NOT_LIVE';
  end if;

  if not exists (
    select 1
    from public.teams
    where id = new.target_team_id
      and event_id = new.event_id
      and is_active = true
  ) then
    raise exception 'INVALID_TARGET_TEAM';
  end if;

  new.voter_name := btrim(new.voter_name);
  return new;
end;
$$;

drop trigger if exists before_audience_vote_insert on public.votes;
create trigger before_audience_vote_insert
before insert on public.votes
for each row execute function public.validate_audience_vote();

drop function if exists public.cast_vote(uuid);

create or replace function public.compute_event_rankings(p_event_id uuid)
returns jsonb
language sql
security definer
stable
set search_path = public, pg_temp
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
      and v.voter_type = 'audience'
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
set search_path = public, pg_temp
as $$
declare
  v_event public.events%rowtype;
  v_rankings jsonb;
  v_top_three jsonb;
  v_completion numeric(5,2);
  v_valid_vote_count integer;
  v_snapshot public.results_snapshots%rowtype;
begin
  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;

  if v_event.status <> 'revealing' or v_event.reveal_stage <> 'first_place' then
    raise exception 'REVEAL_NOT_READY_TO_FINISH';
  end if;

  if exists (select 1 from public.results_snapshots where event_id = p_event_id) then
    select * into v_snapshot from public.results_snapshots where event_id = p_event_id;
    return v_snapshot;
  end if;

  select count(*)::integer into v_valid_vote_count
  from public.votes
  where event_id = p_event_id
    and status = 'valid'
    and voter_type = 'audience';

  v_rankings := public.compute_event_rankings(p_event_id);
  select coalesce(jsonb_agg(elem), '[]'::jsonb)
  into v_top_three
  from jsonb_array_elements(v_rankings) as elem
  where (elem->>'rank')::integer <= 3;

  v_completion := case
    when v_event.active_team_count = 0 then 0
    else least(
      100,
      greatest(
        0,
        round((v_valid_vote_count::numeric / v_event.active_team_count::numeric) * 100, 2)
      )
    )
  end;

  insert into public.results_snapshots (
    event_id, event_name, event_date, final_rankings, top_three,
    valid_vote_count, participating_team_count, voting_completion_percentage, completed_at
  )
  values (
    v_event.id, v_event.name, v_event.event_date, v_rankings, v_top_three,
    v_valid_vote_count, v_event.active_team_count, v_completion, now()
  )
  returning * into v_snapshot;

  update public.events
  set status = 'completed',
      reveal_stage = 'finished',
      valid_vote_count = v_valid_vote_count,
      reveal_completed_at = now(),
      completed_at = now(),
      updated_at = now()
  where id = p_event_id;

  return v_snapshot;
end;
$$;

create or replace function public.reset_event_voting(p_event_id uuid)
returns public.events
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event public.events%rowtype;
  v_previous_status public.event_status;
  v_previous_vote_count integer;
begin
  if not public.is_admin() then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select * into v_event from public.events where id = p_event_id for update;
  if not found then
    raise exception 'EVENT_NOT_FOUND';
  end if;
  v_previous_status := v_event.status;
  v_previous_vote_count := v_event.valid_vote_count;

  delete from public.votes where event_id = p_event_id;
  delete from public.results_snapshots where event_id = p_event_id;

  update public.events
  set status = 'not_started',
      reveal_stage = 'locked',
      valid_vote_count = 0,
      voting_started_at = null,
      voting_closed_at = null,
      reveal_started_at = null,
      reveal_completed_at = null,
      completed_at = null,
      updated_at = now()
  where id = p_event_id
  returning * into v_event;

  insert into public.admin_activity_logs (
    admin_user_id, event_id, action, entity_type, entity_id, details
  )
  values (
    auth.uid(),
    p_event_id,
    'EVENT_RESET',
    'event',
    p_event_id,
    jsonb_build_object(
      'previous_status', v_previous_status,
      'cleared_votes', v_previous_vote_count
    )
  );

  return v_event;
end;
$$;

-- A definer RPC must not be callable by public roles. The application uses its
-- service-role client for private previews; the admin-only finalizer checks RBAC.
revoke all on function public.sync_event_metrics(uuid) from public, anon, authenticated;
revoke all on function public.trg_sync_metrics_on_team_change() from public, anon, authenticated;
revoke all on function public.trg_sync_metrics_on_vote_change() from public, anon, authenticated;
revoke all on function public.validate_audience_vote() from public, anon, authenticated;
revoke all on function public.compute_event_rankings(uuid) from public, anon, authenticated;
grant execute on function public.sync_event_metrics(uuid) to service_role;
grant execute on function public.compute_event_rankings(uuid) to service_role;
revoke all on function public.finalize_and_archive_event(uuid) from public, anon;
grant execute on function public.finalize_and_archive_event(uuid) to authenticated, service_role;
revoke all on function public.reset_event_voting(uuid) from public, anon;
grant execute on function public.reset_event_voting(uuid) to authenticated, service_role;

-- Keep public roster reads limited to non-sensitive columns.
create policy "Public read active teams" on public.teams
  for select using (is_active = true or public.is_admin());

revoke select on public.teams from anon, authenticated;
grant select (id, event_id, team_name, team_code, is_active, created_at, updated_at)
  on public.teams to anon, authenticated;

-- Reconcile historical event counters to the new audience ballot definition.
do $$
declare
  event_row record;
begin
  for event_row in select id from public.events loop
    perform public.sync_event_metrics(event_row.id);
  end loop;
end;
$$;
