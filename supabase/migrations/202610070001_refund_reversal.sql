-- FirstLane QA P2: explicit App Store refund reversal and delivery-order protection.
-- Apply AFTER all 20261006 migrations. Does not grant any live user access on migration.
-- A purchase event is still required to create a transaction/grant; a reversal alone cannot.
-- Reference: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
begin;
create table firstlane_private.transaction_lifecycle (
 store text not null check(store in ('APP_STORE','PLAY_STORE')),
 environment text not null check(environment in ('SANDBOX','PRODUCTION')),
 transaction_id text not null,
 pack_key text not null references firstlane_private.pack_offers(pack_key),
 user_id uuid references auth.users(id) on delete set null,
 status text not null check(status in ('active','refunded')),
 event_at timestamptz not null,
 event_id text not null,
 primary key(store,environment,transaction_id)
);
alter table firstlane_private.transaction_lifecycle enable row level security;
revoke all on firstlane_private.transaction_lifecycle from public,anon,authenticated;

-- Preserve historical refund barriers. Prefer the provider event clock, when available,
-- over arrival time; an old webhook delivered late must not undo a later reversal.
insert into firstlane_private.transaction_lifecycle(store,environment,transaction_id,pack_key,user_id,status,event_at,event_id)
select r.store,r.environment,r.transaction_id,coalesce(t.pack_key,p.pack_key),t.user_id,'refunded',
 coalesce(e.provider_time,r.refunded_at),coalesce(e.event_id,'legacy-refund')
from firstlane_private.refund_tombstones r
left join firstlane_private.store_transactions t on (t.store,t.environment,t.transaction_id)=(r.store,r.environment,r.transaction_id)
left join lateral (
 select ce.event_id,ce.payload->>'product_id' as product_id,
 case when ce.payload->>'event_timestamp_ms' ~ '^[0-9]{1,16}$'
  then to_timestamp((ce.payload->>'event_timestamp_ms')::numeric/1000) end as provider_time
 from firstlane_private.commerce_events ce
 where ce.event_type='CANCELLATION' and ce.payload->>'store'=r.store
  and ce.payload->>'environment'=r.environment and ce.payload->>'transaction_id'=r.transaction_id
 order by ce.received_at desc limit 1
) e on true
left join firstlane_private.pack_offers p on p.product_id=e.product_id
where coalesce(t.pack_key,p.pack_key) is not null;

create or replace function public.firstlane_apply_commerce_event(p_event jsonb)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $$
declare
 eid text:=p_event->>'id'; et text:=p_event->>'type'; st text:=p_event->>'store'; env text:=p_event->>'environment';
 tx text:=p_event->>'transaction_id'; uid uuid; offer firstlane_private.pack_offers%rowtype;
 original firstlane_private.store_transactions%rowtype;
 lifecycle firstlane_private.transaction_lifecycle%rowtype;
 bought timestamptz; refund_time timestamptz; event_time timestamptz; expected text;
 provider_key text; disposition text:='applied';
