-- Web checkout is independent of the native store ledger, sharing account access.
begin;
create table firstlane_private.paddle_settings (
 singleton boolean primary key default true check(singleton),
 environment text not null check(environment in ('sandbox','live'))
);
insert into firstlane_private.paddle_settings values(true,'sandbox');
create table firstlane_private.paddle_checkouts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete set null,
 pack_key text not null default 'CA-ON-G1' references firstlane_private.pack_offers(pack_key),
 environment text not null check(environment in ('sandbox','live')),
 transaction_id text unique,
 status text not null check(status in ('creating','ready','completed','canceled','failed')),
 created_at timestamptz not null default now()
);
create unique index firstlane_paddle_open_checkout on firstlane_private.paddle_checkouts(user_id,environment)
 where status in ('creating','ready');
create table firstlane_private.paddle_transactions (
 id uuid primary key default gen_random_uuid(), transaction_id text not null,
 user_id uuid references auth.users(id) on delete set null,
 environment text not null check(environment in ('sandbox','live')),
 checkout_id uuid not null references firstlane_private.paddle_checkouts(id),
 purchased_at timestamptz not null, revoked_at timestamptz,
 unique(environment,transaction_id)
);
create table firstlane_private.paddle_adjustments (
 id text primary key, environment text not null, transaction_id text not null,
 action text not null, status text not null, event_at timestamptz not null
);
create index firstlane_paddle_adjustment_tx on firstlane_private.paddle_adjustments(environment,transaction_id);
create table firstlane_private.paddle_events (
 event_id text primary key, payload jsonb not null, received_at timestamptz not null default now()
);
alter table firstlane_private.paddle_settings enable row level security;
alter table firstlane_private.paddle_checkouts enable row level security;
alter table firstlane_private.paddle_transactions enable row level security;
alter table firstlane_private.paddle_adjustments enable row level security;
alter table firstlane_private.paddle_events enable row level security;
revoke all on all tables in schema firstlane_private from public,anon,authenticated;

create function public.firstlane_paddle_reserve(p_user uuid,p_environment text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare row firstlane_private.paddle_checkouts%rowtype;
begin
 if p_environment is distinct from (select environment from firstlane_private.paddle_settings where singleton) then raise exception 'Paddle environment mismatch'; end if;
 if not exists(select 1 from auth.users where id=p_user and email_confirmed_at is not null) then raise exception 'Verified account required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||p_environment,41));
 if exists(select 1 from firstlane_private.access_grants where user_id=p_user and pack_key='CA-ON-G1' and revoked_at is null and starts_at<=now() and (expires_at is null or expires_at>now())) then return jsonb_build_object('status','owned'); end if;
 select * into row from firstlane_private.paddle_checkouts where user_id=p_user and environment=p_environment and status in ('creating','ready') order by created_at desc limit 1;
 if row.id is not null then return to_jsonb(row)||jsonb_build_object('fresh',false); end if;
 if exists(select 1 from firstlane_private.paddle_checkouts where user_id=p_user and environment=p_environment and created_at>now()-interval '10 seconds') then raise exception 'Please wait before starting another checkout'; end if;
 insert into firstlane_private.paddle_checkouts(user_id,environment,status) values(p_user,p_environment,'creating') returning * into row;
 return to_jsonb(row)||jsonb_build_object('fresh',true);
end $$;

create function public.firstlane_paddle_attach(p_id uuid,p_transaction text,p_status text)
returns void language plpgsql security definer set search_path='' as $$
declare row firstlane_private.paddle_checkouts%rowtype;
begin
 select * into row from firstlane_private.paddle_checkouts where id=p_id for update;
 if row.id is null or p_status not in ('ready','failed','canceled') then raise exception 'Invalid checkout'; end if;
 if row.transaction_id is not null and row.transaction_id is distinct from p_transaction then raise exception 'Checkout transaction mismatch'; end if;
 if p_status='ready' and coalesce(p_transaction,'') !~ '^txn_[a-z0-9]{26}$' then raise exception 'Invalid transaction'; end if;
 -- A webhook may complete while the create-transaction response is in flight.
 if row.status='completed' then return; end if;
 update firstlane_private.paddle_checkouts set transaction_id=coalesce(transaction_id,p_transaction),status=p_status where id=p_id;
end $$;

create function public.firstlane_apply_paddle_event(p_event jsonb)
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
 if checkout.user_id<>uid or not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'Checkout ownership mismatch'; end if;
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

create or replace function public.firstlane_my_receipts()
returns table(id uuid,pack_key text,display_price text,purchased_at timestamptz,status text)
language sql stable security definer set search_path='' as $$
 select * from (
  select t.id,t.pack_key,t.display_price,t.purchased_at,case when t.refunded_at is not null then 'refunded' when t.environment='SANDBOX' then 'sandbox' else 'verified' end as status
  from firstlane_private.store_transactions t where t.user_id=(select auth.uid())
  union all
  select p.id,'CA-ON-G1','CAD 14.99 · Paddle',p.purchased_at,case when p.revoked_at is not null then 'revoked' when p.environment='sandbox' then 'sandbox' else 'verified' end
  from firstlane_private.paddle_transactions p where p.user_id=(select auth.uid())
 ) receipts order by purchased_at desc;
$$;
revoke all on function public.firstlane_paddle_reserve(uuid,text),public.firstlane_paddle_attach(uuid,text,text),public.firstlane_apply_paddle_event(jsonb) from public,anon,authenticated;
grant execute on function public.firstlane_paddle_reserve(uuid,text),public.firstlane_paddle_attach(uuid,text,text),public.firstlane_apply_paddle_event(jsonb) to service_role;
commit;
