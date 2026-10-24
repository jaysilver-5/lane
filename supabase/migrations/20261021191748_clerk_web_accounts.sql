-- Web-only Clerk accounts. No legacy users are imported or deleted.
begin;
create table firstlane_private.accounts (
 id uuid primary key default gen_random_uuid(), issuer text not null, subject text not null,
 email text not null, display_name text not null default '', verified boolean not null default false,
 deleted_at timestamptz, created_at timestamptz not null default now(), unique(issuer,subject)
);
create table firstlane_private.account_sessions (
 issuer text not null, session_id text not null, subject text not null,
 account_id uuid not null references firstlane_private.accounts(id) on delete cascade,
 expires_at timestamptz not null, primary key(issuer,session_id)
);
alter table firstlane_private.accounts enable row level security;
alter table firstlane_private.account_sessions enable row level security;
revoke all on firstlane_private.accounts,firstlane_private.account_sessions from public,anon,authenticated;

-- Changing ownership roots requires an empty prelaunch application database.
-- Stop instead of silently adopting or destroying any unexpected legacy data.
do $$
declare t text;
begin
 foreach t in array array['public.beta_profiles','public.beta_progress','public.beta_reports','firstlane_private.access_grants','firstlane_private.paddle_checkouts','firstlane_private.paddle_transactions'] loop
  if exists(select 1 from pg_constraint where conrelid=t::regclass and contype='f' and confrelid='auth.users'::regclass) then
   execute format('select exists(select 1 from %s where user_id is not null)',t) into strict found;
   if found then raise exception 'Prelaunch Clerk setup requires empty application ownership tables: %',t; end if;
  end if;
 end loop;
end $$;
alter table public.beta_profiles drop constraint beta_profiles_user_id_fkey;
alter table public.beta_profiles add foreign key(user_id) references firstlane_private.accounts(id) on delete cascade;
alter table public.beta_progress drop constraint beta_progress_user_id_fkey;
alter table public.beta_progress add foreign key(user_id) references firstlane_private.accounts(id) on delete cascade;
alter table public.beta_reports drop constraint beta_reports_user_id_fkey;
alter table public.beta_reports add foreign key(user_id) references firstlane_private.accounts(id) on delete cascade;
alter table firstlane_private.access_grants drop constraint access_grants_user_id_fkey;
alter table firstlane_private.access_grants add foreign key(user_id) references firstlane_private.accounts(id) on delete cascade;
alter table firstlane_private.paddle_checkouts drop constraint paddle_checkouts_user_id_fkey;
alter table firstlane_private.paddle_checkouts add foreign key(user_id) references firstlane_private.accounts(id) on delete set null;
alter table firstlane_private.paddle_transactions drop constraint paddle_transactions_user_id_fkey;
alter table firstlane_private.paddle_transactions add foreign key(user_id) references firstlane_private.accounts(id) on delete set null;

