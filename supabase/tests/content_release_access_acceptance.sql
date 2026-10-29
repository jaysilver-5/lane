-- Database authorization only. Synthetic identities/grants/publication, always rolled back.
-- Does not claim a real Clerk session, payment, signed storage download or customer acceptance.
begin;
create temporary table content_release_fixture(id uuid, baseline jsonb);
insert into content_release_fixture(id,baseline)
select (public.firstlane_bind_clerk_account('https://content-acceptance.firstlane.test','user_ContentAcceptance','sess_ContentAcceptance','content-acceptance@firstlane.test','Synthetic content acceptance',now()+interval '60 seconds')->>'id')::uuid,
 (select jsonb_build_object('version',version,'storage_path',storage_path,'sha256',sha256,'bytes',bytes,'question_count',question_count) from firstlane_private.content_releases where pack_key='CA-ON-G1' and approved and published_at<=now() order by published_at desc limit 1);
grant select on content_release_fixture to authenticated;
select set_config('request.jwt.claims','{"iss":"https://content-acceptance.firstlane.test","sub":"user_ContentAcceptance","sid":"sess_ContentAcceptance","role":"authenticated"}',true);
set local role authenticated;
do $$begin
 begin
  perform public.firstlane_content_release();
  raise exception 'Free account received private release';
 exception when others then if sqlerrm<>'Purchase required' then raise;end if;end;
end $$;
reset role;
insert into firstlane_private.access_grants(user_id,pack_key,provider,provider_transaction_id,starts_at)
select id,'CA-ON-G1','rollback-acceptance-fixture','content-boundary-20261024',now()-interval '1 minute' from content_release_fixture;
insert into firstlane_private.content_releases(pack_key,version,storage_path,sha256,bytes,question_count,approved,approved_by,approved_at,published_at)
values('CA-ON-G1','qa-rollback-content-boundary-20261024','qa-rollback-fixture-not-a-real-file.json',repeat('a',64),500,500,true,'ROLLBACK FIXTURE ONLY',now(),now()+interval '1 day');
set local role authenticated;
do $$begin
 if public.firstlane_content_release() is distinct from (select baseline from content_release_fixture) then raise exception 'Future release was selected';end if;
end $$;
reset role;
update firstlane_private.content_releases set published_at=now() where version='qa-rollback-content-boundary-20261024';
set local role authenticated;
do $$declare result jsonb;begin
 result:=public.firstlane_content_release();
 if result->>'version'<>'qa-rollback-content-boundary-20261024' or result->>'question_count'<>'500' or result->>'sha256'<>repeat('a',64) then raise exception 'Approved release metadata not returned to its paid owner';end if;
end $$;
reset role;
update firstlane_private.content_releases set approved=false where version='qa-rollback-content-boundary-20261024';
set local role authenticated;
do $$begin
 if public.firstlane_content_release() is distinct from (select baseline from content_release_fixture) then raise exception 'Unapproved release was selected';end if;
end $$;
reset role;
update firstlane_private.access_grants set revoked_at=now() where provider='rollback-acceptance-fixture' and provider_transaction_id='content-boundary-20261024';
set local role authenticated;
do $$begin
 begin perform public.firstlane_content_release();raise exception 'Revoked grant received private release';
 exception when others then if sqlerrm<>'Purchase required' then raise;end if;end;
end $$;
reset role;
update firstlane_private.access_grants set revoked_at=null,expires_at=now()-interval '1 second' where provider='rollback-acceptance-fixture' and provider_transaction_id='content-boundary-20261024';
set local role authenticated;
do $$begin
 begin perform public.firstlane_content_release();raise exception 'Expired grant received private release';
 exception when others then if sqlerrm<>'Purchase required' then raise;end if;end;
end $$;
select set_config('request.jwt.claims','{"iss":"https://content-acceptance.firstlane.test","sub":"user_ContentAcceptance","sid":"sess_WrongSession","role":"authenticated"}',true);
do $$begin
 begin perform public.firstlane_content_release();raise exception 'Wrong session received private release';
 exception when others then if sqlerrm<>'Verified sign-in required' then raise;end if;end;
end $$;
reset role;
do $$begin
 if has_function_privilege('anon','public.firstlane_content_release(text)','execute') then raise exception 'Anonymous release RPC execution exposed';end if;
 if has_table_privilege('authenticated','firstlane_private.content_releases','select') or has_table_privilege('anon','firstlane_private.content_releases','select') then raise exception 'Private release registry exposed';end if;
 raise notice 'PASS: free/paid, approval, future publication, revoked/expired grants, wrong session, anonymous and private-registry boundaries';
end $$;
rollback;
