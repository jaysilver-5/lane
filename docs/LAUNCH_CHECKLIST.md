# FirstLane 0.5.0 — Launch acceptance

The source package does **not** complete this checklist automatically. Leave untested items false in `release-approvals.json`.

## Build and configuration

- [ ] Fresh dependency audit is triaged; fixed versions or evidence-based owner-approved exceptions are recorded.
- [ ] Actual Expo browser consent, free-session preservation, tier counts and checkout/results clean-console regressions pass.

- [ ] Clean `npm ci` succeeds using the lockfile; dependency-aware typecheck, Expo checks/export and native builds pass.
- [ ] Actual publisher bundle/package IDs, EAS project and signing accounts are confirmed.
- [ ] Production mode uses real public SDK/publishable keys; no client-side server secrets.
- [ ] Support, operator identity, privacy, terms and account-deletion URLs are live and reviewed.
- [ ] CA$14.99 one-time Canadian pricing is verified in both actual native store sheets.

## Backend, billing and account lifecycle

- [ ] Refund-reversal migration and rollback-only SQL harness pass in staging; genuine RevenueCat/App Store reversal deliveries are accepted.

- [ ] Migrations are staged/backed up; privileges, RLS, private storage and all three Edge Functions are tested.
- [ ] Purchase/cancel/decline/pending and delayed fulfillment are tested on installed iOS and Android sandbox builds.
- [ ] Duplicate attempts, webhook retries/out-of-order/refund events and clean-install restore are tested.
- [ ] Account switching, session expiry, verification/recovery links, second-device sync and report delivery are tested.
- [ ] Account deletion clears intended app data; retention/refund/account-recovery policy is approved.
- [ ] Offline verification expiry, revoked access, clock rollback and reconnect behave correctly.

## Learning content and downloads

- [ ] All 500 question revisions have independent Ontario and rights approval, source verification and a reviewed rehearsal template.
- [ ] Any required visual sign content has an approved renderer/assets; requirements are not removed merely to bypass checks.
- [ ] Fixed guest/free samples are correct and approved; the full bank is absent from the connected app bundle.
- [ ] Private full release is uploaded with the exact manifest and approval metadata.
- [ ] Paid/free/revoked download access, partial downloads, size/hash errors, update/rollback and removal pass.

## Device and release experience

- [ ] Small/large screens, large text, keyboard, safe areas, theme, reduced motion and orientation constraints are tested natively.
- [ ] VoiceOver/TalkBack, touch targets, error/retry/offline states and notifications are tested.
- [ ] All native customer routes are free of inappropriate internal/preview labels; test builds remain honestly labeled.
- [ ] Release reviewer/date and all acceptance flags reflect completed work.
- [ ] Production release check passes; installed signed build and store disclosures are reviewed before submission.
- [ ] Website uses real store/policy links and only `landing/` is publicly deployed.

Current executed evidence is in the root `QA_REPORT.md`. Browser simulator success does not check off native/store items.
