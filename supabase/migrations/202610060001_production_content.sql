begin;
create table firstlane_private.content_releases (
 pack_key text not null references firstlane_private.pack_offers(pack_key), version text not null,
 storage_path text unique not null, sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 bytes integer not null check(bytes between 1 and 15000000), question_count integer not null check(question_count=500),
 approved boolean not null default false, approved_by text, approved_at timestamptz,
 published_at timestamptz, primary key(pack_key,version),
 check(not approved or (approved_by is not null and approved_at is not null))
);
alter table firstlane_private.content_releases enable row level security;
revoke all on firstlane_private.content_releases from public,anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('content-releases','content-releases',false,15000000,array['application/json'])
 on conflict(id) do update set public=false,file_size_limit=15000000,allowed_mime_types=array['application/json'];
-- No anon/authenticated storage policies: only short-lived, server-issued URLs can download a release.
create or replace function public.firstlane_content_release(p_pack_key text default 'CA-ON-G1')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid := auth.uid(); result jsonb;
begin
 if u is null or not exists(select 1 from auth.users where id=u and email_confirmed_at is not null) then raise exception 'Verified sign-in required';end if;
 if not exists(select 1 from firstlane_private.access_grants where user_id=u and pack_key=p_pack_key and revoked_at is null and starts_at<=now() and (expires_at is null or expires_at>now())) then raise exception 'Purchase required';end if;
 select jsonb_build_object('version',r.version,'storage_path',r.storage_path,'sha256',r.sha256,'bytes',r.bytes,'question_count',r.question_count)
 into result from firstlane_private.content_releases r where r.pack_key=p_pack_key and r.approved and r.published_at<=now() order by r.published_at desc limit 1;
 return result;
end $$;
revoke all on function public.firstlane_content_release(text) from public,anon,authenticated;
grant execute on function public.firstlane_content_release(text) to authenticated;
commit;
