# FirstLane 0.4.0 — Production handoff

**Prepared: October 6, 2026**  
**Required Canadian price: CA$14.99, one-time Ontario G1 Complete purchase.**

## What is delivered

The current supplied source package is the implementation base. Earlier prototype material was used only as a reference. The existing visual direction, Expo Router routes and responsive work are retained.

This is a production-hardening source delivery, not a signed/store-approved release. Several external prerequisites cannot truthfully be completed from the ZIP: the supplied content has no independent/rights approval; publisher and service credentials were not provided; and native/store integration tests require those services and devices. Release gates remain closed for those reasons.

## Completed changes

### Price and customer-facing copy

The canonical offer is `src/domain/offer.mjs`: `1499`, `CAD`, `CA$14.99`, lifetime, no auto-renewal. Native paywalls, access prompts, marketing, the internal companion and commercial documentation now use the updated offer. A new migration adds/updates the backend reference price for existing installations. Historical receipts are not rewritten.

Customer screens no longer use inappropriate preview/internal implementation wording. Internal demo flows still explicitly identify simulated accounts and payments. Necessary development-content warnings are not disguised as public approval.

### Purchase and access handling

The native checkout loads the real store product and uses its localized price. A Canadian price other than 1499 minor units blocks the purchase. Pending purchase state prevents accidental repeat attempts. An SDK purchase result alone does not open the success screen: the app refreshes the authenticated Supabase entitlement mirror and waits for the server grant. Delayed fulfillment stays pending with recheck/support actions.

Sensitive requests capture and verify the originating user's bearer token, so an account switch cannot silently reassign a request. Purchase/restore operations also serialize RevenueCat identity changes. Access caches reject malformed grants, are account-scoped, expire after the verification window, and do not turn authentication failures into offline grants.

### Account data and content

Native authentication/access snapshots use SecureStore rather than plain AsyncStorage. Study state remains in owner-scoped local storage; this is not a claim that every study record or downloaded question is encrypted. Download/install/rollback caches are separated by account; legacy global content caches are discarded. Account deletion clears the relevant local state after the server confirms deletion and reports cleanup problems rather than pretending everything succeeded.

Progress sync merges completed attempts and timestamped bookmark changes instead of overwriting one device's history with another's. A compare-and-swap database RPC detects conflicting updates. This is practice history, not an official grade or certification.

The full authoring bank is no longer imported into a connected app. Protected content delivery now has an authenticated Edge Function, private storage release metadata, a short-lived signed download URL, size/version/count/approval checks and a SHA-256 checksum. **The checksum is not a detached digital content signature or DRM.** A determined owner of an installed device may still inspect downloaded content; do not promise otherwise.

### Layout, errors and release tooling

Shared controls now handle small widths, wrapping labels, safe areas, keyboard avoidance/Android resize, busy states and duplicate taps more deliberately. The study page scrolls on constrained heights; form and empty/error states were reviewed. A root error boundary avoids silently crashing into a blank screen. These source changes still need native keyboard, accessibility and device validation.

Production mode no longer falls back to demo. Production configuration checks require public-only client keys, real publisher IDs, support/legal URLs, approved content and recorded acceptance. The landing page does not pretend missing store links are live. Current tests, evidence, a CI workflow and file hashes are included; stale v3 QA screenshots/logs have been removed from this delivery.

## Required setup and release order

### 1. Validate the installed application toolchain

On a networked development machine, run `npm ci`, generate a connected-mode sample bundle, then run `npm run check`, `npm run doctor`, and `npm run web:export`. Resolve any dependency/type/build issues before treating this as an installable release. The lockfile and dependency declarations have been preserved, not speculatively upgraded.

Dependency installation could not complete in this environment because package-registry access was unavailable. Therefore a full dependency-aware TypeScript compile, Expo export, vulnerability audit and native build are not claimed. `QA_REPORT.md` records what actually ran.

### 2. Configure the real publisher and environments

Copy `.env.example` to `.env.local` for development and configure the corresponding EAS environments. Use the legal publisher's existing App Store bundle ID, Play package and EAS project UUID. Do not replace those IDs with a guessed company identifier or register a new app accidentally. Set the actual operator/support/legal/deletion URLs. The supplied files intentionally leave those values blank.

Keep development/sandbox and production backends separate. Never place service-role keys, webhook authorization secrets, store signing material or database credentials in `EXPO_PUBLIC_*`. Native clients receive only the public platform SDK/publishable values they need.

### 3. Apply and test the backend changes

Back up and test migrations in staging before production. Apply, in order:

