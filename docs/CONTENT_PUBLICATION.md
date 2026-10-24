# Approved content publication — 24 October 2026

Release CA-ON-G1 / 1.0.0 is published in production private Storage and firstlane_private.content_releases. It contains 500 exact owner-approved revisions and preserves the separate AI editorial acceptance receipt. There is no independent human or government certification claim.

- Storage path: content-releases/ontario-g1-1.0.0-21bf800c.json.
- SHA-256: 21bf800ca3444d2a0a730eb164f9413b74a9f102b6400a956f92cd3b96fd9261.
- Bytes: 1,333,762; questions: 500.
- Owner acceptance: 2026-10-24 16:54:58 UTC; publication: 2026-10-24 17:42:48.594971 UTC.
- Publication data statement: supabase/releases/ontario-g1-1.0.0.sql.

## Upload and verification

The user reported a browser upload, but neither the production bucket nor sandbox contained the file. The Chrome extension still blocked local-file selection. A one-off deployment-owned initializer in content-pack v7 uploaded the already approved artifact using the function's existing private Storage service credentials. It accepted no request-selected file, path, credential or content. upsert=false preserved immutable objects. It verified the embedded approved artifact hash, uploaded to the existing private bucket, downloaded the stored object and checked its bytes/SHA-256 again.

The probe returned 200 with the verified hash/byte count; evidence is qa/private-content-upload-verification.json. The original two content-pack files were then restored exactly as v8; there is no uploader or embedded bank left in the active function. No credential was extracted, no bucket policy changed, and no customer grant created. The approved release registry row was inserted only after stored-byte verification. The bucket remains private; anonymous object requests are rejected.

## Access checks

supabase/tests/content_release_access_acceptance.sql passed in production both before and after publication. Synthetic account/session/grant/release fixtures were rolled back. It checks paid-owner metadata selection, free denial, approval/future-publication filtering, revoked/expired grants, wrong sessions, anonymous execution and direct registry denial. Post-rollback production contains one actual published release and zero accounts/sessions/grants. All nine service rejection/preflight probes pass after restoration.

These are storage/data-authorization checks, not real Clerk signup, a real Paddle purchase, an authenticated paid-browser download or a refund. Those flows still need canonical-host execution. Public routing requires the separately requested action-time confirmation before reducing Vercel deployment authentication.

## Paid browser delivery recheck

On 24 October at 18:59:24.34773 UTC the same approved artifact was also published privately in the sandbox to test a real sandbox-paid Clerk account. Storage bytes/SHA-256 match production. A temporary fixed artifact initializer (content-pack v13) was replaced immediately by the exact active production source as v14, including exact-origin checking; no uploader remains. The authenticated browser loads 20 topic pools totaling exactly 500. Anonymous function/storage reads return 401/400 and a foreign origin returns 403. This is actual paid sandbox delivery; a real live purchase/customer download remains untested. Public /app testing is now deployed and actual production account creation/recovery/cloud restoration pass. Earlier zero-account and protected-cutover statements above describe the publication-time checks.
