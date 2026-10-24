# FirstLane app at /app — 24 October 2026

The owner selected the main-domain layout to stop depending on separate Paddle approval for app.getfirstlane.com. A fresh live dashboard read confirms getfirstlane.com has Checkout approved and Apple Pay approved; app.getfirstlane.com still shows Changes needed.

## Addresses and routing

- `https://getfirstlane.com/` remains the marketing website and redirects to its existing canonical `www` host.
- `https://getfirstlane.com/app` therefore opens `https://www.getfirstlane.com/app`.
- `/pricing`, `/terms`, `/privacy`, `/refunds`, `/support` and `/delete-account` remain marketing routes.
- `/app/**` belongs to this Expo application. Expo Router and bundled resources use `/app`; raw Clerk/browser/Paddle links use the same prefix explicitly. Router destinations such as `/plans` remain unprefixed in source because Expo Router adds the base path.
- The marketing Vercel project proxies only `/app` and `/app/**` to the verified production alias `https://project-n8lqe.vercel.app`, preserving the public hostname. This project maps prefixed asset requests to its exported static assets and app deep links to `index.html`.

No DNS record is needed for a URL path. No app-domain approval is claimed. Paddle's approved root-domain checkout also accepts its `www` variant (see its go-live checklist).

## Configuration when ready for public cutover

Use `EXPO_PUBLIC_WEB_BASE_PATH=/app` and `EXPO_PUBLIC_WEB_APP_URL=https://www.getfirstlane.com/app` in the app's Preview and Production environments, then rebuild. Production still runs the existing release checks.

The backend uses browser **origins**, not URL paths: production `WEB_APP_ORIGIN` and `CLERK_AUTHORIZED_PARTIES` must be `https://www.getfirstlane.com`, with no `/app`. Do not broaden them to arbitrary origins. Keep local sandbox origin settings for local tests.

In Clerk production, change the app home/sign-out URL to `https://www.getfirstlane.com/app`, sign-in to `/app/auth/sign-in`, sign-up to `/app/auth/sign-up`, and fallback/callback to `/app/auth/callback`. Preserve the existing `clerk.getfirstlane.com` DNS and email records. Validate email signup, recovery, returning sessions and deletion on the canonical host.

After an actual production checkout page is ready, set Paddle's default payment link to `https://www.getfirstlane.com/app/checkout`. It must load Paddle.js and use the live configuration. Do not set this link to a preview page, a Vercel login screen or a nonfunctional route.

## Delivery status

Public /app testing is deployed. The owner explicitly approved public testing and saved Standard Protection. The production app alias returns 200 anonymously; preview/deployment URLs retain Vercel authentication. Marketing PR #4 merged as 3a42d73 and deploys /app rewrites to the stable production alias above. Marketing sales availability stays false until the remaining acceptance outcomes are recorded.

The approved 1.0.0 question release is published in private production Storage. Paddle saved and approved the canonical default payment link; the authenticated live SDK opens the actual checkout. Owner-created production signup/verification, Clerk/Supabase binding, 40 free questions and a completed practice result saved to cloud storage pass. Production recovery/returning sign-in and cross-browser progress restoration subsequently pass. Actual paid sandbox delivery of all 500 questions, refund revocation and replacement payment fulfillment also pass using the exact production delivery source. No real charge, production paid customer download, account deletion or physical-device acceptance is claimed. See [current launch status](LAUNCH_STATUS.md).

## Appearance route compatibility

The installed Expo base-path parser strips /app from an internal /appearance destination without a segment boundary, producing /earance. Both Appearance controls use /display, which resolves correctly through the actual parser; /earance redirects to /display to recover old failed URLs. Existing direct /app/appearance bookmarks still work. No framework dependency or preference-storage change is required.

## Verification

All 238 app tests, TypeScript, 96 source-file checks, seven Edge entrypoints, content integrity and full Expo export pass in CI. Both Vercel app/review builds pass. Actual production checks pass Home/Account Appearance navigation, Daylight/Night drive palettes, reload retention and recovery from /app/earance. App/auth/checkout/quiz deep links, JavaScript and all root policy/support pages return 200. Guest onboarding/practice/reload pass without browser errors. Nine backend rejection/preflight probes pass after cutover; anonymous full-pack Storage reads remain denied.

References: https://developer.paddle.com/build/go-live-checklist/ ; https://docs.expo.dev/more/expo-cli/#hosting-with-sub-paths ; https://vercel.com/docs/routing/rewrites
