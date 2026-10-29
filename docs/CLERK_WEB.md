# Clerk web setup — 21 October 2026

## Production social sign-in preparation — 29 October 2026

The owner requested Google and Apple sign-in on the existing production custom domain. The prepared scope enables the existing custom buttons and OAuth callback flow. Keep this change in draft until provider configuration and real browser acceptance are complete; the live application still offers email/password. `clerkSocialSignInPassed` remains false.

Production Clerk currently has both connections disabled and empty custom credential fields. Both providers use the exact callback `https://clerk.getfirstlane.com/v1/oauth_callback`; the app continuation stays under `https://www.getfirstlane.com/app/auth/sso` and `/app/auth/callback`.

- Google: identify the owner's FirstLane Cloud project (or create a dedicated one), configure the OAuth consent screen and a Web application client with the main-domain origins and the Clerk callback, then securely save the client ID/secret in Clerk. No FirstLane project matched the search in the currently signed-in Google account. Do not reuse an unrelated application's OAuth client.
- Apple: confirm the intended Apple Developer team, then configure its Sign in with Apple App ID, Services ID, Team ID, Key ID, private key, return URL and private email relay source. The currently signed-in team is blocked by an Access Unavailable notice until its Account Holder accepts the latest Program License Agreement. The owner must resolve that agreement directly; no agreement was accepted or credential created.

After configuring each connection, test first-time signup, existing-account sign-in, cancellation, reload/session restoration, account linking and server-confirmed free-question access. Record actual results before setting social acceptance true or promoting the scope change. If only Google is ready, remove `oauth_apple` from the scope for a Google-only rollout.

## Web-only launch acceptance follow-up — 24 October 2026

Owner confirmed web only, Paddle browser payments and email/password sign-in for the initial release. `web-launch-scope.json` drives the visible authentication methods and conditional social acceptance requirement. Production Clerk Google and Apple connections were enabled but both showed Setup required with missing custom credentials; both are now disabled for the selected email/password launch. No Google Cloud project, provider key or mobile release is required for this selected scope. Browser billing uses Paddle; native billing remains a separate RevenueCat/store path. No native billing setting changed.

Fixed malformed/null deletion input returning a service error; production delete-account v4 returns 400 without mutation, valid unauthenticated confirmation 401, foreign origin 403 and preflight 204. Seven handler tests cover real RSA verification with fixture provider responses, recent-auth requirements, ownership and failure sequencing. The new hosted rollback-only deletion suite verifies erased study/session/access data, detached retained financial records, another account unchanged, stale-session rejection, idempotent retry and no reopening. Post-rollback counts: zero accounts, transactions, grants or fixtures. This does not substitute for a real disposable Clerk-account deletion through the browser. TypeScript and 43 selected auth/deletion/Paddle/release tests pass; all seven Edge entrypoints passed syntax checks.

Production still contains zero approved published content releases. Reopened the private review tool at http://127.0.0.1:4175/ and confirmed 0/500 approved, 500 needing review; the saved Downloads export also contains zero decisions. Content publication and actual paid-bank delivery remain blocked. No approval flag was changed.

Paddle returned the previously resubmitted app domain to Changes needed. Anonymous root HTTP redirects to valid HTTPS and returns 200; the exact remaining review condition is not identified. Found /onboarding returning 404 and added truthful informational rewrites for /onboarding and /plans. No further domain resubmission or default payment link was made. Final production email/recovery/deletion/cross-browser/device/content/payment acceptance and operating disclosures remain outstanding. See [LAUNCH_READINESS.md](LAUNCH_READINESS.md).

**24 October public-domain update:** `app.getfirstlane.com` now serves the isolated prelaunch product page in the separate `firstlane-review` project for Paddle review. Anonymous HTTPS and policy routes pass; Paddle shows In review after resubmission. The actual Expo app stays behind Vercel team authentication at its branch URL. The app-domain sign-in paths below are the intended production configuration, not currently public login pages. No authentication acceptance or sale is implied. See [PUBLIC_REVIEW_PAGE.md](PUBLIC_REVIEW_PAGE.md).

