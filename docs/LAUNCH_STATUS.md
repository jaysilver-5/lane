# Launch status — 24 October 2026

Target: `https://getfirstlane.com/app`, served on the existing canonical `https://www.getfirstlane.com/app`. Paddle already approves the main domain. The app and marketing changes remain in draft PRs [lane #2](https://github.com/jaysilver-5/lane/pull/2) and [getfirstlane #4](https://github.com/jaysilver-5/getfirstlane/pull/4).

## Completed technical work

- Production account isolation, progress/concurrency, stale-session rejection and database deletion suites passed. Every fixture was rolled back; production still has zero accounts, sessions, purchases, grants and published content releases.
- All 16 private tables are inaccessible to browser roles. Public tables have RLS. The content bucket is private and has no anonymous read policy. Identity/commerce mutation functions remain server-only.
- Reviewed the six intentionally authenticated SECURITY DEFINER functions: fixed empty search paths and current account/session checks. Their advisor notices are documented in the evidence file; they do not grant arbitrary access.
- Deployed `content-pack` v4 to production. It now enforces the configured browser origin before private content services. Nine unauthenticated/preflight probes pass. Signed identity, paid ownership and approved-publication checks remain required.
- Production backend origin and Clerk authorized parties now use `https://www.getfirstlane.com`. Clerk home/sign-out and sign-in/sign-up paths are saved under `/app`. The old app subdomain and foreign origins are rejected by content delivery.
- Vercel Production now has `EXPO_PUBLIC_WEB_APP_URL=https://www.getfirstlane.com/app` and `EXPO_PUBLIC_WEB_BASE_PATH=/app`; these apply to the next deployment. All 222 app tests, TypeScript and seven Edge Function syntax checks passed locally.
- Sandbox database tests passed for duplicate/out-of-order payment events, reservation/receipt ownership and pending/approved refunds, with all fixtures rolled back. This is separate from an actual Paddle checkout/refund test.
- Prepared `/app` exports, browser authentication/payment return paths, deep-link reloads and isolated marketing routing. Increased the small section-action and desktop account-link click targets. The release validator now rejects the old app hostname or a mismatched export mount.
- Added `npm run content:review:check -- <export.json>` to reconcile saved reviewer decisions against the exact bank hash and question revision hashes. It rejects self-review, stale records, future timestamps and conflicting exports. It never creates an approved release.

`backendSecurityPassed` now records these technical checks, with [evidence](../qa/production-technical-evidence.json). Other release flags remain pending because those end-to-end outcomes have not occurred.

## Still required for the planned paid launch

| Area | Exact remaining work |
|---|---|
| Questions | The current browser workbench and saved export both show **0/500** approved. Review each keyed answer, distractor, explanation, exceptions and source, and record a rights basis for the original content. There are 250 paired concepts, including 200 text-description sign questions. These are not sign-recognition images. Coverage and feature claims must match that scope. |
| Rehearsals | The proposed 40-question, 20/20, 16-per-section template still lacks recorded authority confirmation. DriveTest confirms multiple choice, no timer, sections and an 80% total requirement, but its current page does not substantiate those exact counts/per-section settings. Keep the official-format claim unapproved until resolved. |
| Approved delivery | Assemble a release from the actually approved revisions, upload it to private versioned storage, record checksum/bytes/version/named approval, publish approved free samples, then verify real guest/free/paid/refunded access boundaries and automatic 500-question delivery. There is currently no release to deliver. |
| Account/customer flows | Complete real production email signup, verification, sign-in, recovery, second-browser progress sync and a disposable-account deletion. Database/synthetic-provider tests do not substitute for those external flows. Physical mobile-browser and screen-reader checks also remain. |
| Payment | Configure the functioning approved-host `/app/checkout` default payment link; verify a controlled CA$14.99 plus tax live purchase, signed automatic fulfillment, restoration and refund/revocation. No live charge or refund was made. |
| Operations and policies | Create and monitor `support@getfirstlane.com` and `privacy@getfirstlane.com`; configure Zoho's actual verification/MX/SPF/DKIM values and test delivery. Supply the public business correspondence address and confirm implemented retention, backup/log expiry, transaction-retention purpose and legal wording. These values cannot be invented. |
| Cutover | Rebuild with the configured Vercel public app URL/base path. Replace the marketing rewrite's protected preview upstream with a validated production deployment. Only expose app/purchase actions once the corresponding checks pass. |

The production backend now allows `https://www.getfirstlane.com`; all nine rejection/preflight probes passed against that origin. Backend origins contain no `/app`. Public app routing is still pending the production deployment and acceptance checks. See [the cutover sequence](MAIN_DOMAIN_APP.md).

## Owner actions that unblock further acceptance

1. Use the private workbench at `http://127.0.0.1:4175/`, review and export decisions. No decisions were entered on the owner's behalf. Check the export with `npm run content:review:check -- --out content/review/status-launch.json <export.json>`.
2. Create the two Zoho mailboxes above. The current public MX points to `getfirstlane.com`, which is the website host; it is not a Zoho mail setup. Use the exact records supplied by the chosen Zoho account/region. Existing Clerk/email DNS should be preserved unless its provider explicitly requires a change.
3. The owner has deferred the real public correspondence address and Zoho setup until later. They remain incomplete; actual retention/operating decisions are also required. Existing policy drafts cannot be marked reviewed merely because pages load.
4. Once the approved bank and canonical-host deployment are ready, complete the prepared real account/password and payment steps. Account creation, password recovery, physical devices and real payment acceptance remain explicitly unverified.

## Evidence and sources

- [Production technical evidence](../qa/production-technical-evidence.json), [service rejection probes](../qa/production-service-checks.json), and [exact content-review status](../content/review/status-launch.json).
- [DriveTest knowledge tests](https://drivetest.ca/tests/knowledge-tests/): current test/study guidance; the online handbook is partial.
- [Ontario copyright information](https://www.ontario.ca/page/copyright-information): commercial reproduction of government materials has specific conditions. Original factual questions still need their documented rights review; access to a source page is not itself a reproduction licence.
- Advisor references: [private RLS tables without policies](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) and [authenticated SECURITY DEFINER interfaces](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
