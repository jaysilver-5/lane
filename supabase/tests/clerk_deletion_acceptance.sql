-- Synthetic fixtures only. Never commits an account, purchase, grant or event.
begin;
do $$
declare
 issuer text := 'https://deletion-acceptance.firstlane.test';
 suffix text := replace(gen_random_uuid()::text,'-','');
 subject_a text; subject_b text; account_a uuid; account_b uuid;
 fixture_checkout_id uuid := gen_random_uuid(); fixture_transaction_id text;
 payment_environment text; result jsonb;
begin
 subject_a := 'user_DeleteA'||suffix; subject_b := 'user_DeleteB'||suffix;
 fixture_transaction_id := 'qa_delete_'||suffix;
 account_a := (public.firstlane_bind_clerk_account(issuer,subject_a,'sess_A'||suffix,'a@example.test','A',now()+interval '60 seconds')->>'id')::uuid;
 account_b := (public.firstlane_bind_clerk_account(issuer,subject_b,'sess_B'||suffix,'b@example.test','B',now()+interval '60 seconds')->>'id')::uuid;
 insert into public.beta_profiles(user_id,display_name) values(account_a,'A'),(account_b,'B');
 insert into public.beta_progress(user_id,snapshot) values(account_a,'{"sessions":[],"bookmarks":[],"bookmarkChanges":{}}'),(account_b,'{"sessions":[],"bookmarks":[],"bookmarkChanges":{}}');
 insert into public.beta_reports(id,user_id,message) values(gen_random_uuid(),account_b,'Synthetic deletion acceptance fixture.');
 select environment into payment_environment from firstlane_private.paddle_settings where singleton;
 insert into firstlane_private.paddle_checkouts(id,user_id,environment,transaction_id,status) values(fixture_checkout_id,account_b,payment_environment,fixture_transaction_id,'completed');
 insert into firstlane_private.paddle_transactions(transaction_id,user_id,environment,checkout_id,purchased_at) values(fixture_transaction_id,account_b,payment_environment,fixture_checkout_id,now());
 insert into firstlane_private.access_grants(user_id,pack_key,provider,provider_transaction_id,starts_at) values(account_b,'CA-ON-G1','paddle:'||payment_environment,fixture_transaction_id,now());

 result := public.firstlane_delete_clerk_account(issuer,subject_b);
 if result->>'disabled'<>'true' then raise exception 'Deletion was not confirmed';end if;
 if not exists(select 1 from firstlane_private.accounts where id=account_b and deleted_at is not null and not verified and email='' and display_name='') then raise exception 'Identity tombstone contains personal profile fields or is active';end if;
 if exists(select 1 from firstlane_private.account_sessions where account_id=account_b)
    or exists(select 1 from public.beta_profiles where user_id=account_b)
    or exists(select 1 from public.beta_progress where user_id=account_b)
    or exists(select 1 from public.beta_reports where user_id=account_b)
    or exists(select 1 from firstlane_private.access_grants where user_id=account_b) then raise exception 'Deleted account retained study data, sessions or access';end if;
 if not exists(select 1 from firstlane_private.paddle_checkouts where id=fixture_checkout_id and user_id is null)
    or not exists(select 1 from firstlane_private.paddle_transactions p where p.transaction_id=fixture_transaction_id and p.user_id is null) then raise exception 'Financial records were lost or remained linked to the deleted account';end if;
 if not exists(select 1 from public.beta_profiles where user_id=account_a and display_name='A')
    or not exists(select 1 from public.beta_progress where user_id=account_a)
    or not exists(select 1 from firstlane_private.account_sessions where account_id=account_a) then raise exception 'Another account changed during deletion';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('iss',issuer,'sub',subject_b,'sid','sess_B'||suffix)::text,true);
 if public.firstlane_current_account() is not null then raise exception 'Old deleted-account session retained ownership';end if;
 result := public.firstlane_delete_clerk_account(issuer,subject_b);
 if result->>'disabled'<>'true' then raise exception 'Retry was not idempotent';end if;
 begin
  perform public.firstlane_bind_clerk_account(issuer,subject_b,'sess_New'||suffix,'b@example.test','B',now()+interval '60 seconds');
  raise exception 'Deleted account reopened';
 exception when others then if sqlerrm='Deleted account reopened' then raise;end if;end;
end $$;
rollback;