**24 October production setup:** Production instance `ins_3L7cxxieAWLKyxHkbJs45atlkfd` in the existing FirstLane application `app_3L1ENrJ6R5Z2BKMPH7Ulpy8K7KP` is connected to FirstLane Web Production (`jinbdlckkyzffnocuugn`, StorlioHQ). Saved the production server key only in encrypted Supabase Edge secrets and validated it from the backend: Clerk API HTTP 200, no production users returned. Issuer is `https://clerk.getfirstlane.com`; its HTTPS JWKS endpoint returns 200 with one signing key. Enabled Clerk's Supabase integration and verified Supabase's same-instance third-party provider is ENABLED. Added all five exact CNAMEs in the existing Go54/WhoGoHost zone; Clerk verifies frontend API, account portal, all three email records and issued SSL certificates. Public record inventory: `supabase/clerk-production-dns.json`. Existing root, www and mail records were preserved.

Saved production home/sign-out origin `https://app.getfirstlane.com`, sign-in `/auth/sign-in`, sign-up `/auth/sign-up`, and express legal consent with the published terms/privacy URLs. Production Google/Apple credentials and actual app signup/recovery/session acceptance remain pending. The production public key is now saved in the separate Preview and Production hosting environments; no server key was written to source or browser configuration. The temporary backend-only diagnostic was removed, leaving six application functions. Vercel Pro is verified and the protected app preview is deployed. The exact app CNAME is saved; local recursive DNS and public custom-domain HTTPS now resolve successfully. Approved content and remaining release acceptance still block public sales. See [LIVE_CHECKOUT_CUTOVER.md](LIVE_CHECKOUT_CUTOVER.md).

**22 October acceptance update:** The user completed email-code password recovery directly. Plan & billing restored the same account's Ontario Complete sandbox purchase. The exact progress fingerprint, one completed session and one saved question are unchanged; the saved ON-G1-0319 explanation opens in the browser. Signup, returning password sign-in and recovery now have local web/sandbox acceptance. Production and completed social-provider acceptance remain pending. See the latest sections of [WEB_IMPLEMENTATION_QA.md](WEB_IMPLEMENTATION_QA.md).

This is the current web authentication setup. No existing users are imported. The two legacy Supabase sandbox test identities are left untouched and have no ownership in the new web account system.

## What runs where

- `Lane_Landing_Production` → `https://getfirstlane.com`: marketing, pricing, support and legal pages.
- `review-site/` → `https://app.getfirstlane.com`: public prelaunch product page for review. The Expo web export remains on the protected `firstlane-app` Vercel branch URL until content and production acceptance are complete.
- Supabase project `nbvstjglclolzxchjlzp`: sandbox database and protected Edge Functions.

Deploy the landing and app as separate Vercel projects. Landing practice/sign-in buttons already target the app domain. Expo supplies the browser application; another frontend framework is not required. Native authentication and app-store distribution remain separate future validation work.

## 1. Create the Clerk development application

Create an application named FirstLane in your own Clerk account. Enable:

- Email address and password; require email verification.
- Email verification codes, password recovery, and email-based device-trust verification.
- Google and Apple social connections for sign-up and sign-in.

Confirmed development password policy: 8-character minimum; no required uppercase, lowercase, number, or symbol rules; extra strength enforcement off; compromised-password rejection on. Saved in the FirstLane Development Clerk dashboard on 21 October 2026 after user confirmation. Email verification remains required. Production configuration still needs its own review.

Keep usernames, required names, phone sign-in, Organizations, and additional MFA methods disabled for this initial configuration. The custom forms implement email/password, verification/recovery codes, and email device trust. Enable legal acceptance if you want Clerk to record it; provide FirstLane's actual terms/privacy URLs.

The Google and Apple buttons show their provider logos and are active immediately. On signup, selecting a provider opens an explicit terms/age confirmation step before OAuth starts. Existing-account sign-in does not require signup checkboxes. If a new person enters through social sign-in, the OAuth callback collects signup consent before transferring the attempt into a new account. Email verification and backend access checks still apply.

Email signup continuation runs from the latest Clerk hook resource after each request. A completed signup finalizes once, while a newly active session proceeds to the account-connection callback. Actual missing password/name/username/email/legal fields are collected within the same signup attempt; unsupported security requirements remain blocking. A previously completed signup can resume finalization without submitting an already-used email code. FirstLane account controls require the server-confirmed identity, and pending Clerk sessions do not establish a client identity binding.

The reported email-code failure was reproduced as a verified signup with `password` still in `missingFields`. The previous resume branch updated only email/legal acceptance, ignoring the entered password. Both signup entry and the remaining-details form now use Clerk's `signUp.password()` method to patch an existing attempt. An unchanged verified email is omitted from that patch, preserving its verification. The user enters and submits the missing password directly; no existing user is deleted or recreated. Regression tests cover this exact case, immutable resource replacement, genuine missing fields, rejected codes, pending security tasks, and recovery of a completed attempt.

