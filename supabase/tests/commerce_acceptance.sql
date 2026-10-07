-- NOT EXECUTED in delivery. Run as a privileged operator in a DISPOSABLE Supabase DB
-- after ALL migrations. All fixture changes are rolled back.
begin;
set local timezone='UTC';
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
values('11111111-1111-4111-8111-111111111111','qa-a@example.test',now(),'{}'),
('22222222-2222-4222-8222-222222222222','qa-b@example.test',now(),'{}');
update firstlane_private.commerce_settings set environment='SANDBOX' where singleton;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
do $$begin
 if has_function_privilege('authenticated','public.firstlane_apply_commerce_event(jsonb)','EXECUTE') then raise exception 'Client can grant payment';end if;
 if has_table_privilege('authenticated','firstlane_private.store_transactions','INSERT') then raise exception 'Client can forge transactions';end if;
end $$;
select public.firstlane_apply_commerce_event(jsonb_build_object('id','qa-purchase-1','type','NON_RENEWING_PURCHASE',
 'app_user_id','11111111-1111-4111-8111-111111111111','store','APP_STORE','environment','SANDBOX',
 'product_id','firstlane_on_g1_lifetime','transaction_id','qa-tx-1','purchased_at_ms',floor(extract(epoch from now())*1000),
 'currency','CAD','price_in_purchased_currency',14.99));
select public.firstlane_apply_commerce_event(payload) from firstlane_private.commerce_events where event_id='qa-purchase-1';
do $$begin
 if (select count(*) from firstlane_private.store_transactions where transaction_id='qa-tx-1')<>1 then raise exception 'Duplicate transaction';end if;
 if not exists(select 1 from firstlane_private.access_grants where provider_transaction_id='qa-tx-1' and expires_at is null and revoked_at is null) then raise exception 'Lifetime grant missing';end if;
 if (public.firstlane_my_access('CA-ON-G1')->'paid')='null'::jsonb then raise exception 'Payer not unlocked';end if;
end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$begin
 if public.firstlane_my_access('CA-ON-G1')->'paid'<>'null'::jsonb then raise exception 'Account B sees account A purchase';end if;
 if exists(select 1 from public.firstlane_my_receipts()) then raise exception 'Account B sees account A receipts';end if;
end $$;
select public.firstlane_apply_commerce_event('{"id":"qa-refund-1","type":"CANCELLATION","store":"APP_STORE","environment":"SANDBOX","product_id":"firstlane_on_g1_lifetime","transaction_id":"qa-tx-1"}'::jsonb);
select public.firstlane_apply_commerce_event(payload) from firstlane_private.commerce_events where event_id='qa-purchase-1';
do $$begin if exists(select 1 from firstlane_private.access_grants where provider_transaction_id='qa-tx-1' and revoked_at is null) then raise exception 'Refunded transaction regranted';end if;end $$;
select public.firstlane_apply_commerce_event('{"id":"qa-refund-2","type":"CANCELLATION","store":"PLAY_STORE","environment":"SANDBOX","product_id":"firstlane_on_g1_lifetime","transaction_id":"qa-tx-2"}'::jsonb);
select public.firstlane_apply_commerce_event(jsonb_build_object('id','qa-purchase-2','type','NON_RENEWING_PURCHASE',
 'app_user_id','22222222-2222-4222-8222-222222222222','store','PLAY_STORE','environment','SANDBOX',
 'product_id','firstlane_on_g1_lifetime','transaction_id','qa-tx-2','purchased_at_ms',floor(extract(epoch from now())*1000)));
do $$begin if exists(select 1 from firstlane_private.access_grants where provider_transaction_id='qa-tx-2' and revoked_at is null) then raise exception 'Refund tombstone ignored';end if;end $$;
select public.firstlane_apply_commerce_event('{"id":"qa-wrong-environment","type":"NON_RENEWING_PURCHASE","store":"APP_STORE","environment":"PRODUCTION","product_id":"firstlane_on_g1_lifetime","transaction_id":"qa-wrong"}'::jsonb);
do $$begin if exists(select 1 from firstlane_private.store_transactions where transaction_id='qa-wrong') then raise exception 'Cross-environment grant';end if;end $$;
rollback;
