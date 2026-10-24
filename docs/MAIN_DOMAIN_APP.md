# FirstLane app at /app — 24 October 2026

The owner selected the main-domain layout to stop depending on separate Paddle approval for app.getfirstlane.com. A fresh live dashboard read confirms getfirstlane.com has Checkout approved and Apple Pay approved; app.getfirstlane.com still shows Changes needed.

## Addresses and routing

- `https://getfirstlane.com/` remains the marketing website and redirects to its existing canonical `www` host.
- `https://getfirstlane.com/app` therefore opens `https://www.getfirstlane.com/app`.
- `/pricing`, `/terms`, `/privacy`, `/refunds`, `/support` and `/delete-account` remain marketing routes.
- `/app/**` belongs to this Expo application. Expo Router and bundled resources use `/app`; raw Clerk/browser/Paddle links use the same prefix explicitly. Router destinations such as `/plans` remain unprefixed in source because Expo Router adds the base path.
- The marketing Vercel project proxies only `/app` and `/app/**` to this project's branch deployment, preserving the public hostname. This project maps prefixed asset requests to its exported static assets and app deep links to `index.html`.

No DNS record is needed for a URL path. No app-domain approval is claimed. Paddle's approved root-domain checkout also accepts its `www` variant (see its go-live checklist).

## Configuration when ready for public cutover

Use `EXPO_PUBLIC_WEB_BASE_PATH=/app` and `EXPO_PUBLIC_WEB_APP_URL=https://www.getfirstlane.com/app` in the app's Preview and Production environments, then rebuild. Production still runs the existing release checks.

The backend uses browser **origins**, not URL paths: production `WEB_APP_ORIGIN` and `CLERK_AUTHORIZED_PARTIES` must be `https://www.getfirstlane.com`, with no `/app`. Do not broaden them to arbitrary origins. Keep local sandbox origin settings for local tests.

In Clerk production, change the app home/sign-out URL to `https://www.getfirstlane.com/app`, sign-in to `/app/auth/sign-in`, sign-up to `/app/auth/sign-up`, and fallback/callback to `/app/auth/callback`. Preserve the existing `clerk.getfirstlane.com` DNS and email records. Validate email signup, recovery, returning sessions and deletion on the canonical host.

After an actual production checkout page is ready, set Paddle's default payment link to `https://www.getfirstlane.com/app/checkout`. It must load Paddle.js and use the live configuration. Do not set this link to a preview page, a Vercel login screen or a nonfunctional route.

## Delivery status and sequence

This migration is prepared in source and preview; it is **not a completed public launch**. On 24 October, production backend origin/authorized parties and Clerk home/sign-out/sign-in/sign-up paths were saved for the canonical main-domain app. The nine service rejection/preflight probes pass from the new origin. Paddle's payment link, DNS and deployment protection remain unchanged. The existing app project remains behind Vercel team authentication. Do not merge the marketing proxy while the upstream still requires that authentication; an external rewrite does not make a protected app publicly usable. See [current launch status](LAUNCH_STATUS.md).

1. Validate the protected app build and `/app` routes, assets, auth callback and payment return. The migration branch's verified protected preview is `https://firstlane-app-git-codex-firstlan-2b8308-joshs-projects-e9dac4f7.vercel.app/app`.
2. Complete approved content publication and the remaining production acceptance checks. Moving the URL does not satisfy these checks.
3. Deploy the gated production app using the configured canonical-host settings above, and validate the production flows.
4. Point the marketing `/app` rewrite at the validated production deployment (the prepared rewrite currently identifies the existing protected branch), deploy it, and only then mark `webAppAvailable` true. Keep marketing policies accessible throughout.
5. Configure the functional default payment link and validate the approved-host checkout before opening sales. Keep the old subdomain until the new route has passed; retire or redirect it separately after cutover.

References: https://developer.paddle.com/build/go-live-checklist/ ; https://docs.expo.dev/more/expo-cli/#hosting-with-sub-paths ; https://vercel.com/docs/routing/rewrites

## Verification

The migration commit passed all 215 app tests in GitHub CI, TypeScript, source/Edge/content checks and a full Expo export. Both Vercel preview projects built successfully. On the hosted protected app, `/app/auth/sign-in` renders the actual email/password form without console errors; no account or payment was submitted. Local combined-host checks passed root, all policy/pricing routes, auth callback and checkout-return deep links. Browser onboarding, guest home, a five-question practice session and reloading `/app/quiz` stayed under the mount without console errors. These checks do not establish live production signup, recovery, checkout, content publication or deletion acceptance.