Clerk supplies shared Google/Apple credentials for development. Production requires your own Google OAuth client and Apple Services ID/key/team setup. Production Apple web eligibility must be resolved with Apple before advertising it as ready: Apple's web documentation requires an associated App Store app using Sign in with Apple.

## 2. Add the public browser variable

Add to `FirstLane-Light-Refresh/.env.local`:

```dotenv
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_LOCALLY
```

Keep the existing Supabase URL/publishable key and Paddle client token/environment. Only the Clerk publishable key belongs in the browser environment. Rebuild after changing public variables; Expo inlines them at build time.

## 3. Add Supabase Edge Function secrets

In Supabase → Edge Functions → Secrets, add:

```dotenv
CLERK_SECRET_KEY=sk_test_REPLACE_IN_DASHBOARD
CLERK_ISSUER_URL=https://YOUR-INSTANCE.clerk.accounts.dev
CLERK_AUTHORIZED_PARTIES=http://127.0.0.1:4174
```

Use the exact issuer/Frontend API URL of the same Clerk instance. Do not include a trailing path or query. Keep `WEB_APP_ORIGIN=http://127.0.0.1:4174` and the existing Paddle secrets. Never put Clerk secrets in `EXPO_PUBLIC_*`, Git, screenshots or chat.

`CLERK_AUTHORIZED_PARTIES` is an exact comma-separated origin allowlist. `localhost` and `127.0.0.1` are different origins. Use the latter consistently for the current preview.

## 4. Connect Clerk and Supabase

In Clerk, enable the Supabase integration at https://dashboard.clerk.com/setup/supabase. This adds the `role: authenticated` claim to normal Clerk session tokens.

In the FirstLane Web Sandbox dashboard, open Authentication → Third-Party Auth → Add provider → Clerk. Add the exact issuer/domain from the same Clerk instance. Do not use the deprecated JWT-template integration or share Supabase's JWT secret with Clerk.

Adding environment variables alone does not create this hosted integration. This dashboard step is required for progress, receipts, and entitlement RPCs.

Set custom sign-in/sign-up paths to `/auth/sign-in` and `/auth/sign-up`. The app supplies `/auth/sso` for OAuth continuation and `/auth/callback` for verified account connection. Allow those paths on the exact local origin. The final in-app destination is restricted to supported internal routes, including checkout and account controls.

## 5. Build and test

With Node 22.13+:

```sh
npm run web:export
npm run web:preview
```

Open http://127.0.0.1:4174/auth/sign-up. The custom forms appear after Clerk loads. Until a publishable key exists, sign-in shows an honest unavailable state and guest practice remains usable.

Complete real acceptance before launch:

1. Email signup → code verification → 40 questions → reload → sign-out → 10 guest questions.
2. Email sign-in, a wrong code, resend, password recovery and device trust.
3. Google/Apple success, cancellation, first-time signup and existing-account sign-in.
4. Progress/bookmarks in another browser; no account can read or write another account's rows.
5. Repeated guest/free sessions, bookmarks, direct question links and resumed sessions remain in the fixed tier.
6. Paddle sandbox purchase completion, delayed webhook, repeated clicks, refund and dispute/reversal. The offer remains CAD 1499, paid once.
7. Account deletion after a recent sign-in; deleted identities cannot regain data or grants through a stale token or payment replay.

No production approval is implied by a successful build or SQL test. The independent content review and real payment/provider flows are still required.

## Implemented security model

The backend verifies RS256 signatures against the configured Clerk issuer's JWKS, issuer/origin/time claims, Clerk's active session and currently verified primary email. User-editable metadata never grants access.

`firstlane_bind_clerk_account` is service-only. It creates a FirstLane UUID for the verified Clerk identity and binds a short-lived `(issuer, subject, session)` authorization record, bounded by the JWT's expiry and 90 seconds. RLS and account RPCs resolve that exact binding and reject legacy Supabase tokens, other sessions and deleted accounts. The browser refreshes this binding while active and before sensitive operations.

Guest web bundles contain 10 fixed questions. `free-questions` serves the fixed 40 only after verified authentication. Free samples are internal testing content until independent approval; live mode refuses an unapproved server sample payload. Complete content still requires a valid server grant and an approved publication. Browser access does not fall back to an offline paid-access cache.

