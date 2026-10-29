# Launch status — 24 October 2026

Target: https://getfirstlane.com/app, served at the existing canonical https://www.getfirstlane.com/app. The app and marketing migration are in [lane #2](https://github.com/jaysilver-5/lane/pull/2) and [getfirstlane #4](https://github.com/jaysilver-5/getfirstlane/pull/4).

## Content approved by the owner

The owner explicitly accepted the completed AI editorial review and instructed us to proceed. Independent human review is no longer an internal launch prerequisite for this release. [The acceptance receipt](../content/approvals/owner-2026-10-24.json) binds that instruction to the reviewed bank and AI report hashes. The [approved 1.0.0 release](../content/release/ontario-g1.approved.json) covers all 500 exact question revisions and preserves their immutable payloads.

This is owner acceptance on an AI editorial basis, with no independent human, legal or government certification claimed. The originality basis is original factual text with no copied sign artwork or other third-party media; no government prose/artwork licence is assumed. The 200 sign prompts describe signs in words. There are 250 paired concepts, no empirically calibrated exam or comprehensive printed-handbook claim. The 40-question session is an approved FirstLane editorial practice format, without an asserted official-format certification.

The 500-question AI review corrected 44 revisions: 16 wording/explanation and 28 citation-only changes. The exact ledger and change history are linked in [the editorial report](../content/review/EDITORIAL_REVIEW_2026-10-24.md). Independent human decisions remain 0/500 as historical provenance; that count is not a new request for another reviewer.

## Verified technical work

- All 238 JavaScript tests pass, plus TypeScript, 96-file source checks, seven Edge Function entrypoint checks and content-integrity/approval validation. Exact-answer changes, missing/duplicate approvals and misleading certification claims are rejected.
- Production account isolation, progress/concurrency, stale-session rejection and database deletion suites passed with rollback. Private tables/storage remain inaccessible to browser roles; intentional authenticated RPCs check current account/session ownership.
- Content-pack v8 enforces the exact configured browser origin. Nine unauthenticated/preflight rejection probes pass against the canonical WWW origin.
- Production Clerk/backend origin configuration and Vercel URL/base path use WWW and /app. Root policies stay on marketing routes. No DNS record is required for /app.
- The approved 40-question free sample has been deployed as free-questions v6. It still requires a verified live Clerk account; anonymous requests return 401.
- The full private artifact is published: version 1.0.0, 500 questions, 1,333,762 bytes, SHA-256 21bf800ca3444d2a0a730eb164f9413b74a9f102b6400a956f92cd3b96fd9261. A one-off trusted server upload bypassed the browser file-picker limitation; stored bytes were downloaded privately and re-hashed before publication. The original content-pack code was restored exactly as v8. No credentials were extracted, permissions broadened or paid access granted.
- Vercel Authentication now uses Standard Protection, saved by the owner after explicit authorization for public testing. Anonymous production alias requests return 200; preview requests still redirect to Vercel SSO. The production acceptance build stage retains the normal full public-sales gate; actual customer/payment outcomes are recorded individually.

## Remaining execution

| Area | Remaining work |
|---|---|
| Private pack delivery | Exact approved 1.0.0 is private and published in production and sandbox; stored bytes/checksum match. Actual paid sandbox browser delivery loads all 500 questions across 20 topics using the exact production delivery code. Anonymous/foreign access is denied. Production customer download after a real live payment is still untested. |
| Production candidate and cutover | Public testing cutover is complete. Marketing PR #4 merged as 3a42d73 and production deployment EdtGxQQxRyXFXJWdb4D4FJWq7xSz is Ready. Canonical /app, auth/checkout/quiz deep links, JavaScript and all root policies return 200. App fix 91a4f9a is deployed and both CI jobs pass. Guest practice/reload and signup render without app errors. Marketing sales availability remains false pending actual acceptance. |
| Real accounts | Owner signup/verification, email recovery and returning sign-in pass. Chrome restores the same canonical account and the session originally saved in the in-app browser: one answered question, 100% practice accuracy. Clerk/Supabase binding, profile, 40 free questions and cross-browser cloud restoration pass. Disposable-account deletion still needs execution; no existing user account was deleted. |
| Payments | Canonical live default payment link is saved/approved and live overlay opens with CA$14.99 plus tax. A fresh sandbox refund revoked access automatically, then a published test-card payment completed with automatic signed-webhook fulfillment and restoration after reload. Progress is unchanged; replay is idempotent. No real money was used and no live purchase is claimed. |
| Device/accessibility | Complete physical mobile-browser and screen-reader checks. |
| Deferred operations | The owner deferred Zoho mailboxes and the real correspondence address. support@getfirstlane.com and privacy@getfirstlane.com are configured in copy but are not verified working mailboxes. Actual Zoho DNS values and operating/retention decisions remain outstanding; legal acceptance is not fabricated. |

Content approval, private publication and public /app testing cutover are complete. All nine backend rejection/preflight probes still pass after cutover; anonymous private Storage reads remain denied. Evidence: qa/main-domain-public-route-checks.json, qa/public-testing-cutover-status.json, qa/production-account-checks.json and qa/production-service-checks.json.

The reported Appearance failure was an internal route collision: Expo Router strips the /app mount from /appearance without a segment boundary, producing /earance. Commit 91a4f9a routes both Home and Account controls to /display and recovers the old /earance URL. The installed Expo parser regression, TypeScript, source checks, both CI jobs and Vercel build pass. Production browser checks confirm both buttons open /app/display, both palettes render, dark mode survives reload, and /app/earance redirects to the working screen.

Remaining customer/payment/operating flags represent outcomes that have not yet happened. Public sales acceptance is not claimed.

## Current acceptance evidence

Email signup/verification/recovery/returning sign-in, Clerk/Supabase integration and cloud restoration in a separate Chrome browser pass in production. Paddle configuration passes in live; purchase/refund/replay and full 500-question paid-browser delivery pass in sandbox. The sandbox uses the exact active production content-pack source with its existing local authorized origin. The one-off fixed artifact upload was privately read back/re-hashed and immediately removed from the active function (v14). No credential was extracted, no Storage policy broadened and no payment grant was created manually. See qa/sandbox-commerce-recheck-2026-10-24.json.

Only the demonstrated acceptance flags are marked passed. Account deletion, physical-device/screen-reader accessibility and legal/operating acceptance remain pending. The real live purchase/download path has not been executed.
