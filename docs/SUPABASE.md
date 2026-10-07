# Supabase — FirstLane 0.4.0

Supabase owns FirstLane identity, synced practice history, account-scoped access queries and the server-side commerce mirror. RevenueCat/store events feed that mirror. The client waits for the mirror before granting paid access and downloading protected content.

## Setup order

Use separate staging/sandbox and production projects. Back up existing databases and apply migrations in tracked filename order:

```text
202610030001_internal_beta.sql
202610030002_access_and_billing.sql
202610060001_production_content.sql
202610060002_progress_concurrency.sql
202610060003_offer_cad1499.sql
```

Apply only missing migrations to a reviewed project in filename order. The private schema and RPC names use the finalized FirstLane namespace. Do not expose `firstlane_private` through the Data API.

Configure email/password authentication, confirmation and recovery callbacks for the `firstlane` app scheme, SMTP, and production support/policy URLs. Test deep links in installed builds. Put only public client settings in `.env.local` / EAS public variables.

## Edge Functions

Deploy `delete-account`, `revenuecat-webhook`, and `content-pack` after the schema changes. `verify_jwt=false` in the function configuration is intentional: the user-facing functions validate the bearer token against Supabase Auth; the webhook validates its separate configured authorization secret. Do not remove these checks or assume gateway configuration alone authenticates a request.

Server environment:

- Supabase server URL and service-role key available only to functions/operators.
- `RC_WEBHOOK_AUTH`: exact secret Authorization header configured in RevenueCat.
- `RC_ALLOWED_APP_IDS`: comma-separated accepted RevenueCat app IDs.

The commerce database setting initially accepts SANDBOX events. In a reviewed, separate production database, enable PRODUCTION only after configuring the matching apps/webhooks. A server operator can inspect or change `firstlane_private.commerce_settings`; never expose this as a client mutation.

## Commerce and progress contracts

`firstlane_apply_commerce_event` is service-role-only and commits a verified webhook before acknowledgment. `firstlane_my_access` and `firstlane_my_receipts` use `auth.uid()`, not a client-selected user ID. The new offer migration sets CAD 1499 minor units as reference metadata without altering historic receipt amounts.

`firstlane_save_progress` validates an authenticated user's snapshot and expected `updated_at`, locks per user, and returns a conflict rather than overwriting newer data. The client re-reads, merges and retries within a bounded loop. Direct authenticated INSERT/UPDATE on the old progress table is revoked by the new migration; use the RPC. Personal practice history is not entitlement evidence or an official exam grade.

## Protected content publication

1. Obtain genuinely reviewed content at `content/release/ontario-g1.approved.json`.
2. Run `npm run content:bundle`; validate both generated sample and full release artifacts.
3. Upload `release-artifacts/ontario-g1.json` to a versioned path in the **private** `content-releases` bucket.
4. Insert a release row in `firstlane_private.content_releases` with the exact pack, version, storage path, SHA-256, byte count (maximum 15,000,000), question count (500), named approval and timestamps. Use the generated manifest values, not guessed placeholders.
5. Only approved rows whose `published_at` has arrived can be selected. Verify a paid account can fetch the release, while guests/free/expired/revoked users cannot.

`firstlane_content_release` checks verified identity and live access. `content-pack` obtains that metadata with the user's authenticated client, then returns a server-issued storage URL valid for 120 seconds. The app checks the bounded download, checksum, payload structure and approvals before installing it into that account's cache. Failures preserve the prior usable pack.

No anonymous/authenticated direct storage policies are added by the migration. Audit existing policies as well: an older permissive bucket policy would undermine privacy. Do not turn the bucket public or serve the authoring bank from the landing host. A SHA-256 checksum detects mismatched content; it is not a detached content-signing/DRM solution.

## Mandatory staging tests

Test schema migration on representative existing data; access by different users; rejected/expired tokens; direct table/RPC privileges; verified-email gating; webhook spoof/replay/refund ordering; sync conflict retries; private bucket URLs; deletion and legally required retention. None of these backend integration/security tests were executed against a live project in this delivery.


## 0.5.0 refund-reversal extension

The new sixth migration is `202610070001_refund_reversal.sql`. Apply all migrations in filename order in staging first. See `REFUND_REVERSAL.md` and the unexecuted rollback-only `supabase/tests/refund_reversal_acceptance.sql`. Source-review success is not database or store acceptance.
