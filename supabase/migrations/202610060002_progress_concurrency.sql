begin;
-- Preserve existing table names so existing accounts do not lose their data during upgrade.
revoke insert,update on public.beta_progress from authenticated;
comment on table public.beta_progress is 'Personal self-reported practice history, not an entitlement, official grade, or certification.';
create or replace function public.firstlane_save_progress(p_snapshot jsonb,p_expected_updated_at timestamptz default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); previous timestamptz; s jsonb;
begin
 if u is null then raise exception 'Sign-in required';end if;
 if jsonb_typeof(p_snapshot) is distinct from 'object' or octet_length(p_snapshot::text)>4000000 then raise exception 'Invalid progress payload';end if;
 if jsonb_typeof(p_snapshot->'sessions') is distinct from 'array' or jsonb_typeof(p_snapshot->'bookmarks') is distinct from 'array' or jsonb_typeof(p_snapshot->'bookmarkChanges') is distinct from 'object' then raise exception 'Invalid progress structure';end if;
 if jsonb_array_length(p_snapshot->'sessions')>10000 or jsonb_array_length(p_snapshot->'bookmarks')>5000 then raise exception 'Progress is too large';end if;
 for s in select value from jsonb_array_elements(p_snapshot->'sessions') loop
  if jsonb_typeof(s) is distinct from 'object' or jsonb_typeof(s->'answers') is distinct from 'array' or jsonb_typeof(s->'questionIds') is distinct from 'array' or s->>'id' is null or s->>'finishedAt' is null then raise exception 'Invalid session';end if;
  if jsonb_array_length(s->'questionIds') not between 1 and 100 or jsonb_array_length(s->'answers')<>jsonb_array_length(s->'questionIds') then raise exception 'Incomplete session';end if;
 end loop;
 perform pg_advisory_xact_lock(hashtextextended(u::text,4));
 select updated_at into previous from public.beta_progress where user_id=u for update;
 if previous is distinct from p_expected_updated_at then return jsonb_build_object('saved',false,'conflict',true);end if;
 insert into public.beta_progress(user_id,snapshot,updated_at) values(u,p_snapshot,clock_timestamp()) on conflict(user_id) do update set snapshot=excluded.snapshot,updated_at=excluded.updated_at;
 return jsonb_build_object('saved',true);
end $$;
revoke all on function public.firstlane_save_progress(jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.firstlane_save_progress(jsonb,timestamptz) to authenticated;
commit;
