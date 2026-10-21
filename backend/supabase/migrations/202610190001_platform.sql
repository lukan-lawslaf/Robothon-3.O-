-- Run once in the Supabase SQL editor, or apply through the Supabase CLI.
begin;

create table public.teams (
  id text primary key,
  team_name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('TEAM_LEADER', 'TEAM_MEMBER', 'ADMIN', 'SUPER_ADMIN')),
  team_id text references public.teams(id),
  eligible boolean not null default true,
  disabled boolean not null default false,
  created_at timestamptz not null default now(),
  constraint participant_team_required check (
    (role in ('TEAM_LEADER', 'TEAM_MEMBER') and team_id is not null)
    or (role in ('ADMIN', 'SUPER_ADMIN') and team_id is null)
  )
);
create unique index one_leader_per_team on public.profiles(team_id) where role = 'TEAM_LEADER';

-- Durable competition data is private. JSONB preserves the existing quiz engine's
-- state machine, audit events and checkpoint definitions in one atomic transaction.
create table public.competition_state (
  id text primary key check (id = 'main'),
  revision bigint not null default 0,
  state jsonb not null check (jsonb_typeof(state) = 'object'),
  updated_at timestamptz not null default now()
);

-- Supabase access JWTs can outlive sign-out; this denylist revokes API access immediately.
create table public.revoked_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  revoked_at timestamptz not null default now()
);

alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.competition_state enable row level security;
alter table public.revoked_sessions enable row level security;
revoke all on public.teams, public.profiles, public.competition_state, public.revoked_sessions from anon, authenticated;
grant select on public.profiles, public.teams to authenticated;
grant all on public.teams, public.profiles, public.competition_state, public.revoked_sessions to service_role;

create policy own_profile on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy own_team on public.teams for select to authenticated using (
  id in (select team_id from public.profiles where id = (select auth.uid()))
);
-- No browser insert/update/delete policy exists. In particular, users cannot edit roles.

create function public.initialize_competition(initial_state jsonb) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.competition_state(id, state) values ('main', initial_state)
  on conflict (id) do nothing;
end;
$$;

create function public.commit_competition(expected_revision bigint, next_state jsonb) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare new_revision bigint;
begin
  if jsonb_typeof(next_state->'quizzes') is distinct from 'array'
    or jsonb_typeof(next_state->'questions') is distinct from 'array'
    or jsonb_typeof(next_state->'attempts') is distinct from 'array'
    or jsonb_typeof(next_state->'answers') is distinct from 'array'
    or jsonb_typeof(next_state->'events') is distinct from 'array' then
    raise exception 'Invalid competition state' using errcode = '22023';
  end if;
  update public.competition_state set state = next_state, revision = revision + 1, updated_at = now()
  where id = 'main' and revision = expected_revision returning revision into new_revision;
  if not found then
    raise exception 'Concurrent competition update; retry' using errcode = '40001';
  end if;
  return new_revision;
end;
$$;
revoke all on function public.initialize_competition(jsonb), public.commit_competition(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.initialize_competition(jsonb), public.commit_competition(bigint, jsonb) to service_role;

-- Read-only reporting views for the SQL editor; answer keys remain service-role only.
create view public.quiz_catalog with (security_invoker = true) as
select q->>'id' as id, q->>'name' as name, q->>'status' as status, q as details
from public.competition_state, lateral jsonb_array_elements(state->'quizzes') q;
create view public.quiz_questions with (security_invoker = true) as
select q->>'id' as id, q->>'quizId' as quiz_id, q as details
from public.competition_state, lateral jsonb_array_elements(state->'questions') q;
create view public.quiz_attempts with (security_invoker = true) as
select a->>'id' as id, a->>'quizId' as quiz_id, a->>'teamId' as team_id, a->>'status' as status, a as details
from public.competition_state, lateral jsonb_array_elements(state->'attempts') a;
create view public.quiz_answers with (security_invoker = true) as
select a->>'id' as id, a->>'attemptId' as attempt_id, a as details
from public.competition_state, lateral jsonb_array_elements(state->'answers') a;
create view public.checkpoint_reviews with (security_invoker = true) as
select t->>'ticketId' as id, t->>'teamId' as team_id, t->>'status' as status, t as details
from public.competition_state, lateral jsonb_array_elements(state->'platform'->'tickets') t;
create view public.team_checkpoints with (security_invoker = true) as
select team.key as team_id, cp->>'id' as checkpoint_id, cp->>'status' as status, cp as details
from public.competition_state, lateral jsonb_each(state->'platform'->'checkpoints') team, lateral jsonb_array_elements(team.value) cp;
create view public.bonus_awards with (security_invoker = true) as
select b->>'id' as id, b->>'teamId' as team_id, b as details
from public.competition_state, lateral jsonb_array_elements(state->'platform'->'bonuses') b;
create view public.quiz_events with (security_invoker = true) as
select e->>'quizId' as quiz_id, e->>'eventType' as event_type, e as details
from public.competition_state, lateral jsonb_array_elements(state->'events') e;
revoke all on public.quiz_catalog, public.quiz_questions, public.quiz_attempts, public.quiz_answers,
  public.checkpoint_reviews, public.team_checkpoints, public.bonus_awards, public.quiz_events from anon, authenticated;
grant select on public.quiz_catalog, public.quiz_questions, public.quiz_attempts, public.quiz_answers,
  public.checkpoint_reviews, public.team_checkpoints, public.bonus_awards, public.quiz_events to service_role;
commit;