Deletion disables database identity and removes study data/grants before deleting the Clerk user. A minimal identity tombstone prevents resurrection. Paddle records are detached from the account, and deleting an account does not request a refund. Retention/privacy review remains a launch requirement.

The landing deletion page now links to the app's `/account` flow. Its former Supabase Auth OTP adapter returns HTTP 410 and makes no upstream calls. The public HTTPS app link and disposable-account deletion still require end-to-end acceptance before launch.

## Sandbox deployment and validation

- Applied `20261021191748_clerk_web_accounts.sql` to the sandbox; remote version `20261021193619`.
- Deployed `clerk-account`, `free-questions`, `paddle-checkout`, `content-pack` and `delete-account`.
- Local TypeScript and Expo web export passed; 122 JavaScript tests passed, including real RSA verification and tier-repeat checks.
- Local historical commerce/refund SQL acceptance passed before the new schema. New Clerk RLS/ownership and Paddle acceptance scripts passed locally and on the hosted sandbox, with rollback. A follow-up count confirmed zero account/session/progress/purchase fixtures remained.
- The Supabase advisor reports intentionally private RLS tables without client policies ([notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)) and six caller-scoped security-definer functions with fixed search paths ([notice](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)). Identity/commerce mutation functions remain service-only. The [legacy Supabase password-protection warning](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) does not validate Clerk configuration.
- Clerk keys/provider setup, real email/OAuth, multi-browser progress, complete Paddle purchase/refund, and production deployment remain unverified.

Follow-up: local Clerk public configuration now loads, and the hosted protected endpoints return 401 for unsigned requests rather than a missing-configuration error. The branded Google sign-in button reaches Google's account chooser, and Apple reaches the Apple Account login screen, using Clerk's shared development credentials. Both signup buttons open their matching consent step before OAuth. TypeScript, the web export, and 28 targeted authentication/session/access tests passed after this update. Provider sign-in completion, account binding, and access after sign-in still require a real user test; reaching a provider's login screen is not a completed acceptance.

Real email signup follow-up, 21 October 2026: after the user completed the remaining password step, the browser showed FirstLane Free. A read-only sandbox query confirmed one active, verified account for the correct Clerk issuer with a current session binding. The Practice page displayed 20 topics whose actual loaded free-question counts summed to exactly 40 (not merely the plan banner). No password, token, email code, or personal identity was recorded in this check. Recovery, cross-browser progress, completed Google/Apple flows, and payment acceptance remain outstanding. Public launch approvals are unchanged.

Password sign-out/re-sign-in acceptance, 21 October 2026: the initially empty account received one UI-created, one-question test session in Emergency vehicles and roadside responders (100% accuracy), plus its saved question. Supabase confirmed both were synced before sign-out. Signed-out practice contained exactly 10 guest questions and locked that account-only topic; the saved account data remained unchanged. The user signed back in directly. Read-only checks confirmed the same verified account, a current session binding, one saved session, one bookmark, and an identical progress-record digest. The UI restored the test progress and the exact saved question, and actual loaded topic counts again summed to 40 across 20 topics. Evidence: `qa/clerk-signout-guest-confirmed.png`, `qa/clerk-relogin-progress.png`, `qa/clerk-relogin-saved-question.png`, and `qa/clerk-relogin-40-questions.png`. No password or token was collected. This validates the local web/sandbox round trip; production approval and the remaining flows above are unchanged.

For production, provision a separate Clerk production instance with production provider credentials, production domain/DNS/email settings, a separate approved Supabase production environment, exact production origins and Paddle live configuration. Do not reuse the sandbox as proof of production acceptance.

Official references: [Supabase Clerk integration](https://supabase.com/docs/guides/auth/third-party/clerk), [Clerk custom flows](https://clerk.com/docs/guides/development/custom-flows/overview), [Google](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/google), [Apple](https://clerk.com/docs/guides/configure/auth-strategies/social-connections/apple), [Apple web prerequisites](https://developer.apple.com/documentation/signinwithapple/configuring-your-environment-for-sign-in-with-apple).

Tax decision, 21 October 2026: the owner chose CA$14.99 once plus applicable tax. The sandbox catalog price is explicitly tax-exclusive. Production must use the same deliberate tax mode, and checkout should show tax and total for the actual buyer location. This changes neither the CAD1499 base offer nor the one-time grant. Historical tax-inclusive transactions remain valid for refunds and replay protection.
