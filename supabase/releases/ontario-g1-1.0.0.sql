-- Release data, not a schema migration.
-- Run only AFTER downloading the private uploaded object and verifying:
-- SHA-256 21bf800ca3444d2a0a730eb164f9413b74a9f102b6400a956f92cd3b96fd9261
-- 1,333,762 bytes; 500 approved exact revisions; version 1.0.0.
-- Owner acceptance: content/approvals/owner-2026-10-24.json.
begin;
do $$begin
 if not exists(select 1 from storage.buckets where id='content-releases' and public=false) then raise exception 'Expected private content bucket';end if;
 if not exists(select 1 from storage.objects where bucket_id='content-releases' and name='ontario-g1-1.0.0-21bf800c.json' and (metadata->>'size')::bigint=1333762 and metadata->>'mimetype'='application/json') then raise exception 'Verified release object is missing or its metadata differs';end if;
 if exists(select 1 from firstlane_private.content_releases where pack_key='CA-ON-G1' and version='1.0.0' and (storage_path,sha256,bytes,question_count) is distinct from ('ontario-g1-1.0.0-21bf800c.json','21bf800ca3444d2a0a730eb164f9413b74a9f102b6400a956f92cd3b96fd9261',1333762,500)) then raise exception 'Immutable release version already has different content';end if;
end $$;
insert into firstlane_private.content_releases(pack_key,version,storage_path,sha256,bytes,question_count,approved,approved_by,approved_at,published_at)
values('CA-ON-G1','1.0.0','ontario-g1-1.0.0-21bf800c.json','21bf800ca3444d2a0a730eb164f9413b74a9f102b6400a956f92cd3b96fd9261',1333762,500,true,'Joshua (FirstLane owner); accepted Codex AI editorial review; receipt firstlane-content-owner-2026-10-24','2026-10-24T16:54:58Z',now())
on conflict(pack_key,version) do nothing;
do $$begin
 if not exists(select 1 from firstlane_private.content_releases where pack_key='CA-ON-G1' and version='1.0.0' and approved and published_at<=now()) then raise exception 'Release was not published';end if;
end $$;
commit;
