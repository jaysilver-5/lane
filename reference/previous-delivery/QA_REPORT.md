# FirstLane 0.4.0 — Verification report

**Run date: October 6, 2026.**  
**Scope: source/package hardening, domain logic, static landing and internal HTML companion.**

## Executed checks

| Check | Result | What it establishes |
|---|---|---|
| Node test suite | **70 passed; 0 failed** | Domain regressions and source-contract guards; some tests inspect source text rather than executing a native SDK |
| TypeScript/TSX source parser | **62 files passed** | Parse validity and checked relative imports, not dependency-aware types |
| JavaScript supporting scripts | **25 files passed syntax checking** | Parser-only validation of .js/.mjs/.cjs files |
| Question-bank structure | **500 questions; 250 concepts; structure passed** | Structural validity only; independent/rights review still pending |
| Connected content bundle | **40 fixed samples** | Full 500-question draft is not imported by the connected client |
| Internal browser flow suite | **112 checks passed; 0 JavaScript errors** | HTML companion's simulated navigation/access/payment flows |
| Responsive browser sweep | **132 checks passed; 0 JavaScript errors** | Landing and 21 companion routes at six viewport sizes; no measured horizontal overflow |
| Production release gate | **Blocked as expected, exit 2** | Missing production configuration, approved content and real acceptance are not silently bypassed |

Responsive sizes: **320×568, 375×667, 390×844, 430×932, 768×1024 and 1440×900**. Screenshots for selected sizes/routes are in `qa/v4/` and were spot-checked visually. These are the static landing/companion, **not native app screenshots**.

Browser tests used Playwright/Chromium `page.set_content` and a localStorage mock because this environment blocked localhost browser navigation. They do not verify HTTP hosting, deployment headers, real network auth, service workers, mobile keyboards or native behavior.

## Evidence and commands

`qa/v4/logs/` contains final command output, including the expected release block and the unsuccessful full typecheck. Browser JSON reports and screenshots are in `qa/v4/flows/` and `qa/v4/responsive/`.

```sh
node --test tests/*.test.mjs
node scripts/check-source.mjs
node scripts/check-content.mjs
node scripts/bundle-content.mjs
python scripts/browser-qa-v4.py
python scripts/responsive-qa.py
node scripts/release-check.mjs
```

The parser used an available global TypeScript installation through `TYPESCRIPT_PATH` because project dependencies could not be installed. This is explicitly different from `npm run typecheck`.

## Not passed or not performed

- **Dependency installation / full TypeScript check:** dependency fetching could not complete due package-registry network access. The full project typecheck is not passed; missing Expo/React packages and types prevent a meaningful dependency-aware result. Do not interpret a parser pass as a successful build.
- **Expo/native validation:** no successful Expo export, Expo Doctor, dependency vulnerability audit, signed iOS/Android build or installed-device run is claimed.
- **Real billing/services:** no real store product price was edited; no native purchase, refund, restore, RevenueCat webhook, Supabase auth/email/RLS/deletion/sync or private content download was exercised against the user's services.
- **Database:** SQL migrations and Edge Function imports were reviewed as source and parsed where applicable, not executed against a PostgreSQL/Supabase instance. No backend penetration or load test is claimed.
- **Content/legal/accessibility:** no independent question/rights approval, production legal approval, native visual sign renderer, or VoiceOver/TalkBack certification was performed.
- **CI:** a workflow is supplied for repeatability; no hosted CI execution is claimed.

## Release decision

**Do not publish this source as-is.** It is the updated production-hardening package. Finish the remaining steps in `PRODUCTION_HANDOFF.md`, resolve install/build issues and native test findings, and record genuine approvals. The release gate must pass because the prerequisites are fulfilled, not because it was removed.
