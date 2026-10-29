# Web Analytics and Speed Insights

The production browser app includes `@vercel/analytics` 2.0.1 and `@vercel/speed-insights` 2.0.0. Expo resolves `WebTelemetry.web.tsx` only for web; native builds use the no-op `WebTelemetry.tsx`. Connected previews and local development do not report data.

The Expo pathname supplies explicit page views, so query-only navigation does not create duplicate views. Only allowlisted static screen names are reported. The filter removes query strings and fragments and excludes auth callbacks, SSO returns, payment returns and unknown paths. No custom events, account IDs, answers, email fields or payment references are added. The app's `strict-origin` referrer policy also prevents query data from appearing in referrer headers.

Scripts and intake requests use `/app/_vercel/insights/*` and `/app/_vercel/speed-insights/*`. Specific main-site rewrites forward them directly to the app project's native `/_vercel/*` endpoints before the general `/app/*` proxy. The app has matching external rewrites for visits to its own production alias. An external request is necessary because a relative internal rewrite does not invoke Vercel's reserved telemetry handlers. Root marketing pages do not load these scripts.

The active production branch is `codex/firstlane-main-domain-app`, while the repository's `main` branch is an older native baseline. This change targets that existing production branch without merging the separate launch-preparation pull requests or changing release acceptance flags.

Standard Web Analytics is enabled on the `firstlane-app` Vercel project. Standard Speed Insights is available within its free allocation. No Plus add-on or spend-management setting was changed. Existing Vercel plan usage limits and overage pricing still apply.

All 241 app tests, TypeScript checks, source checks, edge checks and content checks passed. CI also validated the Expo export. Marketing privacy/cookie disclosures were deployed before collection was enabled. Live verification found the native script endpoints healthy and prompted the explicit proxy correction above.
