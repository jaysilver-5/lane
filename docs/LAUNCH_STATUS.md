# Launch status — 24 October 2026

Target: https://getfirstlane.com/app, served at the existing canonical https://www.getfirstlane.com/app. The app and marketing migration are in [lane #2](https://github.com/jaysilver-5/lane/pull/2) and [getfirstlane #4](https://github.com/jaysilver-5/getfirstlane/pull/4).

## Content approved by the owner

The owner explicitly accepted the completed AI editorial review and instructed us to proceed. Independent human review is no longer an internal launch prerequisite for this release. [The acceptance receipt](../content/approvals/owner-2026-10-24.json) binds that instruction to the reviewed bank and AI report hashes. The [approved 1.0.0 release](../content/release/ontario-g1.approved.json) covers all 500 exact question revisions and preserves their immutable payloads.

This is owner acceptance on an AI editorial basis, with no independent human, legal or government certification claimed. The originality basis is original factual text with no copied sign artwork or other third-party media; no government prose/artwork licence is assumed. The 200 sign prompts describe signs in words. There are 250 paired concepts, no empirically calibrated exam or comprehensive printed-handbook claim. The 40-question session is an approved FirstLane editorial practice format, without an asserted official-format certification.

The 500-question AI review corrected 44 revisions: 16 wording/explanation and 28 citation-only changes. The exact ledger and change history are linked in [the editorial report](../content/review/EDITORIAL_REVIEW_2026-10-24.md). Independent human decisions remain 0/500 as historical provenance; that count is not a new request for another reviewer.

## Verified technical work

- All 232 JavaScript tests pass, plus TypeScript, 94-file source checks, seven Edge Function entrypoint checks and content-integrity/approval validation. Exact-answer changes, missing/duplicate approvals and misleading certification claims are rejected.
- Production account isolation, progress/concurrency, stale-session rejection and database deletion suites passed with rollback. Private tables/storage remain inaccessible to browser roles; intentional authenticated RPCs check current account/session ownership.
- Content-pack v4 enforces the exact configured browser origin. Nine unauthenticated/preflight rejection probes pass against the canonical WWW origin.
- Production Clerk/backend origin configuration and Vercel URL/base path use WWW and /app. Root policies stay on marketing routes. No DNS record is required for /app.
- The approved 40-question free sample has been deployed as free-questions v6. It still requires a verified live Clerk account; anonymous requests return 401.
- The full private artifact is prepared: version 1.0.0, 500 questions, 1,333,762 bytes, SHA-256 21bf800ca3444d2a0a730eb164f9413b74a9f102b6400a956f92cd3b96fd9261. Chrome file access blocked automated upload. The owner has the exact file and private bucket upload instructions; no publication row is inserted before verifying the file.
- Vercel Authentication is enabled for All Deployments, with no active share links or bypass secrets. A separate explicit production acceptance build stage allows compilation with live services and approved content before external customer checks are complete. The normal public-release command retains the full acceptance gate. Protection must remain enabled for an acceptance candidate.

## Remaining execution

| Area | Remaining work |
|---|---|
| Private pack delivery | Upload ontario-g1-1.0.0-21bf800c.json into production content-releases, verify bytes/checksum, then insert its approved publication record. Test real free/paid/refunded access and automatic delivery. |
| Production candidate and cutover | Build the current migration source with the explicit acceptance stage and verify /app assets/deep links. Replace marketing's protected-preview upstream with the validated production destination. The main-domain candidate must be reachable for real Clerk/Paddle acceptance before public sales. |
| Real accounts | Email signup/verification/sign-in/recovery, second-browser progress and disposable-account deletion still need real production execution. Database tests do not claim these outcomes. Password entry belongs to the user. |
| Payments | Set Paddle's default payment link only after the canonical /app/checkout works. Complete a controlled CA$14.99 plus tax purchase, fulfillment/restoration and refund/revocation. No live transaction has occurred. |
| Device/accessibility | Complete physical mobile-browser and screen-reader checks. |
| Deferred operations | The owner deferred Zoho mailboxes and the real correspondence address. support@getfirstlane.com and privacy@getfirstlane.com are configured in copy but are not verified working mailboxes. Actual Zoho DNS values and operating/retention decisions remain outstanding; legal acceptance is not fabricated. |

Content approval is complete. Remaining customer/payment/operating flags represent outcomes that have not yet happened. No public sales or successful public cutover is claimed.
