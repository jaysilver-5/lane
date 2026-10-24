-- Disposable database-only identity and progress; every write is rolled back.
begin;
do $$
declare actor uuid; subject text:='user_ContinuousQA'||replace(gen_random_uuid()::text,'-',''); sid text:='sess_ContinuousQA'||replace(gen_random_uuid()::text,'-','');
begin
 insert into firstlane_private.accounts(issuer,subject,email,verified)
 values('https://keep-going-qa.invalid',subject,'continuous-qa@example.invalid',true) returning id into actor;
 insert into firstlane_private.account_sessions(issuer,session_id,subject,account_id,expires_at)
 values('https://keep-going-qa.invalid',sid,subject,actor,now()+interval '5 minutes');
 perform set_config('request.jwt.claims',jsonb_build_object('iss','https://keep-going-qa.invalid','sub',subject,'sid',sid,'role','authenticated')::text,true);
end $$;
set local role authenticated;
do $$
declare payload jsonb; attempt jsonb; ids jsonb; answers jsonb; result jsonb; stamp timestamptz; failed boolean;
begin
 select jsonb_agg('qa-question'::text),jsonb_agg(jsonb_build_object('id',gen_random_uuid(),'questionId','qa-question','revisionId','qa-revision','conceptId','qa-concept','optionId','qa-option','correct',true,'section','road_signs','topic','QA','at',now()))
 into ids,answers from generate_series(1,125);
 attempt:=jsonb_build_object('id',gen_random_uuid(),'title','Keep going','mode','quick','continuous',true,'startedAt',now(),'finishedAt',now(),'index',124,'questionIds',ids,'answers',answers);
 payload:=jsonb_build_object('sessions',jsonb_build_array(attempt),'bookmarks','[]'::jsonb,'bookmarkChanges','{}'::jsonb);
 result:=public.firstlane_save_progress(payload,null);
 assert result->>'saved'='true','125-answer continuous session did not save';
 assert (select jsonb_array_length(snapshot->'sessions'->0->'answers')=125 from public.beta_progress where user_id=public.firstlane_current_account()),'long session did not round-trip through RLS';
 select updated_at into stamp from public.beta_progress where user_id=public.firstlane_current_account();

 failed:=false;
 begin
  perform public.firstlane_save_progress(jsonb_set(payload,'{sessions,0,continuous}','false'::jsonb),stamp);
 exception when others then if sqlerrm<>'Incomplete session' then raise;end if;failed:=true;end;
 assert failed,'fixed sessions bypassed the existing length bound';

 failed:=false;
 begin
  perform public.firstlane_save_progress(jsonb_set(payload,'{sessions,0,continuous}','"true"'::jsonb),stamp);
 exception when others then if sqlerrm<>'Incomplete session' then raise;end if;failed:=true;end;
 assert failed,'string continuous flag was accepted';

 failed:=false;
 begin
  perform public.firstlane_save_progress(jsonb_set(payload,'{sessions,0,mode}','"mock"'::jsonb),stamp);
 exception when others then if sqlerrm<>'Incomplete session' then raise;end if;failed:=true;end;
 assert failed,'continuous rehearsal was accepted';

 failed:=false;
 begin
  perform public.firstlane_save_progress(jsonb_set(payload,'{sessions,0,answers}',answers-124),stamp);
 exception when others then if sqlerrm<>'Incomplete session' then raise;end if;failed:=true;end;
 assert failed,'unanswered questions counted as a completed session';

 result:=public.firstlane_save_progress(payload,null);
 assert result->>'conflict'='true' and result->>'saved'='false','stale progress overwrote a newer snapshot';

 failed:=false;
 begin
  perform public.firstlane_save_progress(jsonb_set(payload,'{padding}',to_jsonb(repeat('x',4000000))),stamp);
 exception when others then if sqlerrm<>'Invalid progress payload' then raise;end if;failed:=true;end;
 assert failed,'payload resource bound was removed';

 perform set_config('request.jwt.claims','{}',true);
 failed:=false;
 begin
  perform public.firstlane_save_progress(payload,null);
 exception when others then if sqlerrm<>'Sign-in required' then raise;end if;failed:=true;end;
 assert failed,'an unbound identity saved progress';
 assert not has_function_privilege('anon','public.firstlane_save_progress(jsonb,timestamptz)','execute'),'anonymous execute permission widened';
end $$;
rollback;
select jsonb_build_object('passed',true,'checks',10,'writes_persisted',false) as continuous_practice_acceptance;
