> Retained design/reference notes. The root `PRODUCTION_HANDOFF.md`, `QA_REPORT.md`, and current source govern release status and behavior. No earlier approval claim supersedes the current release gate.

# FirstLane route map — v0.3

## Entry and account
- `/welcome` — app value, Start free, Sign in.
- `/onboarding` — Ontario G1, name, daily goal.
- `/auth/sign-up` — free FirstLane account.
- `/auth/verify-email` — verification.
- `/auth/sign-in` — returning user.
- `/auth/forgot-password` and `/auth/reset-password` — recovery.

## Core tabs
- `/(tabs)/today` — daily plan, resume, progress and upgrade state.
- `/(tabs)/learn` — topics/search and free/premium indicators.
- `/(tabs)/progress` — accuracy, activity and concepts.
- `/(tabs)/profile` — account, Plan & billing, settings/support.

## Study
- `/session` — active session.
- `/question` — question/explanation deep link with access guard.
- `/results` — session result.
- `/review` — answer review.
- `/saved` — bookmarks with premium guards where appropriate.
- `/mistakes` — mistake review.
- `/topic` — topic detail.

## Commerce
- `/plans` — FirstLane Free vs Ontario G1 Complete.
- `/checkout` — one-time native purchase confirmation UI.
- `/payment-success` — Complete entitlement confirmation.
- `/membership` — current access, receipts, restore.
- `/downloads` — premium offline pack.

There is **no trial route** in v0.3.

## Settings / support
- `/account`
- `/appearance`
- `/study-plan`
- `/jurisdiction`
- `/support`
- `/report`
- `/legal`
- `/content`

Deep links to premium routes must run the same centralized access guard as navigation buttons.
