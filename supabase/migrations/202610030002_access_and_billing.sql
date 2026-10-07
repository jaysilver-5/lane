-- FirstLane v0.3 one-time Ontario purchase. Apply AFTER 202610030001_internal_beta.sql.
-- Server-only commerce records. Never expose firstlane_private through the Data API.
begin;
create table firstlane_private.commerce_settings (
 singleton boolean primary key default true check(singleton),
 environment text not null check(environment in ('SANDBOX','PRODUCTION'))
);
insert into firstlane_private.commerce_settings(singleton,environment) values(true,'SANDBOX');
create table firstlane_private.pack_offers (
 pack_key text primary key,
 product_id text unique not null,
 entitlement_id text unique not null,
 access_kind text not null check(access_kind in ('LIFETIME'))
);
insert into firstlane_private.pack_offers values('CA-ON-G1','firstlane_on_g1_lifetime','ca_on_g1_full','LIFETIME');
create table firstlane_private.commerce_events (
 event_id text primary key,event_type text not null,payload jsonb not null,
 received_at timestamptz not null default now(),disposition text not null
);
create table firstlane_private.store_transactions (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 pack_key text not null references firstlane_private.pack_offers(pack_key),
 store text not null check(store in ('APP_STORE','PLAY_STORE')),
 environment text not null check(environment in ('SANDBOX','PRODUCTION')),
 transaction_id text not null,purchased_at timestamptz not null,display_price text,refunded_at timestamptz,event_id text not null,
 unique(store,environment,transaction_id)
);
create table firstlane_private.refund_tombstones (
 store text not null,environment text not null,transaction_id text not null,refunded_at timestamptz not null,
 primary key(store,environment,transaction_id)
);
create index firstlane_store_user_idx on firstlane_private.store_transactions(user_id,pack_key,purchased_at);
alter table firstlane_private.commerce_settings enable row level security;
alter table firstlane_private.pack_offers enable row level security;
alter table firstlane_private.commerce_events enable row level security;
alter table firstlane_private.store_transactions enable row level security;
alter table firstlane_private.refund_tombstones enable row level security;
revoke all on all tables in schema firstlane_private from public,anon,authenticated;

create or replace function public.firstlane_my_access(p_pack_key text default 'CA-ON-G1')
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare u uuid := auth.uid(); p firstlane_private.access_grants%rowtype;
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
 select t.id,t.pack_key,t.display_price,t.purchased_at,
 case when t.refunded_at is not null then 'refunded' when t.environment='SANDBOX' then 'sandbox' else 'verified' end
 from firstlane_private.store_transactions t where t.user_id=(select auth.uid()) order by t.purchased_at desc;
$$;

-- RevenueCat webhook Edge Function authenticates the request. ONLY service_role may call this RPC.
create or replace function public.firstlane_apply_commerce_event(p_event jsonb)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare
 eid text:=p_event->>'id'; et text:=p_event->>'type'; st text:=p_event->>'store'; env text:=p_event->>'environment';
 tx text:=p_event->>'transaction_id'; uid uuid; offer firstlane_private.pack_offers%rowtype;
 bought timestamptz; refund_time timestamptz; expected text; old_owner uuid; old_pack text;
begin
 if eid is null or length(eid)>200 or jsonb_typeof(p_event)<>'object' then raise exception 'Malformed event';end if;
 perform pg_advisory_xact_lock(hashtextextended(eid,1));
 if exists(select 1 from firstlane_private.commerce_events where event_id=eid) then
  if (select payload from firstlane_private.commerce_events where event_id=eid)<>p_event then raise exception 'Conflicting event replay';end if;
  return jsonb_build_object('duplicate',true);
 end if;
 select environment into expected from firstlane_private.commerce_settings where singleton;
 if env is distinct from expected or st not in ('APP_STORE','PLAY_STORE') or et not in ('NON_RENEWING_PURCHASE','CANCELLATION') then
  insert into firstlane_private.commerce_events values(eid,coalesce(et,'UNKNOWN'),p_event,now(),'ignored_or_manual_review');
  return jsonb_build_object('ignored',true);
 end if;
 select * into offer from firstlane_private.pack_offers where product_id=p_event->>'product_id';
 if offer.pack_key is null or tx is null or length(tx)>500 then raise exception 'Unknown product or transaction';end if;
 perform pg_advisory_xact_lock(hashtextextended(st||env||tx,2));
 if et='CANCELLATION' then
  refund_time:=now();
  insert into firstlane_private.refund_tombstones values(st,env,tx,refund_time) on conflict do nothing;
  update firstlane_private.store_transactions set refunded_at=refund_time where store=st and environment=env and transaction_id=tx returning user_id,pack_key into uid,old_pack;
  if uid is not null then update firstlane_private.access_grants set revoked_at=refund_time where user_id=uid and pack_key=offer.pack_key and provider_transaction_id=tx; end if;
 else
  if coalesce(p_event->>'app_user_id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then raise exception 'Purchase must belong to a signed-in FirstLane account';end if;
  uid:=(p_event->>'app_user_id')::uuid;
  if not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'Unknown or unconfirmed account';end if;
  bought:=to_timestamp((p_event->>'purchased_at_ms')::numeric/1000);
  if bought is null or bought>now()+interval '10 minutes' then raise exception 'Invalid purchase time';end if;
  select user_id,pack_key into old_owner,old_pack from firstlane_private.store_transactions where store=st and environment=env and transaction_id=tx;
  if old_owner is not null and (old_owner<>uid or old_pack<>offer.pack_key) then raise exception 'Transaction belongs to another account or pack';end if;
  select refunded_at into refund_time from firstlane_private.refund_tombstones where store=st and environment=env and transaction_id=tx;
  insert into firstlane_private.store_transactions(user_id,pack_key,store,environment,transaction_id,purchased_at,display_price,refunded_at,event_id)
  values(uid,offer.pack_key,st,env,tx,bought,
   case when p_event->>'currency' is null then null else (p_event->>'currency')||' '||coalesce(p_event->>'price_in_purchased_currency','—') end,refund_time,eid)
  on conflict(store,environment,transaction_id) do nothing;
  if refund_time is null then
   insert into firstlane_private.access_grants(user_id,pack_key,provider,provider_transaction_id,starts_at,expires_at,revoked_at)
   values(uid,offer.pack_key,'revenuecat:'||st||':'||env,tx,bought,null,null)
   on conflict(provider,provider_transaction_id) do update set revoked_at=null,expires_at=null;
  end if;
 end if;
 insert into firstlane_private.commerce_events values(eid,et,p_event,now(),'applied');
 return jsonb_build_object('applied',true);
end $$;
revoke all on function public.firstlane_my_access(text),public.firstlane_my_receipts(),public.firstlane_apply_commerce_event(jsonb) from public,anon,authenticated;
grant execute on function public.firstlane_my_access(text),public.firstlane_my_receipts() to authenticated;
grant execute on function public.firstlane_apply_commerce_event(jsonb) to service_role;
commit;
