-- Starter migration for a NEW Supabase project, applied by a privileged migration role.
-- It does not provision a project, implement purchases, or publish this draft bank.
-- Keep content_private OUT of the Data API's exposed-schema list.
begin;
create schema if not exists content_private;
revoke all on schema content_private from public, anon, authenticated;
grant usage on schema content_private to service_role;

create table content_private.packs (
  pack_key text primary key,
  id uuid not null unique,
  jurisdiction_code text not null,
  licence_class text not null,
  locale text not null,
  title text not null,
  status text not null default 'draft' check (status in ('draft','active','withdrawn')),
  created_at timestamptz not null default now()
);
create table content_private.sources (
  source_id text primary key,
  url text not null,
  metadata jsonb not null check (jsonb_typeof(metadata) = 'object')
);
create table content_private.concepts (
  concept_id text primary key,
  pack_key text not null references content_private.packs(pack_key),
  section text not null check (section in ('road_signs','road_rules')),
  topic text not null,
  title text not null,
  unique (concept_id,pack_key)
);
create table content_private.questions (
  id uuid primary key,
  code text not null unique,
  pack_key text not null references content_private.packs(pack_key),
  concept_id text not null,
  foreign key (concept_id,pack_key) references content_private.concepts(concept_id,pack_key),
  unique (id,pack_key)
);

create function content_private.valid_item(p jsonb) returns boolean
language plpgsql immutable set search_path = pg_catalog as $$
declare count_options integer; distinct_ids integer; distinct_text integer; answer_matches integer;
begin
  if jsonb_typeof(p) <> 'object' or jsonb_typeof(p->'options') <> 'array' then return false; end if;
  select count(*), count(distinct o->>'id'), count(distinct lower(trim(o->>'text'))),
         count(*) filter (where o->>'id' = p->>'correct_option_id')
    into count_options,distinct_ids,distinct_text,answer_matches
    from jsonb_array_elements(p->'options') o;
  return count_options=4 and distinct_ids=4 and distinct_text=4 and answer_matches=1
     and coalesce(length(trim(p->>'prompt')),0)>0
     and coalesce(length(trim(p->>'explanation')),0)>0
     and not exists (select 1 from jsonb_array_elements(p->'options') o
                     where coalesce(length(trim(o->>'text')),0)=0);
exception when others then return false;
end $$;

create table content_private.question_revisions (
  id uuid primary key,
  question_id uuid not null,
  pack_key text not null,
  revision integer not null check (revision>0),
  locale text not null,
  author_id text not null,
  payload jsonb not null check (content_private.valid_item(payload)),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  foreign key (question_id,pack_key) references content_private.questions(id,pack_key),
  unique (question_id,locale,revision),
  unique (id,pack_key),
  check ((payload->>'id'=question_id::text) is true),
  check ((payload->>'revision_id'=id::text) is true),
  check ((payload->>'pack_key'=pack_key) is true),
  check ((payload->>'locale'=locale) is true),
  check ((payload->>'author_id'=author_id) is true)
);
create function content_private.reject_revision_change() returns trigger
language plpgsql set search_path=pg_catalog as $$
begin raise exception 'Revision and audit records are immutable; append a new record.'; end $$;
create trigger immutable_question_revision before update or delete on content_private.question_revisions
for each row execute function content_private.reject_revision_change();
create table content_private.item_sources (
  revision_id uuid not null references content_private.question_revisions(id),
  source_id text not null references content_private.sources(source_id),
  locator text not null,
  support_note text not null,
  primary key (revision_id,source_id)
);
-- A separate append-only approval log is the authority, not flags inside imported JSON.
create table content_private.approvals (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references content_private.question_revisions(id),
  kind text not null check (kind in ('content','rights')),
  decision text not null check (decision in ('approved','rejected')),
  reviewer_id text not null,
  evidence_ref text not null check (length(trim(evidence_ref))>0),
  valid_until timestamptz,
  recorded_at timestamptz not null default now()
);
create index approvals_latest on content_private.approvals(revision_id,kind,recorded_at desc);
create function content_private.check_reviewer() returns trigger
language plpgsql set search_path=pg_catalog as $$
declare author text;
begin
  select r.author_id into author from content_private.question_revisions r where r.id=new.revision_id;
  if new.reviewer_id=author then raise exception 'The author cannot independently approve their revision.'; end if;
  return new;
end $$;
create trigger distinct_reviewer before insert on content_private.approvals
for each row execute function content_private.check_reviewer();
create trigger immutable_approval before update or delete on content_private.approvals
for each row execute function content_private.reject_revision_change();

create table content_private.pack_releases (
  id uuid primary key,
  pack_key text not null references content_private.packs(pack_key),
  version text not null,
  state text not null default 'draft' check (state in ('draft','published','withdrawn')),
  manifest jsonb not null,
  content_sha256 text not null check (content_sha256 ~ '^[a-f0-9]{64}$'),
  template_approval_ref text,
  published_at timestamptz,
  unique (pack_key,version),
  unique (id,pack_key)
);
create table content_private.release_items (
  release_id uuid not null,
  revision_id uuid not null,
  pack_key text not null,
  primary key (release_id,revision_id),
  foreign key (release_id,pack_key) references content_private.pack_releases(id,pack_key),
  foreign key (revision_id,pack_key) references content_private.question_revisions(id,pack_key)
);
create function content_private.protect_release_items() returns trigger
language plpgsql set search_path=pg_catalog as $$
declare rid uuid; st text;
begin
  if tg_op in ('UPDATE','DELETE') then
    select state into st from content_private.pack_releases where id=old.release_id for update;
    if st<>'draft' then raise exception 'Published/withdrawn release membership is immutable.'; end if;
  end if;
  if tg_op in ('INSERT','UPDATE') then
    select state into st from content_private.pack_releases where id=new.release_id for update;
    if st<>'draft' then raise exception 'Only a draft release may gain or change items.'; end if;
  end if;
  if tg_op='DELETE' then return old; else return new; end if;
