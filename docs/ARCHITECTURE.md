# FirstLane 0.4.0 — Implementation map

## Application boundary

`app/` contains Expo Router screens. Shared UI and state are under `src/`; domain modules are small JavaScript modules exercised by Node tests. This is the newer uploaded native source, not a rewrite of the separate HTML companion.

- `src/domain/offer.mjs`: immutable CA$14.99 Ontario offer.
- `src/domain/environment.mjs` / `src/config.ts`: explicit demo vs connected/production; public configuration.
- `src/state/AppState.tsx`: owner-scoped hydration, access refresh, persistence, sessions, sync, reporting and downloads.
- `src/lib/privateStorage.ts`: native SecureStore adapter for authentication/access metadata; web storage fallback.
- `src/lib/storage.ts` / `.web.ts`: owner-scoped study state and content install/rollback.
- `src/lib/supabase.ts`: captured, verified bearer identity for sensitive operations.
- `src/lib/billing.ts`: native store bridge, price validation, pending purchase state and account serialization.
- `src/domain/access.mjs` / `src/lib/accessCache.ts`: validated grants and bounded offline verification.
- `src/domain/progress.mjs` / `src/lib/sync.ts`: deterministic completed-attempt/bookmark merge and optimistic concurrency.
- `src/domain/content.mjs` / `src/lib/content.ts`: validated private release downloads and sample replacement.
- `src/components/UI.tsx`: shared touch, text, safe-area, keyboard and error-boundary behavior.

## Data authority

The fixed sample manifest controls free exposure. The full question bank is not bundled into connected releases. Server access controls private downloads; a local paid flag or visible paywall cannot create a grant. A persisted offline grant has a bounded verification window, and is not a renewal of the purchase.

The RevenueCat SDK initiates native store operations. Authenticated webhook events update Supabase's mirror; that mirror controls paid UI/content. Capturing the originating session and tagging local owners limits account-switch contamination. These contracts still need adversarial native/backend integration testing.

Private release URLs are short-lived storage links and the bytes are checksum-validated. This is not encryption of the whole study database, detached digital signing, or a promise of copy protection.

## Source/build separation

`content/` and `reference/` are internal authoring/reference inputs. `src/data/generated-bank.json` is the only imported question bundle and contains 40 fixed samples in connected mode. Explicit demo mode can generate the full draft for local simulation. Production requires a reviewed release source and a matching sample hash.

`landing/` is the public acquisition website; `preview/` is an internal static design simulator. Neither is a signed mobile build. Never deploy the repository root to a public host.

## Release boundary

`app.config.ts`, `scripts/release-policy.cjs`, the content bundler and `release-approvals.json` enforce the configured release prerequisites. Acceptance flags are records of real work, not substitutes for it. See the root `PRODUCTION_HANDOFF.md` and `QA_REPORT.md` for outstanding content, dependency/build, service and native tests.
