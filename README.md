# FirstLane 0.5.0 — Light-first app refresh

**Live checkout preparation, 22 October:** The live CAD14.99 one-time Paddle catalog is prepared; production checkout is still incomplete. Follow [the verified cutover record](docs/LIVE_CHECKOUT_CUTOVER.md). Vercel builds use `npm run web:build` so production runs the web release checks, with connected exports retained for previews.

**Current web authentication:** Clerk custom screens are implemented. Follow [docs/CLERK_WEB.md](docs/CLERK_WEB.md) for the public environment variable, Supabase secrets, dashboard connection and remaining acceptance tests. No former users are migrated.

FirstLane is now being prepared as a web app. Start with **[docs/WEB_APP.md](docs/WEB_APP.md)** for the new Supabase project, browser authentication, automatic progress sync, Paddle sandbox checkout, and web deployment. The real browser app runs with `npm run web` or `npm run web:export` followed by `npm run web:preview`. iOS and Android apps are coming soon.

Web checkout uses Paddle; native store billing code is retained for future native releases. CA$14.99 remains a one-time Ontario purchase. Service setup and end-to-end payment/auth acceptance are still required; this source update is not a production launch. The older native handoff below remains useful for that release path.

**Ontario G1 Complete: CA$14.99 once. No subscription. No expiry.**

A lighter version of the existing Expo / React Native app, inspired by the supplied FirstLane landing page. Warm paper backgrounds, fresh sage cards, forest-green accents, lime highlights, a calmer dock, and Home / Practice / Progress / Account navigation. The landing reference was not changed.

Start with **REFRESH_HANDOFF.md** for the changes and remaining work. **QA_REPORT.md** records what was actually checked. This is source code, not a signed app or approval to launch.

## Open the visual companion

Open `preview/index.html` directly in a desktop browser. It is self-contained and requires no install. The sidebar switches screens, appearance and guest/free/paid fixtures. At phone widths the sidebar is hidden to show the screen itself.

This companion renders the actual edited TSX modules through a small DOM adapter. It is **not React Native, an Expo build, a working backend, a payment flow or native QA**. Do not deploy it as the customer app. Its local fixtures and design-preview labels are intentional.

After installing dependencies, rebuild or serve it with:

```sh
npm run preview:build
npm run preview
```

## Run the actual app

Use Node 22.13+ and the supplied lockfile:

```sh
npm ci
```

Copy `.env.example` to `.env.local` for connected development and supply your development project's public configuration. For internal simulated testing, copy `.env.demo.example` instead. Demo mode must never be published and does not charge money or send real verification emails.

```sh
npm start
# Or, for the real Expo web runtime:
npm run web
```

Native billing needs an installed, configured native build. Start uses Expo tunnel / Expo Go; `npm run start:lan` is also available.

New installs use **Daylight**. Existing explicit appearance preferences are retained; select Daylight under Account → Appearance to change a saved dark/system preference.

## Access and commercial rules preserved

Guest access is 10 fixed samples. A verified free account has 40 fixed samples. Complete is the 500-question Ontario pack plus premium rehearsals/offline access. Ontario ownership does not include future jurisdictions. A cache re-verification interval is not purchase expiry.

The canonical offer remains `src/domain/offer.mjs`: 1499 minor units, CAD, product `firstlane_on_g1_lifetime`, entitlement `ca_on_g1_full`. Source pricing does not update either store console; verify the actual native product price before launch.

The delivered connected-mode bundle contains only the 40 samples. The full draft remains private authoring material in `content/`. Do not upload the repository to a public host.

## Checks

```sh
npm run content:bundle
npm run check
npm run doctor
npm run web:export
```

Run checks in connected mode after restoring the 40-sample bundle; an explicitly built demo intentionally contains the full draft. `check` includes dependency-aware TypeScript checking, tests, source parsing, and content structure validation.

Optional browser tests need Python and Playwright:

```sh
python -m pip install playwright
python -m playwright install chromium
npm run preview:build
npm run preview:qa
```

`preview:qa` tests only the source-rendered companion. For the **actual running demo Expo app**, start `npm run web` using `.env.demo.example`, then in another terminal:

```sh
python scripts/expo-browser-regressions.py --base-url http://127.0.0.1:8081
```

That runtime regression harness is included but was **not executed in this delivery**. It uses disposable guest/browser state and never purchases or submits an account.

## Backend / launch

All **seven** Supabase migrations are applied to the new FirstLane Web Sandbox project. All three scripts in `supabase/tests/`, including `paddle_acceptance.sql`, passed locally and on that hosted sandbox. See `docs/WEB_APP.md` for the deployment and remaining email/payment setup. Native store end-to-end acceptance remains separate.

Production still requires independently approved content, configured real services, dependency review, Expo/native validation, sandbox billing, backend acceptance, accessibility, legal review and named sign-off. These remain blocked in `release-approvals.json`.

```sh
npm run release:check
# Only after genuine approval and configuration:
npm run build:production:android
npm run build:production:ios
```

See `docs/DEPENDENCY_TRIAGE.md`, `docs/BILLING.md`, `docs/SUPABASE.md` and `docs/LAUNCH_CHECKLIST.md`. Older handoff/evidence is retained under `reference/previous-delivery` and `qa/v4`; it is not current validation.
