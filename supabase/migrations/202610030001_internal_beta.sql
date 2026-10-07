-- FirstLane INTERNAL BETA only. Apply to a new Supabase development project.
-- No questions, answer keys, billing secrets or public purchase-mutation paths are created here.
begin;
create schema if not exists firstlane_private;
revoke all on schema firstlane_private from public, anon, authenticated;

create table public.beta_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check(char_length(display_name)<=40),
 preferences jsonb not null default '{}' check(jsonb_typeof(preferences)='object'),
 updated_at timestamptz not null default now()
);
create table public.beta_progress (
 user_id uuid primary key references auth.users(id) on delete cascade,
 snapshot jsonb not null default '{}' check(jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<=4000000),
 updated_at timestamptz not null default now()
);
comment on table public.beta_progress is 'Self-reported beta backup only; not a server grade, entitlement, readiness certification or multi-device merge log.';
create table public.beta_reports (
 id uuid primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 question_id text,
 message text not null check(char_length(message) between 10 and 2000),
 created_at timestamptz not null default now()
);
create index beta_reports_owner_idx on public.beta_reports(user_id,created_at desc);

alter table public.beta_profiles enable row level security;
alter table public.beta_progress enable row level security;
alter table public.beta_reports enable row level security;
revoke all on public.beta_profiles, public.beta_progress, public.beta_reports from anon, authenticated;
grant select,insert,update,delete on public.beta_profiles,public.beta_progress to authenticated;
grant select,insert on public.beta_reports to authenticated;
create policy own_profiles on public.beta_profiles for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy own_progress on public.beta_progress for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy own_reports_read on public.beta_reports for select to authenticated using((select auth.uid())=user_id);
create policy own_reports_insert on public.beta_reports for insert to authenticated with check((select auth.uid())=user_id);

-- Server-managed immutable purchase references. No client can create a grant.
create table firstlane_private.access_grants (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 pack_key text not null,
 provider text not null,
 provider_transaction_id text not null,
 starts_at timestamptz not null,
 expires_at timestamptz check(expires_at is null or expires_at>starts_at),
 revoked_at timestamptz,
 unique(provider,provider_transaction_id)
);
alter table firstlane_private.access_grants enable row level security;
revoke all on firstlane_private.access_grants from anon,authenticated;
create or replace function public.my_access_grants()
returns table(id uuid,pack_key text,starts_at timestamptz,expires_at timestamptz)
language sql stable security definer set search_path=''
as $$
 select g.id,g.pack_key,g.starts_at,g.expires_at
 from firstlane_private.access_grants g
 where g.user_id=(select auth.uid()) and g.revoked_at is null
 and g.starts_at<=now() and (g.expires_at is null or g.expires_at>now());
$$;
revoke all on function public.my_access_grants() from public,anon;
grant execute on function public.my_access_grants() to authenticated;

-- Private draft import destination, deliberately absent from exposed API schemas.
create table firstlane_private.question_revisions (
 revision_id uuid primary key,
 question_id uuid not null,
 pack_key text not null,
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 imported_at timestamptz not null default now()
);
alter table firstlane_private.question_revisions enable row level security;
revoke all on firstlane_private.question_revisions from anon,authenticated;
comment on table firstlane_private.question_revisions is 'Authoring drafts only; not a publication/release service. No public SELECT policy.';
commit;