-- Only the Edge Function may bind an identity after checking Clerk's signature,
-- active session and currently verified primary email. No client-supplied UUID.
create function public.firstlane_bind_clerk_account(p_issuer text,p_subject text,p_session text,p_email text,p_name text,p_expires timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a firstlane_private.accounts%rowtype;
begin
 if p_issuer !~ '^https://[^/]+$' or p_subject !~ '^user_[a-zA-Z0-9]+$' or p_session !~ '^sess_[a-zA-Z0-9]+$'
 or length(p_email) not between 3 and 320 or p_expires<=now() or p_expires is null then raise exception 'Invalid verified identity'; end if;
 insert into firstlane_private.accounts(issuer,subject,email,display_name,verified)
 values(p_issuer,p_subject,p_email,left(coalesce(p_name,''),40),true)
 on conflict(issuer,subject) do update set email=excluded.email,display_name=excluded.display_name,verified=true
 where accounts.deleted_at is null returning * into a;
 if a.id is null then raise exception 'Account deleted'; end if;
 insert into firstlane_private.account_sessions(issuer,session_id,subject,account_id,expires_at)
 values(p_issuer,p_session,p_subject,a.id,least(p_expires,now()+interval '90 seconds'))
 on conflict(issuer,session_id) do update set expires_at=excluded.expires_at
 where account_sessions.account_id=excluded.account_id and account_sessions.subject=excluded.subject;
 return jsonb_build_object('id',a.id,'email',a.email,'name',a.display_name,'confirmed',true);
end $$;
revoke all on function public.firstlane_bind_clerk_account(text,text,text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.firstlane_bind_clerk_account(text,text,text,text,text,timestamptz) to service_role;

-- Supabase verifies the JWT via its configured Clerk Third-Party Auth integration.
-- Resolve exactly its issuer, subject AND session; legacy Auth tokens have no mapping.
create function public.firstlane_current_account()
returns uuid language sql stable security definer set search_path='' as $$
 select a.id from firstlane_private.accounts a
 join firstlane_private.account_sessions s on s.account_id=a.id
 where a.issuer=(auth.jwt()->>'iss') and a.subject=(auth.jwt()->>'sub')
 and s.issuer=a.issuer and s.subject=a.subject and s.session_id=(auth.jwt()->>'sid')
 and s.expires_at>now() and a.deleted_at is null and a.verified;
$$;
revoke all on function public.firstlane_current_account() from public,anon;
grant execute on function public.firstlane_current_account() to authenticated;

drop policy own_profiles on public.beta_profiles;
drop policy own_progress on public.beta_progress;
drop policy own_reports_read on public.beta_reports;
drop policy own_reports_insert on public.beta_reports;
create policy own_profiles on public.beta_profiles for all to authenticated using((select public.firstlane_current_account())=user_id) with check((select public.firstlane_current_account())=user_id);
create policy own_progress on public.beta_progress for all to authenticated using((select public.firstlane_current_account())=user_id) with check((select public.firstlane_current_account())=user_id);
create policy own_reports_read on public.beta_reports for select to authenticated using((select public.firstlane_current_account())=user_id);
create policy own_reports_insert on public.beta_reports for insert to authenticated with check((select public.firstlane_current_account())=user_id);

-- First disable identity and erase study data, then delete the Clerk user. Keeping
-- a non-personal tombstone lets failed external deletion retry without reopening access.
create function public.firstlane_delete_clerk_account(p_issuer text,p_subject text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid;
begin
 select id into u from firstlane_private.accounts where issuer=p_issuer and subject=p_subject for update;
 if u is null then return jsonb_build_object('disabled',true); end if;
 update firstlane_private.accounts set deleted_at=coalesce(deleted_at,now()),verified=false,email='',display_name='' where id=u;
 delete from firstlane_private.account_sessions where account_id=u;
 delete from public.beta_profiles where user_id=u;
 delete from public.beta_progress where user_id=u;
 delete from public.beta_reports where user_id=u;
 delete from firstlane_private.access_grants where user_id=u;
 update firstlane_private.paddle_checkouts set user_id=null where user_id=u;
 update firstlane_private.paddle_transactions set user_id=null where user_id=u;
 return jsonb_build_object('disabled',true);
end $$;
revoke all on function public.firstlane_delete_clerk_account(text,text) from public,anon,authenticated;
grant execute on function public.firstlane_delete_clerk_account(text,text) to service_role;

create or replace function public.my_access_grants()
returns table(id uuid,pack_key text,starts_at timestamptz,expires_at timestamptz)
language sql stable security definer set search_path=''
as $$
 select g.id,g.pack_key,g.starts_at,g.expires_at
 from firstlane_private.access_grants g
 where g.user_id=(select public.firstlane_current_account()) and g.revoked_at is null
 and g.starts_at<=now() and (g.expires_at is null or g.expires_at>now());
$$;

create or replace function public.firstlane_my_access(p_pack_key text default 'CA-ON-G1')
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare u uuid := public.firstlane_current_account(); p firstlane_private.access_grants%rowtype;
begin
 if u is null then raise exception 'Sign in to check access'; end if;
 select * into p from firstlane_private.access_grants g where g.user_id=u and g.pack_key=p_pack_key
 and g.revoked_at is null and g.starts_at<=now() and (g.expires_at is null or g.expires_at>now())
 order by g.starts_at desc limit 1;
 return jsonb_build_object('serverNow',now(),
  'paid',case when p.id is null then null else jsonb_build_object('startsAt',p.starts_at,'endsAt',p.expires_at,'lifetime',(p.expires_at is null),'revokedAt',p.revoked_at) end);
end $$;

create or replace function public.firstlane_my_receipts()
returns table(id uuid,pack_key text,display_price text,purchased_at timestamptz,status text)
language sql stable security definer set search_path='' as $$
 select * from (
  select t.id,t.pack_key,t.display_price,t.purchased_at,case when t.refunded_at is not null then 'refunded' when t.environment='SANDBOX' then 'sandbox' else 'verified' end as status
  from firstlane_private.store_transactions t where t.user_id=(select public.firstlane_current_account())
  union all
  select p.id,'CA-ON-G1','CAD 14.99 · Paddle',p.purchased_at,case when p.revoked_at is not null then 'revoked' when p.environment='sandbox' then 'sandbox' else 'verified' end
  from firstlane_private.paddle_transactions p where p.user_id=(select public.firstlane_current_account())
 ) receipts order by purchased_at desc;
$$;

create or replace function public.firstlane_save_progress(p_snapshot jsonb,p_expected_updated_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=public.firstlane_current_account(); previous timestamptz; s jsonb;
begin
 if u is null then raise exception 'Sign-in required';end if;
 if jsonb_typeof(p_snapshot) is distinct from 'object' or octet_length(p_snapshot::text)>4000000 then raise exception 'Invalid progress payload';end if;
 if jsonb_typeof(p_snapshot->'sessions') is distinct from 'array' or jsonb_typeof(p_snapshot->'bookmarks') is distinct from 'array' or jsonb_typeof(p_snapshot->'bookmarkChanges') is distinct from 'object' then raise exception 'Invalid progress structure';end if;
 if jsonb_array_length(p_snapshot->'sessions')>10000 or jsonb_array_length(p_snapshot->'bookmarks')>5000 then raise exception 'Progress is too large';end if;
 for s in select value from jsonb_array_elements(p_snapshot->'sessions') loop
  if jsonb_typeof(s) is distinct from 'object' or jsonb_typeof(s->'answers') is distinct from 'array' or jsonb_typeof(s->'questionIds') is distinct from 'array' or s->>'id' is null or s->>'finishedAt' is null then raise exception 'Invalid session';end if;
  if jsonb_array_length(s->'questionIds') not between 1 and 100 or jsonb_array_length(s->'answers')<>jsonb_array_length(s->'questionIds') then raise exception 'Incomplete session';end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended(u::text,4));
 select updated_at into previous from public.beta_progress where user_id=u for update;
 if previous is distinct from p_expected_updated_at then return jsonb_build_object('saved',false,'conflict',true);end if;
 insert into public.beta_progress(user_id,snapshot,updated_at) values(u,p_snapshot,clock_timestamp()) on conflict(user_id) do update set snapshot=excluded.snapshot,updated_at=excluded.updated_at;
 return jsonb_build_object('saved',true);
end $$;

create or replace function public.firstlane_content_release(p_pack_key text default 'CA-ON-G1')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid := public.firstlane_current_account(); result jsonb;
begin
 if u is null or not exists(select 1 from firstlane_private.accounts where id=u and verified and deleted_at is null) then raise exception 'Verified sign-in required';end if;
 if not exists(select 1 from firstlane_private.access_grants where user_id=u and pack_key=p_pack_key and revoked_at is null and starts_at<=now() and (expires_at is null or expires_at>now())) then raise exception 'Purchase required';end if;
 select jsonb_build_object('version',r.version,'storage_path',r.storage_path,'sha256',r.sha256,'bytes',r.bytes,'question_count',r.question_count)
 into result from firstlane_private.content_releases r where r.pack_key=p_pack_key and r.approved and r.published_at<=now() order by r.published_at desc limit 1;
 return result;
end $$;

create or replace function public.firstlane_paddle_reserve(p_user uuid,p_environment text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare row firstlane_private.paddle_checkouts%rowtype;
begin
 if p_environment is distinct from (select environment from firstlane_private.paddle_settings where singleton) then raise exception 'Paddle environment mismatch'; end if;
 if not exists(select 1 from firstlane_private.accounts where id=p_user and verified and deleted_at is null) then raise exception 'Verified account required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||p_environment,41));
 if exists(select 1 from firstlane_private.access_grants where user_id=p_user and pack_key='CA-ON-G1' and revoked_at is null and starts_at<=now() and (expires_at is null or expires_at>now())) then return jsonb_build_object('status','owned'); end if;
 select * into row from firstlane_private.paddle_checkouts where user_id=p_user and environment=p_environment and status in ('creating','ready') order by created_at desc limit 1;
 if row.id is not null then return to_jsonb(row)||jsonb_build_object('fresh',false); end if;
 if exists(select 1 from firstlane_private.paddle_checkouts where user_id=p_user and environment=p_environment and created_at>now()-interval '10 seconds') then raise exception 'Please wait before starting another checkout'; end if;
 insert into firstlane_private.paddle_checkouts(user_id,environment,status) values(p_user,p_environment,'creating') returning * into row;
 return to_jsonb(row)||jsonb_build_object('fresh',true);
end $$;

create or replace function public.firstlane_apply_paddle_event(p_event jsonb)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare
 eid text:=p_event->>'id'; tx text:=p_event->>'transaction_id'; env text:=p_event->>'environment';
 et text:=p_event->>'type'; uid uuid; checkout firstlane_private.paddle_checkouts%rowtype;
 at_time timestamptz; bought timestamptz; adj jsonb:=p_event->'adjustment';
 blocked boolean; dispute text; warning text; provider_key text;
begin
 if jsonb_typeof(p_event) is distinct from 'object' or coalesce(eid,'') !~ '^evt_[a-z0-9]{26}$' or coalesce(tx,'') !~ '^txn_[a-z0-9]{26}$' then raise exception 'Malformed event'; end if;
 if env is distinct from (select environment from firstlane_private.paddle_settings where singleton) then raise exception 'Paddle environment mismatch'; end if;
 if et not in ('transaction.completed','adjustment.created','adjustment.updated') then raise exception 'Unsupported event'; end if;
 if p_event->>'currency' is distinct from 'CAD' or p_event->>'amount_minor' is distinct from '1499' then raise exception 'Incorrect offer'; end if;
 perform pg_advisory_xact_lock(hashtextextended(eid,42));
 if exists(select 1 from firstlane_private.paddle_events where event_id=eid) then
  if (select payload from firstlane_private.paddle_events where event_id=eid)<>p_event then raise exception 'Conflicting replay'; end if;
  return jsonb_build_object('duplicate',true);
 end if;
 perform pg_advisory_xact_lock(hashtextextended(env||tx,43));
 uid:=(p_event->>'user_id')::uuid;
 select * into checkout from firstlane_private.paddle_checkouts where id=(p_event->>'checkout_id')::uuid for update;
 if checkout.id is null or checkout.environment<>env or (checkout.transaction_id is not null and checkout.transaction_id<>tx) then raise exception 'Unknown or mismatched checkout'; end if;
 -- Deleted users cannot regain access; retain a minimal delivery record for retries.
 if checkout.user_id is null then
  insert into firstlane_private.paddle_events(event_id,payload) values(eid,p_event);
  return jsonb_build_object('ignored',true,'reason','deleted_account');
 end if;
 if checkout.user_id<>uid or not exists(select 1 from firstlane_private.accounts where id=uid and deleted_at is null) then raise exception 'Checkout ownership mismatch'; end if;
 at_time:=(p_event->>'occurred_at')::timestamptz;
 bought:=(p_event->>'purchased_at')::timestamptz;
 if at_time is null or bought is null or at_time>now()+interval '10 minutes' or bought>now()+interval '10 minutes' or bought<=to_timestamp(0) then raise exception 'Invalid event clock'; end if;
 provider_key:='paddle:'||env;
 if et='transaction.completed' then
  if exists(select 1 from firstlane_private.paddle_transactions where environment=env and transaction_id=tx and (user_id is distinct from uid or checkout_id<>checkout.id)) then raise exception 'Transaction owner mismatch'; end if;
  insert into firstlane_private.paddle_transactions(transaction_id,user_id,environment,checkout_id,purchased_at)
   values(tx,uid,env,checkout.id,bought) on conflict(environment,transaction_id) do nothing;
  update firstlane_private.paddle_checkouts set transaction_id=tx,status='completed' where id=checkout.id;
 else
  if coalesce(adj->>'id','') !~ '^adj_[a-z0-9]{26}$' or coalesce(adj->>'action','') not in ('refund','credit','chargeback','chargeback_reverse','chargeback_warning','chargeback_warning_reverse','credit_reverse')
   or coalesce(adj->>'status','') not in ('pending_approval','approved','rejected','reversed') then raise exception 'Unsupported adjustment'; end if;
  if exists(select 1 from firstlane_private.paddle_adjustments where id=adj->>'id' and (environment<>env or transaction_id<>tx)) then raise exception 'Adjustment transaction mismatch'; end if;
  insert into firstlane_private.paddle_adjustments(id,environment,transaction_id,action,status,event_at)
   values(adj->>'id',env,tx,adj->>'action',adj->>'status',at_time)
   on conflict(id) do update set action=excluded.action,status=excluded.status,event_at=excluded.event_at
   where excluded.event_at>firstlane_private.paddle_adjustments.event_at
    or (excluded.event_at=firstlane_private.paddle_adjustments.event_at and excluded.status='approved' and firstlane_private.paddle_adjustments.status<>'approved');
 end if;
 -- Refunds remain barriers even if the purchase is delivered later. Any approved
 -- refund of this single-pack purchase revokes access; pending/rejected ones do not.
 select exists(select 1 from firstlane_private.paddle_adjustments where environment=env and transaction_id=tx and action='refund' and status='approved') into blocked;
 select action into dispute from firstlane_private.paddle_adjustments where environment=env and transaction_id=tx and status='approved' and action in ('chargeback','chargeback_reverse') order by event_at desc,(action='chargeback') desc limit 1;
 select action into warning from firstlane_private.paddle_adjustments where environment=env and transaction_id=tx and status='approved' and action in ('chargeback_warning','chargeback_warning_reverse') order by event_at desc,(action='chargeback_warning') desc limit 1;
 blocked:=blocked or coalesce(dispute='chargeback',false) or coalesce(warning='chargeback_warning',false);
 update firstlane_private.paddle_transactions set revoked_at=case when blocked then coalesce(revoked_at,at_time) else null end where environment=env and transaction_id=tx;
 -- An adjustment (including a reversal) alone never creates a purchase or access.
 if exists(select 1 from firstlane_private.paddle_transactions where environment=env and transaction_id=tx) then
  insert into firstlane_private.access_grants(user_id,pack_key,provider,provider_transaction_id,starts_at,expires_at,revoked_at)
   values(uid,'CA-ON-G1',provider_key,tx,bought,null,case when blocked then at_time else null end)
   on conflict(provider,provider_transaction_id) do update set revoked_at=excluded.revoked_at;
 end if;
 insert into firstlane_private.paddle_events(event_id,payload) values(eid,p_event);
 return jsonb_build_object('applied',true,'revoked',blocked);
end $$;
commit;
