-- Run only on the new sandbox project. Every fixture is rolled back.
begin;
do $$
declare
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); ca jsonb; cb jsonb; event jsonb; refund jsonb; result jsonb;
 tx text:='txn_'||repeat('a',26); txb text:='txn_'||repeat('b',26);
begin
 if (select environment from firstlane_private.paddle_settings where singleton)<>'sandbox' then raise exception 'Sandbox only'; end if;
 if has_function_privilege('authenticated','public.firstlane_paddle_reserve(uuid,text)','EXECUTE') or has_function_privilege('anon','public.firstlane_apply_paddle_event(jsonb)','EXECUTE') then raise exception 'Commerce exposed to clients'; end if;
 insert into firstlane_private.accounts(id,issuer,subject,email,verified) values(a,'https://clerk.test','user_A',a::text||'@firstlane.test',true),(b,'https://clerk.test','user_B',b::text||'@firstlane.test',true);
 ca:=public.firstlane_paddle_reserve(a,'sandbox');
 result:=public.firstlane_paddle_reserve(a,'sandbox');
 if ca->>'id'<>result->>'id' or (result->>'fresh')::boolean then raise exception 'Checkout reservation was duplicated'; end if;
 perform public.firstlane_paddle_attach((ca->>'id')::uuid,tx,'ready');
 event:=jsonb_build_object('id','evt_'||repeat('a',26),'type','transaction.completed','environment','sandbox','occurred_at',now()-interval '2 minutes','transaction_id',tx,'checkout_id',ca->>'id','user_id',a,'currency','CAD','amount_minor',1499,'purchased_at',now()-interval '3 minutes','adjustment',null);
 perform public.firstlane_apply_paddle_event(event);
 if not exists(select 1 from firstlane_private.access_grants where user_id=a and provider='paddle:sandbox' and revoked_at is null) then raise exception 'Purchase did not unlock'; end if;
 result:=public.firstlane_apply_paddle_event(event);
 if result->>'duplicate'<>'true' then raise exception 'Event replay not deduplicated'; end if;
 begin
  perform public.firstlane_apply_paddle_event(event||jsonb_build_object('user_id',b));
  raise exception 'Conflicting replay accepted';
 exception when others then if sqlerrm='Conflicting replay accepted' then raise; end if; end;
 perform public.firstlane_paddle_attach((ca->>'id')::uuid,tx,'ready');
 if (select status from firstlane_private.paddle_checkouts where id=(ca->>'id')::uuid)<>'completed' then raise exception 'Late attach regressed completion'; end if;
 refund:=event||jsonb_build_object('id','evt_'||repeat('c',26),'type','adjustment.created','occurred_at',now()-interval '1 minute','adjustment',jsonb_build_object('id','adj_'||repeat('c',26),'action','refund','status','pending_approval'));
 perform public.firstlane_apply_paddle_event(refund);
 if exists(select 1 from firstlane_private.access_grants where user_id=a and revoked_at is not null) then raise exception 'Pending refund revoked access'; end if;
 -- Same provider timestamp, approval must win over pending.
 refund:=refund||jsonb_build_object('id','evt_'||repeat('d',26),'type','adjustment.updated','adjustment',jsonb_build_object('id','adj_'||repeat('c',26),'action','refund','status','approved'));
 perform public.firstlane_apply_paddle_event(refund);
 if exists(select 1 from firstlane_private.access_grants where user_id=a and revoked_at is null) then raise exception 'Approved refund left access'; end if;
 cb:=public.firstlane_paddle_reserve(b,'sandbox');
 event:=event||jsonb_build_object('id','evt_'||repeat('e',26),'transaction_id',txb,'checkout_id',cb->>'id','user_id',b);
 refund:=event||jsonb_build_object('id','evt_'||repeat('f',26),'type','adjustment.created','adjustment',jsonb_build_object('id','adj_'||repeat('f',26),'action','refund','status','approved'));
 perform public.firstlane_apply_paddle_event(refund);
 if exists(select 1 from firstlane_private.access_grants where user_id=b) then raise exception 'Adjustment alone minted a purchase'; end if;
 perform public.firstlane_apply_paddle_event(event);
 if exists(select 1 from firstlane_private.access_grants where user_id=b and revoked_at is null) then raise exception 'Late purchase bypassed refund'; end if;
 -- Each authenticated account sees only its own receipt and access.
 insert into firstlane_private.account_sessions values('https://clerk.test','sess_A','user_A',a,now()+interval '60 seconds'); perform set_config('request.jwt.claims','{"iss":"https://clerk.test","sub":"user_A","sid":"sess_A"}',true);
 if (select count(*) from public.firstlane_my_receipts())<>1 then raise exception 'Receipt ownership failed'; end if;
 if public.firstlane_my_access()->'paid'<>'null'::jsonb then raise exception 'Revoked access was returned'; end if;
 raise notice 'PASS: reservations, owner isolation, deduplication, price contract, refunds and out-of-order events';
end $$;
rollback;