begin
 if jsonb_typeof(p_event) is distinct from 'object' or eid is null or length(eid)=0 or length(eid)>200 then raise exception 'Malformed event'; end if;
 perform pg_advisory_xact_lock(hashtextextended(eid,1));
 if exists(select 1 from firstlane_private.commerce_events where event_id=eid) then
  if (select payload from firstlane_private.commerce_events where event_id=eid)<>p_event then raise exception 'Conflicting event replay'; end if;
  return jsonb_build_object('duplicate',true);
 end if;
 select environment into expected from firstlane_private.commerce_settings where singleton;
 if env is distinct from expected or st is null or st not in ('APP_STORE','PLAY_STORE') or et is null
  or et not in ('NON_RENEWING_PURCHASE','CANCELLATION','REFUND_REVERSED')
  or (et='REFUND_REVERSED' and st<>'APP_STORE') then
  insert into firstlane_private.commerce_events values(eid,coalesce(et,'UNKNOWN'),p_event,now(),'ignored_or_manual_review');
  return jsonb_build_object('ignored',true);
 end if;
 select * into offer from firstlane_private.pack_offers where product_id=p_event->>'product_id';
 if offer.pack_key is null or tx is null or length(tx)=0 or length(tx)>500 then raise exception 'Unknown product or transaction'; end if;
 provider_key:='revenuecat:'||st||':'||env;
 perform pg_advisory_xact_lock(hashtextextended(st||env||tx,2));
 select * into original from firstlane_private.store_transactions where store=st and environment=env and transaction_id=tx;
 select * into lifecycle from firstlane_private.transaction_lifecycle where store=st and environment=env and transaction_id=tx;
 if (original.id is not null and original.pack_key<>offer.pack_key)
   or (lifecycle.transaction_id is not null and lifecycle.pack_key<>offer.pack_key) then raise exception 'Transaction belongs to another pack'; end if;

 -- Reversal restores the original owner, never an alias or a different account.
 if et in ('NON_RENEWING_PURCHASE','REFUND_REVERSED') then
  if coalesce(p_event->>'app_user_id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then raise exception 'Purchase must belong to a signed-in FirstLane account'; end if;
  uid:=(p_event->>'app_user_id')::uuid;
  if not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null) then raise exception 'Unknown or unconfirmed account'; end if;
  if (original.id is not null and original.user_id<>uid) or (lifecycle.user_id is not null and lifecycle.user_id<>uid) then raise exception 'Transaction belongs to another account'; end if;
  if exists(select 1 from firstlane_private.access_grants g where g.provider=provider_key and g.provider_transaction_id=tx and (g.user_id<>uid or g.pack_key<>offer.pack_key)) then raise exception 'Grant belongs to another account or pack'; end if;
 else uid:=coalesce(original.user_id,lifecycle.user_id);
 end if;

 if et in ('CANCELLATION','REFUND_REVERSED') then
  if coalesce(p_event->>'event_timestamp_ms','') ~ '^[0-9]{1,16}$' then
   event_time:=to_timestamp((p_event->>'event_timestamp_ms')::numeric/1000);
   if event_time<=to_timestamp(0) or event_time>now()+interval '10 minutes' then raise exception 'Invalid lifecycle event time'; end if;
  elsif et='REFUND_REVERSED' then
   -- A timestamp-less reversal cannot safely supersede a refund.
   raise exception 'Refund reversal requires a provider timestamp';
  else event_time:=now(); -- Legacy cancellation payloads remain fail-closed.
  end if;
  -- Latest provider event wins. A timestamp tie fails closed in favour of the refund.
  if lifecycle.transaction_id is not null and (event_time<lifecycle.event_at
    or (event_time=lifecycle.event_at and (et='REFUND_REVERSED' or lifecycle.status='refunded'))) then
   insert into firstlane_private.commerce_events values(eid,et,p_event,now(),'ignored_stale_lifecycle');
   return jsonb_build_object('ignored',true,'reason','stale_lifecycle');
  end if;
  insert into firstlane_private.transaction_lifecycle(store,environment,transaction_id,pack_key,user_id,status,event_at,event_id)
  values(st,env,tx,offer.pack_key,uid,case when et='CANCELLATION' then 'refunded' else 'active' end,event_time,eid)
  on conflict(store,environment,transaction_id) do update set
   user_id=coalesce(excluded.user_id,firstlane_private.transaction_lifecycle.user_id),
   status=excluded.status,event_at=excluded.event_at,event_id=excluded.event_id;
  if et='CANCELLATION' then
   insert into firstlane_private.refund_tombstones values(st,env,tx,event_time)
    on conflict(store,environment,transaction_id) do update set refunded_at=excluded.refunded_at;
   update firstlane_private.store_transactions set refunded_at=event_time where store=st and environment=env and transaction_id=tx;
   update firstlane_private.access_grants set revoked_at=event_time
    where provider=provider_key and provider_transaction_id=tx and pack_key=offer.pack_key;
  else
   delete from firstlane_private.refund_tombstones where store=st and environment=env and transaction_id=tx;
   if original.id is not null then
    update firstlane_private.store_transactions set refunded_at=null where id=original.id;
    insert into firstlane_private.access_grants(user_id,pack_key,provider,provider_transaction_id,starts_at,expires_at,revoked_at)
    values(original.user_id,original.pack_key,provider_key,tx,original.purchased_at,null,null)
    on conflict(provider,provider_transaction_id) do update set revoked_at=null,expires_at=null;
   else
    -- Out-of-order delivery: remember the reversal but do NOT mint a purchase or grant.
    -- A later original NON_RENEWING_PURCHASE validates the receipt and creates access.
    disposition:='awaiting_original_purchase';
   end if;
  end if;
 else
  if coalesce(p_event->>'purchased_at_ms','') !~ '^[0-9]{1,16}$' then raise exception 'Invalid purchase time'; end if;
  bought:=to_timestamp((p_event->>'purchased_at_ms')::numeric/1000);
  if bought<=to_timestamp(0) or bought>now()+interval '10 minutes' then raise exception 'Invalid purchase time'; end if;
  select refunded_at into refund_time from firstlane_private.refund_tombstones where store=st and environment=env and transaction_id=tx;
  if lifecycle.status='refunded' then refund_time:=lifecycle.event_at; end if;
  if lifecycle.status='active' then refund_time:=null; end if;
  insert into firstlane_private.store_transactions(user_id,pack_key,store,environment,transaction_id,purchased_at,display_price,refunded_at,event_id)
  values(uid,offer.pack_key,st,env,tx,bought,
   case when p_event->>'currency' is null then null else (p_event->>'currency')||' '||coalesce(p_event->>'price_in_purchased_currency','—') end,refund_time,eid)
  on conflict(store,environment,transaction_id) do nothing;
  if refund_time is null then
   insert into firstlane_private.access_grants(user_id,pack_key,provider,provider_transaction_id,starts_at,expires_at,revoked_at)
   values(uid,offer.pack_key,provider_key,tx,coalesce(original.purchased_at,bought),null,null)
   on conflict(provider,provider_transaction_id) do update set revoked_at=null,expires_at=null;
  end if;
 end if;
 insert into firstlane_private.commerce_events values(eid,et,p_event,now(),disposition);
 return jsonb_build_object('applied',true,'disposition',disposition);
end $$;
revoke all on function public.firstlane_apply_commerce_event(jsonb) from public,anon,authenticated;
grant execute on function public.firstlane_apply_commerce_event(jsonb) to service_role;
commit;
