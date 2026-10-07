-- NOT EXECUTED IN THIS DELIVERY. Disposable Supabase database only, after ALL migrations.
-- Every fixture change is rolled back. Actual App Store / RevenueCat delivery needs separate QA.
begin;
set local timezone='UTC';
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
values('33333333-3333-4333-8333-333333333333','refund-qa-a@example.test',now(),'{}'),
('44444444-4444-4444-8444-444444444444','refund-qa-b@example.test',now(),'{}');
update firstlane_private.commerce_settings set environment='SANDBOX' where singleton;
do $$
declare
 a text:='33333333-3333-4333-8333-333333333333'; b text:='44444444-4444-4444-8444-444444444444';
 ts bigint:=floor(extract(epoch from now()-interval '1 hour')*1000);
 base jsonb; reversal jsonb; rejected boolean:=false;
begin
 if has_function_privilege('authenticated','public.firstlane_apply_commerce_event(jsonb)','EXECUTE') then raise exception 'Client can grant access'; end if;
 if has_table_privilege('authenticated','firstlane_private.transaction_lifecycle','INSERT') then raise exception 'Client can forge lifecycle'; end if;
 base:=jsonb_build_object('store','APP_STORE','environment','SANDBOX','app_user_id',a,
 'product_id','firstlane_on_g1_lifetime','transaction_id','qa-reversal-tx','purchased_at_ms',ts,
 'currency','CAD','price_in_purchased_currency',14.99);
 perform public.firstlane_apply_commerce_event(base||jsonb_build_object('id','qa-r-purchase','type','NON_RENEWING_PURCHASE','event_timestamp_ms',ts));
 perform public.firstlane_apply_commerce_event(base||jsonb_build_object('id','qa-r-refund','type','CANCELLATION','event_timestamp_ms',ts+1000));
 if exists(select 1 from firstlane_private.access_grants where provider_transaction_id='qa-reversal-tx' and revoked_at is null) then raise exception 'Refund did not revoke'; end if;
 reversal:=base||jsonb_build_object('id','qa-r-reversed','type','REFUND_REVERSED','event_timestamp_ms',ts+2000);
 perform public.firstlane_apply_commerce_event(reversal);
 perform public.firstlane_apply_commerce_event(reversal); -- idempotent replay
 if exists(select 1 from firstlane_private.refund_tombstones where transaction_id='qa-reversal-tx') then raise exception 'Tombstone not cleared'; end if;
 if not exists(select 1 from firstlane_private.store_transactions where transaction_id='qa-reversal-tx' and refunded_at is null and purchased_at=to_timestamp(ts::numeric/1000)) then raise exception 'Original receipt not restored'; end if;
 if (select count(*) from firstlane_private.access_grants where provider_transaction_id='qa-reversal-tx' and revoked_at is null)<>1 then raise exception 'Grant missing or duplicated'; end if;
 -- A fresh event id carrying an OLD refund must not undo a newer reversal.
 perform public.firstlane_apply_commerce_event(base||jsonb_build_object('id','qa-r-refund-stale','type','CANCELLATION','event_timestamp_ms',ts+1000));
 if exists(select 1 from firstlane_private.refund_tombstones where transaction_id='qa-reversal-tx') then raise exception 'Stale refund overrode reversal'; end if;
 -- A genuine later refund wins; stale reversal cannot restore access.
 perform public.firstlane_apply_commerce_event(base||jsonb_build_object('id','qa-r-refund-new','type','CANCELLATION','event_timestamp_ms',ts+3000));
 perform public.firstlane_apply_commerce_event(base||jsonb_build_object('id','qa-r-reversal-stale','type','REFUND_REVERSED','event_timestamp_ms',ts+2000));
 if exists(select 1 from firstlane_private.access_grants where provider_transaction_id='qa-reversal-tx' and revoked_at is null) then raise exception 'Stale reversal overrode refund'; end if;
 -- A wrong owner cannot reclaim the transaction.
 begin
  perform public.firstlane_apply_commerce_event(base||jsonb_build_object('id','qa-r-wrong-owner','type','REFUND_REVERSED','app_user_id',b,'event_timestamp_ms',ts+4000));
 exception when others then rejected:=true; end;
 if not rejected then raise exception 'Cross-account reversal accepted'; end if;
 -- Exact event IDs cannot be reused with a different payload.
 rejected:=false;
 begin perform public.firstlane_apply_commerce_event(reversal||jsonb_build_object('app_user_id',b));
 exception when others then rejected:=true; end;
 if not rejected then raise exception 'Conflicting replay accepted'; end if;
 -- Equal timestamps fail closed: refund wins over reversal.
 perform public.firstlane_apply_commerce_event(base||jsonb_build_object('id','qa-r-tied-reversal','type','REFUND_REVERSED','event_timestamp_ms',ts+3000));
 if exists(select 1 from firstlane_private.access_grants where provider_transaction_id='qa-reversal-tx' and revoked_at is null) then raise exception 'Tied reversal reopened grant'; end if;
 -- Reversal before original purchase records state but cannot create a transaction/grant.
 base:=base||jsonb_build_object('transaction_id','qa-early-reversal-tx');
 perform public.firstlane_apply_commerce_event(base||jsonb_build_object('id','qa-early-refund','type','CANCELLATION','event_timestamp_ms',ts+1000));
 perform public.firstlane_apply_commerce_event(base||jsonb_build_object('id','qa-early-reversal','type','REFUND_REVERSED','event_timestamp_ms',ts+2000));
 if exists(select 1 from firstlane_private.access_grants where provider_transaction_id='qa-early-reversal-tx') then raise exception 'Reversal alone minted grant'; end if;
 perform public.firstlane_apply_commerce_event(base||jsonb_build_object('id','qa-late-purchase','type','NON_RENEWING_PURCHASE','event_timestamp_ms',ts));
 if not exists(select 1 from firstlane_private.access_grants where provider_transaction_id='qa-early-reversal-tx' and revoked_at is null) then raise exception 'Late original receipt did not restore'; end if;
 -- Unsupported store / environment cannot change the matching App Store lifecycle.
 perform public.firstlane_apply_commerce_event(base||jsonb_build_object('id','qa-play-reversal','type','REFUND_REVERSED','store','PLAY_STORE','event_timestamp_ms',ts+3000));
 perform public.firstlane_apply_commerce_event(base||jsonb_build_object('id','qa-prod-reversal','type','REFUND_REVERSED','environment','PRODUCTION','event_timestamp_ms',ts+3000));
 if exists(select 1 from firstlane_private.transaction_lifecycle where transaction_id='qa-early-reversal-tx' and (store='PLAY_STORE' or environment='PRODUCTION')) then raise exception 'Unsupported scope accepted'; end if;
end $$;
rollback;
