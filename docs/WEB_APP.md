# FirstLane web app — implementation and service setup

**Current authentication, 22 October 2026:** Clerk web authentication is implemented. Follow [CLERK_WEB.md](CLERK_WEB.md) for the required local variable, Edge secrets and dashboard integration. No legacy users are migrated. Supabase retains the database and Paddle retains web payments. The Supabase Auth/social-deferral setup below describes the earlier implementation and is superseded for web. Real email signup, returning sign-in, password recovery and automatic sandbox purchase fulfillment have local acceptance. Completed social sign-in, full-bank delivery and production acceptance remain pending. See the latest [QA record](WEB_IMPLEMENTATION_QA.md).

**Web question loading:** Authenticated questions load automatically for the current visit. Web has no Offline packs menu or install dialog; old `/downloads` links continue to Practice. Full content requires current server access and an approved published release. If Complete is unavailable, the fixed 40 account samples remain available with a clear retry notice; the full rehearsal stays unavailable. Native download and offline-access checks are separate future app behavior.

The real Expo web application is the customer app. Do not deploy `preview/`, the repository root, or the private authoring content. Marketing remains in the adjacent `Lane_Landing_Production` project. The planned origins are `https://getfirstlane.com` and `https://app.getfirstlane.com`.

The offer remains CAD 1499 minor units (CA$14.99), paid once, for Ontario G1 Complete. No subscription. Native iOS and Android apps are coming soon. Browser offline use is not promised.

## Local use

Use Node 22.13 or newer. Install with `npm ci` if dependencies are absent. Copy `.env.example` to `.env.local`, using the **new** Supabase project. No prior project URL is selected by default. Missing services produce an unavailable state; guest practice remains usable.

```sh
npm run web:export
npm run web:preview
```

Open `http://127.0.0.1:4174`. This runs the real Expo export with SPA fallback for authentication and learning routes. `npm run web` is also available for Metro development. Use connected mode and Paddle sandbox for staging; demo mode is only a local simulation.

## New Supabase project

The user selected a new project and Paddle sandbox, not the old mobile project. **FirstLane Web Sandbox** was created in **StorlioHQ**, **Canada Central**, with project reference `nbvstjglclolzxchjlzp`. Its URL and enabled publishable key are configured in the app's ignored `.env.local`; the landing server also points to it. No secret keys are committed.

All seven tracked migrations were applied in filename order. The final migration, `202610200001_paddle_web.sql`, adds a separate Paddle checkout/event/adjustment ledger and includes Paddle purchases in the existing account receipt RPC. Native store records are preserved. `firstlane_my_access` and `firstlane_content_release` continue to control paid access. The deployment tool recorded remote migration timestamps; `supabase/deployment.json` maps them to source filenames. Reconcile migration history before using CLI `db push` against this project.

`delete-account`, `content-pack`, `paddle-checkout`, and `paddle-webhook` are deployed, including `_shared/paddle.mjs` with the Paddle functions. All validate their own identity or webhook signature; their tracked `verify_jwt=false` settings are intentional. Do not expose the `firstlane_private` schema in the Data API. Paddle remains unavailable until its provider configuration is supplied.

Configure hosted Auth (local `supabase/config.toml` does not configure a hosted project):

- Enable email/password and require email confirmation.
- Set the Site URL to the actual staging/app origin. Allow `/auth/callback**` only on the exact development, staging and production origins being used.
- Web signup and password recovery use email links. The web verification screen checks the authenticated user's verified email before continuing. Native code verification remains separate and must be configured/tested when native release work resumes. The code-plus-link templates in `supabase/templates/` are optional future templates, not proof of hosted deployment. On 2026-10-21 this Free project's dashboard required custom SMTP or a paid plan to edit templates; the user chose to retain hosted confirmation links for web. Configure a real authentication email sender/SMTP before public launch.
- Test signup, email links, expired links, password recovery, reload, sign-out, and a second browser. PKCE email links must be opened in the browser that initiated the request. Request a new email after changing redirect settings; previously sent emails retain their old redirect.
- Set the new project's URL and publishable key in the app's `.env.local`. Configure the landing server's Supabase public settings to the same project for website account deletion.

Verified browser accounts automatically merge completed attempts and bookmarks after changes and on reconnect/focus. In-progress sessions remain local. No client can grant itself paid access or write another account's history.

### Social authentication deferred

The user deferred Google and all social authentication on 2026-10-21. Google entry points, its consent route and OAuth initiation helper have been removed. Current authentication is email/password with confirmation and recovery links for web. The hosted Google provider remains disabled; no credentials were created or configured. Do not treat social-provider setup as a current launch requirement.

Access policy: guests can repeatedly practise the same 10 fixed sample questions without an account. Signup and email verification unlock 40 fixed free questions total (including the original 10). Repeated sessions do not expose more questions. A verified account plus a valid CA$14.99 one-time purchase unlocks Ontario Complete, including the full bank and mock tests. There is no session quota, recurring subscription, or payment requirement for free signup. Guest results invite free signup rather than forcing checkout.

On 2026-10-21 the hosted Site URL was corrected from port 3000 to `http://127.0.0.1:4174` and the local callback pattern `http://127.0.0.1:4174/auth/callback**` was saved alongside the existing exact callback URL. Replace development origins with approved staging/production origins at deployment.

All three rollback-only SQL tests in `supabase/tests/`, including `paddle_acceptance.sql`, passed locally under PostgreSQL fixtures and on the new hosted sandbox. A follow-up query confirmed zero test users, purchases and grants remained. These tests do not substitute for real email verification or a provider sandbox purchase.

## Paddle sandbox setup

