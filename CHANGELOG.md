# 0.5.0 — 2026-10-07

Light-first visual refresh based on the supplied landing page. Today renamed Home; Home/Practice/Progress/Account redesigned. Shared surfaces, typography, spacing and secondary screens updated. Truthful tier counts/objectives, guarded session parking and legacy recovery, platform checkbox, correct guest labels, checkout condition/SVG fixes, web-only reminder fallback, and refund-reversal migration plus acceptance source. 26 added regression/source-contract tests. Unresolved dependency advisories and unexecuted native/Expo/database checks remain explicit release gates.

# FirstLane changelog

## Brand finalization — October 7, 2026

### Final brand identity
- Finalized the product name as **FirstLane** and the tagline as **Get road ready.**
- Updated native app copy, wordmarks, Expo metadata, deep-link scheme, package identifiers, notifications and accessibility-facing labels.
- Renamed app storage keys, Supabase private schemas/RPCs, commerce product identifiers, release gates, CI labels, tests, previews and operational documentation to the FirstLane namespace.
- Preserved the established colour, illustration, motion and responsive interaction system.
- Replaced the native icon, adaptive icon, splash screen and in-app mark with the supplied F-and-road logo reference.
- Made Expo tunnel mode with Expo Go the default development start path, with an explicit LAN alternative for local networks.

## 0.4.0 — October 6, 2026

### Commercial and presentation
- Centralized the Ontario offer at CA$14.99 / CAD 1499 minor units, one-time, no renewal or expiry.
- Updated native paywalls, landing/companion pricing and commercial documentation.
- Added a forward migration for existing backend reference prices without rewriting transaction history.
- Removed inappropriate customer-facing preview/internal wording; preserved honest demo/test disclosures.
- Disabled unavailable landing-store links rather than presenting fake live destinations.

### Reliability and account boundaries
- Made connected mode the default and prevented production-to-demo fallback.
- Added native secure authentication/access storage, bounded offline grant validation and account-scoped content caches.
- Bound sensitive backend operations to their originating authenticated account.
- Serialized purchase/restore identity handling; persisted pending purchases; blocked CAD price mismatches and waited for server fulfillment before success.
- Added safer account hydration, network completion guards, download handling, removal and deletion cleanup.
- Added deterministic progress merging and a compare-and-swap sync RPC.

### Content and UI
- Separated fixed client samples from the full draft authoring bank.
- Added authenticated private-content delivery, checksum/size/version/approval validation and cache rollback.
- Added production content/configuration/acceptance gates without fabricating approvals.
- Hardened small-screen study scrolling, labels, touch targets, safe areas, keyboards and async button/error behavior.

### Delivery
- Added regression tests, release tooling, a CI workflow and current handoff/QA documents.
- Replaced stale v3 QA outputs with current, explicitly scoped browser evidence.
- Preserved original dependency versions and existing brand assets; no live service, signing or store-console changes are included.
