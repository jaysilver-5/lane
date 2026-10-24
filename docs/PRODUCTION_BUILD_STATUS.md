# Production build and acceptance candidate — 24 October 2026

The earlier failed Vercel production attempt [6YdZRwFca](https://vercel.com/joshs-projects-e9dac4f7/firstlane-app/6YdZRwFcaQDqKJbLoRVgNjmGRGD3) redeployed old commit aed8a2c and stopped at the public-release checklist before Expo compilation. It was not a compiler failure in the latest main-domain source.

The owner has now accepted the 500-question AI editorial review. Exact-revision content approval and a separate original-text rights basis are recorded; independent-human or official certification is not claimed.

Public-release acceptance still checks actual customer/payment/operating results. Those results cannot precede every production test build. The host now supports an explicit FIRSTLANE_WEB_DEPLOYMENT_STAGE=acceptance, routed to web-release.mjs --acceptance. It requires the production Clerk/Supabase/Paddle configuration, canonical WWW/app mount and exact approved content, while deferring only the external release-acceptance checklist. It never sets acceptance flags or silently selects sandbox mode. The normal npm run web:release:check command continues to require all acceptance outcomes, regardless of the host-stage variable.

Keep Vercel Authentication set to All Deployments for this candidate. This was verified in the dashboard before selecting the stage. An acceptance build is not approval to expose sales or claim completed customer tests. Before final public release, remove the acceptance stage, finish the recorded checks and run the normal public gate. Use the latest migration source, not an old failed deployment.

The remaining tasks and current evidence are in [LAUNCH_STATUS.md](LAUNCH_STATUS.md).

## Expo configuration gate correction

The first acceptance attempt at commit 4136c23 reached approved content generation, then Expo's app.config.ts ran the full public acceptance gate again. The host script and Expo configuration now select the same explicit acceptance policy. Actual Expo config-loading tests cover the private candidate, public-release rejection, missing live services and native store builds; the acceptance stage cannot waive native store requirements.
