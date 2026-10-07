# Dependency triage — 7 October 2026

## Status: unresolved, not waived

The supplied QA audit reports 26 advisories: 15 high and 11 moderate. That is the **input audit's result**, not a new count measured by this delivery. A fresh `npm audit --omit=dev --audit-level=high` could not contact the npm audit endpoint (`EAI_AGAIN registry.npmjs.org`). `npm ci` also failed with unavailable registry/DNS access. Logs are under `qa/refresh/`.

No `npm audit fix --force`, arbitrary Metro/Router override, or Expo downgrade was applied. The locked dependency resolutions are unchanged. Only package version metadata and npm scripts changed.

## Lockfile/source exposure review

| Package present | Locked version | Current advisory checked | Exposure assessment, not an exemption |
|---|---|---|---|
| braces | 3.0.3 | GHSA-vfj7-8cjw-p6xm / CVE-2026-93687: high, affects through 3.0.3; no patched version listed when checked. | Reachable through micromatch/build tooling in the lockfile. No direct app-source import found. Build/CI inputs still matter; shipped-bundle reachability was not measured. |
| node-forge | 1.4.0 | GHSA-86w9-cpqp-85rv / CVE-2026-85393: high, affects through 1.4.0; no patched version listed when checked. | Expo CLI/code-signing dependency chain is present. No direct learning-app import found. Signing/update tooling is security-sensitive; do not assume harmless because it is transitive. |
| Remaining audit findings | Not freshly enumerated | Original report lacks full advisory JSON. | Obtain a complete current audit before assigning exposure or an exception. The two rows above do not account for all 26 entries. |

The advisory facts come from the GitHub-reviewed records below. Exposure is an inference from this repository's lockfile/imports, not a complete installed call graph or emitted-bundle analysis.

## Required owner work

Run in a clean, networked build environment:

```sh
npm ci
npm audit --omit=dev --json > audit-production.json
npm audit --json > audit-all.json
npm explain braces
npm explain node-forge
npm ls expo expo-router @expo/metro @expo/metro-config metro metro-config braces node-forge
npx expo install --check
npx expo-doctor
```

Review Expo's supported upgrade process rather than forcing a package-tree repair. Select compatible supported release lines, update in a dedicated branch, regenerate the lockfile, and rerun `npm run check`, Expo web export, installed iOS/Android tests and billing acceptance. Where an upstream fix is unavailable, document the exact vulnerable operation, input trust boundary, emitted-bundle/tool exposure, mitigation, owner, review date and expiry for any proposed exception. This delivery accepts no exceptions.

`dependencyReviewPassed` remains false and is now required by the release gate.

## Primary references checked

- https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- https://github.com/advisories/GHSA-86w9-cpqp-85rv
- https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/

Advisory versions and patch availability can change. Recheck them during the release review.
