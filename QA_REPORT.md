# FirstLane 0.5.0 — QA refresh evidence

Date: 7 October 2026. This report supersedes the 0.4.0 handoff for the modified source. The supplied audit is retained at `reference/reports/QA_AUDIT_2026-10-07.md`.

## Executed here

| Check | Result | Evidence / scope |
|---|---|---|
| `node --test tests/*.test.mjs` | **96 / 96 passed** | `qa/refresh/logic-tests.log`. Original 70 plus 26 new domain/source-contract tests. Source-contract tests do not execute SQL or React Native. |
| Source parser / relative imports | **66 TS/TSX files passed** | `qa/refresh/source-check.log`. TypeScript 5.8 transpiler supplied by the environment; not the project's installed TypeScript 6 dependency-aware check. |
| Content structure | **Passed** | `qa/refresh/content-check.log`. 500 authoring questions, 250 concepts, 200 road-sign and 300 road-rule items, 20 source records. Structural validation is not content/legal approval. |
| Connected client bundle | **40 fixed samples** | Existing content bundler run in connected mode; covered by the existing test suite. Full drafts were not promoted to approved content. |
| Source-rendered companion | **64 render cases passed** | `qa/refresh/source-preview-checks.json`, screenshots, `preview-check.log`. 12 screens × 5 viewport sizes plus four dark-theme screens. No page errors in this adapter run; no measured document overflow/text clipping or out-of-device dock placement. |
| Companion interactions | **Passed** | Checkbox pointer, Space, Enter, label activation, checked-state and focus feedback; dock navigation/selection; guest/free/paid plan labels. Custom DOM adapter only. |
| Python harness syntax | **Passed** | Both new Python browser scripts compiled with `py_compile`. This does not execute the real Expo harness. |
| Production gate | **Failed as intended, exit 2** | `qa/refresh/release-check.log`. Missing production configuration/content approval/acceptance records remain blocked, including the three new review flags. |

## Tests added

Tier-filtered counts/objectives across every topic for guest/free/paid; exact one-guest/four-free sample examples; zero-sample locks; paid content not-yet-loaded handling; compatible-session no-op parking; genuinely premium session parking; premium-mode checks; safe legacy recovery; plan labels; tab labels; light default and existing preference retention; native web checkbox source semantics; results transform; safe checkout error conditions; no native Notifications import on web; normal-text contrast on key light/dark token pairs; and refund-migration source-contract guards.

The contrast check verifies listed color pairs, not full WCAG compliance or every component/state. The preview uses system fonts, local fixture data and a custom layout/interaction adapter, not an Expo build or native simulator. Do not treat the screenshots or 64 preview cases as app-store/runtime evidence.

## Not executed / unresolved

- `npm ci` failed while registry/DNS access was unavailable. npm's install log records an exit-handler failure; the audit request separately records `EAI_AGAIN registry.npmjs.org`.
- No successful dependency-aware `npm run typecheck`, full `npm run check`, Expo web export, expo-doctor or signed native build is claimed for this source revision.
- Fresh dependency audit could not complete. The input audit's 26 advisories (15 high, 11 moderate) are not marked fixed. See `docs/DEPENDENCY_TRIAGE.md`; no force upgrade/downgrade or accepted exemption was applied.
- The actual Expo runtime regression script is included but **not run**. Full clean-console checkout/results validation remains pending, especially paid transitions.
- Supabase migrations and both SQL acceptance harnesses were not executed. The new refund-reversal implementation requires staging review, database execution and real App Store/RevenueCat delivery tests.
- No real store sheet, purchase/refund/reversal/restore, cross-device native storage, notification permission, account deletion or native accessibility acceptance occurred.
- The included authoring bank remains unapproved. Legal review, real publisher/service/store configuration and named launch sign-off remain incomplete.

## Commands to reproduce

In a clean, networked development environment using the supplied lockfile:

```sh
npm ci
npm run content:bundle
npm run check
npm run doctor
npm run web:export
npm audit --omit=dev --audit-level=high
```

Use a connected-mode 40-sample bundle for source tests; an explicit demo build intentionally includes the full draft. See README for demo setup, the actual Expo browser regression harness, and separate preview-only checks.

Do not copy successful runtime results from the earlier audit into this revision's evidence. Do not set any release acceptance flag from source/preview success alone.