1. `202610030001_internal_beta.sql`
2. `202610030002_access_and_billing.sql`
3. `202610060001_production_content.sql`
4. `202610060002_progress_concurrency.sql`
5. `202610060003_offer_cad1499.sql`

Existing projects that already applied the first two should apply only the three new migrations through normal migration tracking. Do not rerun CREATE TABLE migrations manually over existing tables.

Deploy `delete-account`, `revenuecat-webhook`, and `content-pack`. Configure email confirmation/recovery redirects and a working mail provider. Set webhook secrets and app allowlists server-side. Test RLS, rejected tokens, account-switch races, CAS conflicts, webhook replay/refund ordering, deletion and private storage access with real users. These migrations and Edge Functions have not been deployed or executed against your project here.

### 4. Configure and verify CA$14.99 in the stores

Use the existing product mapping:

```text
Ontario pack:          CA-ON-G1
Apple product ID:      firstlane_on_g1_lifetime
Google product ID:     firstlane_on_g1_lifetime
RevenueCat entitlement: ca_on_g1_full
Canadian reference:    CAD 1499 minor units = CA$14.99
```

Configure the one-time product and Canadian storefront price in both consoles and attach both products to the correct RevenueCat offering/entitlement. Verify that the native sheet shows the intended Canadian offer. Source and database changes do not alter console pricing. Other storefronts use the store's localized price; this package does not guess exchange rates or taxes.

Use the verified Supabase user UUID as the RevenueCat App User ID. Confirm the intended original-account restore/transfer policy in RevenueCat and test same-account restore on a clean install. Webhooks must reach the matching sandbox or production backend; the database initially accepts SANDBOX events. Do not enable production commerce on a mixed test database without a reviewed transition.

### 5. Complete content and rights review — not optional

The supplied authoring bank contains **500 draft questions and 250 concepts, with no independently approved/publishable question revisions**. Structural tests do not verify driving-law accuracy, pedagogy, source currency or image rights.

Arrange independent Ontario review, source verification and rights clearance. Preserve exact revision/author/reviewer records, source evidence and the fixed guest/free sample manifest. Provide the reviewed release as `content/release/ontario-g1.approved.json`. Do not make the app appear ready by changing approval booleans without actually doing the review.

The current question renderer is text-only. The release gate rejects questions requiring visual learning media; required sign-recognition assets and a reviewed renderer must be implemented and tested before publishing that material. Do not simply remove a media requirement to bypass this limitation.

After review, run `npm run content:bundle`. It creates the approved fixed 40-question client sample set and `release-artifacts/ontario-g1.json` with a manifest. Upload the full JSON only to the private `content-releases` bucket and register its exact path, version, byte length, checksum and reviewer/publish time in `firstlane_private.content_releases`. See `docs/SUPABASE.md`.

### 6. Run installed-device acceptance

Test guest/verified-free/paid access; purchase success, cancel, decline and pending; slow/missing webhook fulfillment; duplicate taps; restore, refund/revocation; two different FirstLane users on one device; second-device sync; sign-out during network work; offline grace, cache expiry and clock rollback; download failure/hash mismatch/update/rollback/removal; confirmation/recovery links; reports; account deletion; notifications; tiny screens, large text, safe areas, keyboard and VoiceOver/TalkBack.

Use real native sandbox builds on iOS and Android. Browser-companion checks cannot validate any native SDK/store path. Resolve actual defects found, then record the named reviewer and date in `release-approvals.json`. Keep failed/untested checks false.

### 7. Release and website

Set `EXPO_PUBLIC_APP_MODE=production`, generate approved content, pass `npm run release:check`, and build the production EAS profiles. Verify signing, store disclosures, policies, support, review metadata and the installed build before submitting/publishing.

Only deploy `landing/` to the website host, after generating its real public links. Do not publicly serve the repository, `content/`, `reference/`, `preview/`, `release-artifacts/`, environment files or QA screenshots. Run `npm run landing:release` only when the genuine store URLs and release prerequisites exist.

## Important operational limitations

The webhook implementation supports the configured one-time product purchase/cancellation paths; unexpected event types are retained for review, not automatically treated as valid grants. It relies on webhook delivery and does not provide a fully managed reconciliation service. Monitor failed/delayed events and test out-of-order/refund cases before launch.

Account deletion removes the app account and relevant local data; actual financial/event retention and developer-account responsibilities need a reviewed legal policy. It does not automatically refund a store purchase. Legal summaries in the app are not a replacement for approved operator-specific policies.

Production checks intentionally fail in the delivered state. That is a safety boundary, not a claim that configuration/content/device work was completed.
