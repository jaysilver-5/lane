# Web Analytics and Speed Insights

The production browser app includes `@vercel/analytics` 2.0.1 and `@vercel/speed-insights` 2.0.0. Expo resolves `WebTelemetry.web.tsx` only for web; native builds use the no-op `WebTelemetry.tsx`. Connected previews and local development do not report data.

The Expo pathname supplies explicit page views, so query-only navigation does not create duplicate views. Only allowlisted static screen names are reported. The filter removes query strings and fragments and excludes auth callbacks, SSO returns, payment returns and unknown paths. No custom events, account IDs, answers, email fields or payment references are added. The app's `strict-origin` referrer policy also prevents query data from appearing in referrer headers.

Scripts and intake requests use `/app/_vercel/insights/*` and `/app/_vercel/speed-insights/*`. The main site's existing `/app/*` proxy forwards them to the app project; the app's specific rewrites resolve them to Vercel's native intake routes before the SPA fallback. Enable the services on the `firstlane-app` Vercel project, not the marketing project. Root marketing pages do not load these scripts.

The active production branch is `codex/firstlane-main-domain-app`, while the repository's `main` branch is an older native baseline. This change targets that existing production branch without merging the separate launch-preparation pull requests or changing release acceptance flags.

Dashboard enablement and an end-to-end intake check are separate from installing the packages. During this work the signed-in dashboard connection was lost before either Enable action was used. Vercel's current documentation describes standard Speed Insights as free within its allocation, and Web Analytics on Pro as usage-billed at US$0.03 per 1,000 events, subject to existing plan credits. No Plus add-on, paid activation or spend-management change is authorised by this document.

The three focused privacy-filter tests pass locally. Full CI/typechecking, Expo export and deployment status are recorded in the pull request. Marketing privacy/cookie disclosures are updated separately before collection is enabled.