**21 October checkout update:** Sandbox checkout, signed webhook fulfillment and account entitlement are verified. The user completed a real sandbox test-card payment for CA$14.99 once. After the missing `PADDLE_WEBHOOK_SECRET` was privately saved, the original event was retried through Paddle's current Events → Notifications UI and returned 200. Supabase recorded one purchase/event/grant for the correct account. A duplicate event returned 200 without duplicates. The user then requested a full sandbox refund: pending access stayed active until Paddle approval, the approval webhook automatically revoked paid access, and the browser returned to exactly 40 free questions with its completed session and saved question unchanged. Replaying the original purchase event did not restore refunded access. The backend key has Prices Read and Transactions Write. Fresh-checkout automatic fulfillment, return-route behavior, second-browser paid access and the remaining adjustment cases still need testing. Full-bank delivery remains blocked: no independently approved content release is published. See [WEB_IMPLEMENTATION_QA.md](WEB_IMPLEMENTATION_QA.md). Launch approval flags remain pending.

The backend uses the default payment link configured in Paddle instead of deriving `checkout.url` from `WEB_APP_ORIGIN`. Paddle rejected the local HTTP URL override; the sandbox default is `https://127.0.0.1:4174/checkout`, while the authenticated overlay opens on the actual HTTP preview. Set a real approved HTTPS app checkout page before production. The local HTTPS default does not make email payment links usable on the HTTP preview.

The user confirms the business name is **Tervlon Labs Limited**; the sandbox dashboard displays that business. FirstLane remains the product brand. Paddle's live business verification has not been completed. The following setup checklist documents the configuration needed in each environment; sandbox checkout progress is recorded above.

The user intends to publish the future iOS app through their personal Apple Developer account. Keep this publishing identity separate from the Paddle business identity. Apple lists an individual member's personal legal name as the App Store seller; the publisher's exact name and membership have not been verified.

Create a sandbox product called Ontario G1 Complete with an active, non-recurring **CAD 14.99** price. Use no trial, discounts or country price overrides, and configure quantity minimum/maximum as 1. Configure a default payment link on the actual staging app's `/checkout` page. Live checkout later requires Paddle website approval.

Set the app's public environment values:

```text
EXPO_PUBLIC_PADDLE_ENVIRONMENT=sandbox
EXPO_PUBLIC_PADDLE_CLIENT_TOKEN=<sandbox client-side token>
```

Set the Edge Function secrets from `supabase/.env.example` through Supabase's secret settings. Never put these in `EXPO_PUBLIC_*`, the landing build, Git, or chat:

```text
WEB_APP_ORIGIN=<exact staging app origin, without a trailing slash>
PADDLE_ENVIRONMENT=sandbox
PADDLE_API_KEY=<sandbox API key>
PADDLE_PRICE_ID=<sandbox pri_...>
PADDLE_WEBHOOK_SECRET=<notification destination endpoint secret>
```

The platform supplies its own Supabase URL and service-role secret. The Paddle API key needs price-read and transaction-read/write access. Create a webhook notification destination at `https://<project-ref>.supabase.co/functions/v1/paddle-webhook` for `transaction.completed`, `adjustment.created`, and `adjustment.updated`.

Checkout requires a verified account. The backend reserves a checkout before creating a Paddle transaction, attaches the account and checkout IDs server-side, validates the price, and reuses an unfinished transaction on retry. A completed browser checkout triggers bounded server polling. Only a verified, committed server grant opens paid content.

Any approved refund of the single-pack purchase revokes that transaction's access. Pending/rejected refunds do not. Disputes and their reversals are tracked independently, with older events unable to remove a later refund barrier. An adjustment alone never creates a purchase. The full pack is still subject to separate approved-content publication.

If a transaction-creation request has an uncertain outcome, the reservation remains pending instead of creating a second payment. An operator must find the original transaction using its server-written `custom_data.checkout_id`, verify its account/offer, and reconcile it. Mark a reservation failed only after confirming no transaction/payment exists. Monitor failed webhook deliveries and replay them after fixing the underlying issue.

Test sandbox success, cancellation/resume, failed payment, delayed fulfillment, duplicate/reordered events, approved/rejected refunds, disputes, account changes, and access on a second browser. Paddle emails the transaction receipt; app history is an access/purchase record, not a substitute tax invoice.

## Release and deployment

`vercel.json` builds `dist/` and rewrites application routes to the Expo SPA. Use a separate Vercel project for the app, with the app directory as its root. Preserve the existing landing project's deployment. Set its `webAppUrl` only to the deployed app origin. The app remains noindexed; the marketing site has its own release gate.

For public paid launch use `npm run web:release:check` and `npm run web:release`. These check web approvals independently of native store approvals. Configure the app host's production build command as `npm run web:release`. Staging uses `npm run web:export` in connected mode and must remain protected/private.

Do not mark `web-release-approvals.json` passed without actual acceptance. Project setup is verified. Current external blockers are hosted Auth callback/email setup and end-to-end tests, Paddle sandbox credentials/product/webhook configuration and tests, deployment/DNS, operator/policy details, and the independently reviewed 500-question release. The user reports creating the Paddle sandbox account. The existing authoring draft is not approved for public sale and is never promoted automatically. Auth's public settings confirm email signup is enabled and email confirmation is required.

Official references: [Paddle checkout](https://developer.paddle.com/paddle-js/methods/paddle-checkout-open/), [webhook signatures](https://developer.paddle.com/webhooks/about/signature-verification/), [adjustments](https://developer.paddle.com/webhooks/adjustments/adjustment-updated/), [Supabase redirects](https://supabase.com/docs/guides/auth/redirect-urls).
