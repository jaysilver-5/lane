-- Current web schema: verified mapping, actual RLS, session and deletion isolation.
begin;
create temporary table clerk_fixtures(name text,id uuid);
insert into clerk_fixtures values
 ('a',(public.firstlane_bind_clerk_account('https://clerk.test','user_A','sess_A','a@firstlane.test','A',now()+interval '60 seconds')->>'id')::uuid),
 ('b',(public.firstlane_bind_clerk_account('https://clerk.test','user_B','sess_B','b@firstlane.test','B',now()+interval '60 seconds')->>'id')::uuid);
grant select on clerk_fixtures to authenticated;
insert into public.beta_profiles(user_id,display_name) select id,name from clerk_fixtures;
insert into public.beta_progress(user_id,snapshot) select id,'{"sessions":[],"bookmarks":[],"bookmarkChanges":{}}'::jsonb from clerk_fixtures;
set local role authenticated;
select set_config('request.jwt.claims','{"iss":"https://clerk.test","sub":"user_A","sid":"sess_A","role":"authenticated"}',true);
do $$
declare a uuid:=(select id from clerk_fixtures where name='a'); b uuid:=(select id from clerk_fixtures where name='b'); n integer;
begin
 if public.firstlane_current_account()<>a then raise exception 'Wrong mapped account';end if;
 if (select count(*) from public.beta_profiles)<>1 or (select count(*) from public.beta_progress)<>1 then raise exception 'RLS leaked another account';end if;
 update public.beta_profiles set display_name='wrong' where user_id=b;
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Cross-account update';end if;
 begin
  insert into public.beta_reports(id,user_id,message) values(gen_random_uuid(),b,'This must not reach another account.');
  raise exception 'Cross-account report accepted';
 exception when insufficient_privilege then null;end;
 if has_function_privilege('authenticated','public.firstlane_bind_clerk_account(text,text,text,text,text,timestamptz)','execute') or has_function_privilege('authenticated','public.firstlane_delete_clerk_account(text,text)','execute') then raise exception 'Identity mutation exposed';end if;
 if public.firstlane_save_progress('{"sessions":[],"bookmarks":[],"bookmarkChanges":{}}',(select updated_at from public.beta_progress where user_id=a))->>'saved'<>'true' then raise exception 'Progress save failed';end if;
end $$;
-- A valid subject from another issuer, another session, and legacy tokens get no ownership.
select set_config('request.jwt.claims','{"iss":"https://evil.test","sub":"user_A","sid":"sess_A"}',true);
do $$begin if public.firstlane_current_account() is not null or exists(select 1 from public.beta_profiles) then raise exception 'Wrong issuer accepted';end if;end $$;
select set_config('request.jwt.claims','{"iss":"https://clerk.test","sub":"user_A","sid":"sess_B"}',true);
do $$begin if public.firstlane_current_account() is not null then raise exception 'Wrong session accepted';end if;end $$;
select set_config('request.jwt.claims','{"iss":"supabase","sub":"00000000-0000-0000-0000-000000000001"}',true);
do $$begin if public.firstlane_current_account() is not null then raise exception 'Legacy session accepted';end if;end $$;
reset role;
update firstlane_private.account_sessions set expires_at=now()-interval '1 second' where subject='user_A';
select set_config('request.jwt.claims','{"iss":"https://clerk.test","sub":"user_A","sid":"sess_A"}',true);
do $$begin if public.firstlane_current_account() is not null then raise exception 'Stale verification accepted';end if;end $$;
select public.firstlane_delete_clerk_account('https://clerk.test','user_B');
do $$begin
 begin
  perform public.firstlane_bind_clerk_account('https://clerk.test','user_B','sess_New','b@firstlane.test','B',now()+interval '60 seconds');
  raise exception 'Deleted account reopened';
 exception when others then if sqlerrm='Deleted account reopened' then raise;end if;end;
 if exists(select 1 from public.beta_profiles where user_id=(select id from clerk_fixtures where name='b')) then raise exception 'Deleted profile retained';end if;
end $$;
rollback;