end $$;
create trigger protect_release_items before insert or update or delete on content_private.release_items
for each row execute function content_private.protect_release_items();
create function content_private.guard_publication() returns trigger
language plpgsql set search_path=pg_catalog as $$
declare item record; k text; latest record;
begin
  if tg_op='INSERT' and new.state<>'draft' then raise exception 'Create a draft release before publication.'; end if;
  if tg_op='UPDATE' and old.state in ('published','withdrawn') then
    if (to_jsonb(new)-'state')<>(to_jsonb(old)-'state') then
      raise exception 'Released metadata cannot change; create a new release.';
    end if;
    if old.state='withdrawn' or new.state<>'withdrawn' then
      raise exception 'A published release may only transition to withdrawn.';
    end if;
    return new;
  end if;
  if new.state='published' then
    if coalesce(length(trim(new.template_approval_ref)),0)=0 then
      raise exception 'An independently verified template approval record is required.';
    end if;
    if coalesce((new.manifest->>'production_ready')::boolean,false) is not true then
      raise exception 'Release manifest is not approved for production.';
    end if;
    if not exists(select 1 from content_private.release_items where release_id=new.id) then
      raise exception 'Cannot publish an empty release.';
    end if;
    for item in select revision_id from content_private.release_items where release_id=new.id loop
      foreach k in array array['content','rights'] loop
        select a.* into latest from content_private.approvals a
        where a.revision_id=item.revision_id and a.kind=k
        order by a.recorded_at desc,a.id desc limit 1;
        if not found then raise exception 'Missing % approval for %',k,item.revision_id; end if;
        if latest.decision<>'approved' or (latest.valid_until is not null and latest.valid_until<=now()) then
          raise exception 'Missing current % approval for %',k,item.revision_id;
        end if;
      end loop;
    end loop;
    new.published_at=now();
  end if;
  return new;
end $$;
create trigger guard_publication before insert or update on content_private.pack_releases
for each row execute function content_private.guard_publication();
-- Revoking an approval after publication requires the operator to withdraw the release,
-- invalidate download manifests and deliver a correction. Build and test that workflow.

create table content_private.access_grants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  pack_key text not null references content_private.packs(pack_key),
  provider text not null,
  provider_transaction_id text not null,
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  status text not null check (status in ('active','revoked','refunded')),
  unique(provider,provider_transaction_id),
  check(expires_at>starts_at)
);
create index access_grant_lookup on content_private.access_grants(user_id,pack_key,status,expires_at);
-- Grants may ONLY come from verified purchase/administrative server logic, never mobile JSON.

create table public.learner_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references content_private.questions(id),
  created_at timestamptz not null default now(),
  primary key(user_id,question_id)
);
alter table public.learner_bookmarks enable row level security;
revoke all on public.learner_bookmarks from anon, authenticated;
grant select,insert,delete on public.learner_bookmarks to authenticated;
create policy own_bookmarks_select on public.learner_bookmarks for select to authenticated using((select auth.uid())=user_id);
create policy own_bookmarks_insert on public.learner_bookmarks for insert to authenticated with check((select auth.uid())=user_id);
create policy own_bookmarks_delete on public.learner_bookmarks for delete to authenticated using((select auth.uid())=user_id);

create table public.learner_answer_events (
  event_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null,
  pack_key text not null,
  revision_id uuid not null,
  chosen_option_id uuid not null,
  occurred_at_client timestamptz not null,
  received_at timestamptz not null default now(),
  server_graded_correct boolean,
  foreign key(revision_id,pack_key) references content_private.question_revisions(id,pack_key)
);
create index learner_events_user_pack on public.learner_answer_events(user_id,pack_key,received_at desc);
alter table public.learner_answer_events enable row level security;
revoke all on public.learner_answer_events from anon, authenticated;
grant select on public.learner_answer_events to authenticated;
create policy own_answer_events on public.learner_answer_events for select to authenticated using((select auth.uid())=user_id);
-- A server endpoint must validate user, session, release, entitlement, selected option,
-- timestamps and idempotency before inserting. Clients cannot submit authoritative scores.

-- Explicit defaults and RLS prevent accidental direct publication of the private tables.
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname='content_private' loop
    execute format('alter table content_private.%I enable row level security',t.tablename);
    execute format('revoke all on table content_private.%I from public, anon, authenticated',t.tablename);
    execute format('grant all on table content_private.%I to service_role',t.tablename);
  end loop;
end $$;
revoke execute on all functions in schema content_private from public,anon,authenticated;
grant execute on all functions in schema content_private to service_role;
grant all on public.learner_bookmarks,public.learner_answer_events to service_role;
alter default privileges in schema content_private revoke all on tables from public,anon,authenticated;
alter default privileges in schema content_private revoke execute on functions from public,anon,authenticated;
commit;
