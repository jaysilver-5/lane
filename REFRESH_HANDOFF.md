# FirstLane — Light-first refresh handoff

Date: 7 October 2026 · Source version: 0.5.0

## What changed visually

The app uses the supplied landing page's warm-ivory, forest-green and lime direction, but large dark panels have become light sage or white. The layout now has a consistent 20px content gutter, lighter cards, gentler borders, restrained shadows, softer corners and more deliberate type hierarchy. No font files were added.

Home replaces Today. Its main screen combines an editorial “Get road ready.” heading, an original decorative road sketch, a daily-practice/continue card, concise real activity stats, topic discovery, review and rehearsal shortcuts. The dock is Home / Practice / Progress / Account.

Practice uses a single vertical scroll surface, searchable topics and accurate tier-specific sample counts. Progress has a light summary panel, genuine activity bars and clearer empty states. Account has grouped settings rather than a large dark membership block. Plans, topic detail, results, rehearsal, checkout and appearance have been aligned with the same palette. Internal demo disclosures remain visible only in explicitly simulated modes; they were not hidden to disguise fake services.

Daylight is the default for new installs. Explicit saved preferences remain respected. Existing installations with dark/system saved can switch to Daylight in Appearance.

## QA fixes implemented

| Audit issue | Implementation | Verification in this delivery |
|---|---|---|
| Topic counts and objectives overstate access | One shared availability helper uses the same tier-filtered pool as practice. Counts distinguish sample/full pack; zero-sample topics gate before entry; objectives only cover available questions. Paid sample-only state asks for the pack, not another purchase. | Executed domain regression tests and source-preview checks; Expo runtime retest pending. |
| Free session stranded by upgrade prompt | Parking is a no-op for a compatible free session; the access sheet only offers parking when required. Old mistakenly parked compatible sessions recover without replacing current progress. | Executed guest/free/paid/legacy regression tests; real Expo flow pending. |
| Signup consent | Platform-specific native HTML checkbox on web; checked state, label, click/Space behavior, Enter support and focus outline. Native retains accessible Pressable semantics. | Source contract plus pointer/keyboard checks in the DOM companion; real Expo/native retest pending. |
| Misleading guest plan label | Guests see “Available after free signup”; verified free users see “Your plan.” | Executed helper tests and three preview fixtures. |
| Checkout text-node / results SVG errors | Empty error conditions coerced to booleans; portable SVG rotation transform; uncluttered accuracy label. | Source guard tests and preview renders. Full checkout/result console test still required. |
| Deprecation noise | Owned pointerEvents moved into styles; owned shadows use boxShadow; web reminders do not import native Notifications. | Source checked. Third-party runtime warning status is not established. |
| Refund reversal | New append-only migration replaces commerce RPC with account/store/environment-pinned restoration, tombstone clearing, idempotency and ordered lifecycle handling. No grant is created from a reversal without an original receipt. | Source review and a source-contract test only. SQL acceptance and real webhook delivery NOT executed. |
| High-severity dependency advisories | Lockfile was not force-upgraded or downgraded. Advisory/exposure triage documented and an explicit release gate added. | UNRESOLVED. npm registry/DNS was unavailable; no fresh audit result. |

## Preserved

FirstLane branding, Ontario G1 scope, CA$14.99 one-time/no-expiry offer, fixed 10/40 sample pools, the paid 500-question pack, account-scoped access, server-authoritative purchase fulfillment, private content delivery, and production safety gates. The landing reference itself was not edited.

## Evidence and limitations

96 Node logic/source-contract tests passed. 66 TS/TSX files parsed with relative imports resolved. Content structure validation passed. The source-rendered companion passed 64 rendering cases plus consent, dock and plan-label checks. The production release gate still correctly fails.

The preview cases cover 12 screens at 320×568, 375×667, 390×844, 430×932 and a desktop canvas, plus four dark-theme screens. They check rendering, horizontal overflow/text clipping, and dock placement. This is a custom DOM adapter with fixtures, not the RN layout engine or real React reconciliation. Screenshots are design evidence, not proof of native behavior.

`npm ci` could not obtain packages because registry/DNS access was unavailable. Consequently no successful dependency-aware TypeScript check, Expo export, expo-doctor, signed iOS/Android build, actual Expo browser regression, or store/backend acceptance is claimed. The old audit's successful build results must not be attributed to this revision.

## Next release steps

1. Install dependencies in a networked environment, run `npm run check`, `npm run doctor`, `npm run web:export`, and the actual Expo browser regression harness. Triage the complete fresh dependency audit without `--force`.
2. Stage all six migrations; execute both SQL acceptance files; test authentic sandbox RevenueCat purchase, refund, reversal, retry, ordering and restore deliveries.
3. Validate small phones, tablets, large text, keyboard/safe areas, VoiceOver/TalkBack, notifications, offline storage and account deletion on installed native builds.
4. Complete content, legal, service/store configuration and the named acceptance records. Do not set approval flags from source-preview success.

Refund lifecycle ordering uses RevenueCat's event-generation timestamp. That is not guaranteed to equal the underlying store action time. Ambiguous or mismatched historical events need server-side reconciliation/manual review, and this assumption must be exercised against real deliveries before enabling production. See the source citations in `docs/DEPENDENCY_TRIAGE.md` and `docs/REFUND_REVERSAL.md`.

## Files to start with

`README.md` — run commands. `QA_REPORT.md` — actual results. `docs/DEPENDENCY_TRIAGE.md` — unresolved advisories. `supabase/migrations/202610070001_refund_reversal.sql` — new migration. `supabase/tests/refund_reversal_acceptance.sql` — unexecuted staged acceptance. `preview/index.html` — standalone design companion. `qa/refresh/` — current screenshots and logs. `DELIVERY_MANIFEST.json` — current hashes and provenance.
