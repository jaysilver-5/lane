# FirstLane 0.4.0 — Ontario G1 production-hardening package

**Ontario G1 Complete: CA$14.99 once. No subscription. No expiry.**

This package preserves the existing Expo / React Native app and responsive direction while applying the finalized FirstLane identity across the native product, backend contracts, configuration, previews and documentation.

## Release status

The source hardening and the checks described in `QA_REPORT.md` are complete. **This is not a signed application, a successful native build, a deployed backend, or approval to launch.** The supplied question bank remains an unapproved authoring draft. Production builds deliberately fail until content review, real service/publisher configuration, and the acceptance checks in `release-approvals.json` are complete.

Start with **`PRODUCTION_HANDOFF.md`** for the exact remaining work. **`QA_REPORT.md`** distinguishes the checks actually run from native/build/store checks still needed.

## Access and pricing

| Access | Included | Price |
|---|---|---|
| Guest | 10 fixed Ontario samples | Free |
| Verified FirstLane account | 40 fixed samples, explanations and saved progress | Free |
| Ontario G1 Complete | Full approved 500-question Ontario pack and premium practice features | **CA$14.99 once** |

Ontario ownership does not include future jurisdictions. The 30-day offline verification window is a security/cache policy, not a subscription or expiry of the purchase. Reconnect to refresh access.

Canonical commercial configuration lives in `src/domain/offer.mjs`: 1499 minor units, CAD, `firstlane_on_g1_lifetime`, `ca_on_g1_full`. The actual Canadian product price must also be set in both store consoles; editing source code does not change an App Store or Google Play listing. Checkout uses the store's product/price and refuses a mismatched CAD price rather than silently charging a different amount.

## Run locally

Use Node 22.13+ and the supplied lockfile. Dependencies were preserved from the uploaded main project; their install and SDK compatibility still need validation in a networked environment.

```sh
npm ci
```

Copy `.env.example` to `.env.local` and enter your development project's public values. The default is **connected**, not demo. Missing credentials do not create fake accounts or simulate payment.

```sh
npm run content:bundle
npm start
```

The default start command uses Expo's tunnel mode and targets Expo Go, so a physical Android or iOS device does not need to resolve the development machine's LAN hostname. Use `npm run start:lan` when the device and computer are on a network with working local hostname discovery.

For an explicitly simulated internal test, copy `.env.demo.example` to `.env.local` instead. Demo mode is labeled and must not be released as a customer application. It does not charge money or send real verification email. Use disposable test credentials.

Native billing must be exercised in an installed, appropriately configured native build. The separate HTML companion is not a native billing or SDK test.

## Build profiles

`eas.json` contains `development` and `preview` (internal demo), `connected` (internal real-service testing), and `production` (store build, release gate enabled). Supply the publisher's already registered bundle/package IDs and your EAS project ID; the internal `.dev` identifier is not a production registration.

```sh
npx eas-cli build --platform android --profile connected
npx eas-cli build --platform ios --profile connected
```

After genuine release approval and configuration:

```sh
npm run content:bundle
npm run release:check
npm run build:production:android
npm run build:production:ios
```

Set `EXPO_PUBLIC_APP_MODE=production` in the production environment. Do not bypass the gate to publish the included drafts. The production EAS profile also sets this value.

## Quality checks

Run against a connected-mode 40-question sample bundle:

```sh
npm run content:bundle
npm run check
npm run doctor
npm run web:export
```

`npm run check` includes the dependency-aware TypeScript check, logic/source-guard tests, source parsing, and content structure validation. A parser pass alone is **not** a TypeScript or native build pass. The included CI workflow is a proposed repeatable check; it has not been run on your repository.

Optional browser checks require Python, Playwright and Chromium:

```sh
npm run preview:build
python scripts/browser-qa-v4.py
npm run web:qa
```

These test the static landing page and internal HTML companion, not the React Native app.

## Backend and paid content

Apply all five migrations in filename order to a reviewed, backed-up project. Deploy `delete-account`, `revenuecat-webhook`, and `content-pack`. Setup and private-server settings are in `docs/SUPABASE.md` and `docs/BILLING.md`.

Only the fixed 40-question sample set is imported by a connected/release app. The full draft remains in `content/` for authoring. A real release requires `content/release/ontario-g1.approved.json` with independently approved question revisions and rights records. The content bundler generates a full private release plus a 40-question public sample bundle only after validation. Never upload the entire repository to a public web host.

## Design companion

`preview/` is a separate internal HTML design simulator for the app experience. Its test controls and simulated-payment labels are intentional. They are not part of native production navigation. `npm run preview` serves it on localhost only. Do not deploy it as the customer app or mistake its screenshots for native QA. The standalone marketing-site HTML under `landing/` is outside the scope of this app rebrand.

## Key handoff files

- `PRODUCTION_HANDOFF.md`: completed work, setup order, launch blockers.
- `QA_REPORT.md`: actual test evidence and limitations.
- `docs/BILLING.md` and `docs/SUPABASE.md`: service integration contracts.
- `docs/LAUNCH_CHECKLIST.md`: release acceptance steps.
- `CHANGELOG.md`: scope of this update.
- `DELIVERY_MANIFEST.json`: delivery file hashes and source archive provenance.

No production credentials, signing material, live listings, or independent content approval are included.
