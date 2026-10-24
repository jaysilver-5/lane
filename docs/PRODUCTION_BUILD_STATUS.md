# Production build failure — 24 October 2026

Inspected the actual failed [Vercel deployment 6YdZRwFca](https://vercel.com/joshs-projects-e9dac4f7/firstlane-app/6YdZRwFcaQDqKJbLoRVgNjmGRGD3), created at 17:29 Africa/Lagos. It was a redeploy of the old production attempt at commit `aed8a2c`, on `codex/firstlane-production-web`. It did not use the later main-domain app source.

`npm run web:build` exited 1 at `Web public launch blocked`, before Expo compilation. Its log listed missing reviewed release content and uncompleted customer/authentication, sync, security, commerce, deletion, delivery, accessibility, legal and named-reviewer acceptance. It also required social sign-in because that old commit predates the email-only scope fix.

The later main-domain commit `d7c15a0` passed both GitHub Node 22 jobs, all 222 then-current tests, Expo export and Vercel app/review Preview builds. The subsequent editorial changes add four tests and record a full AI review of the 500 questions. They do not manufacture independent/rights or customer/payment acceptance.

The current release script now explains explicitly that this checklist stops a public deployment before compilation and links the launch checklist. Production will continue to reject missing acceptance. Changing live credentials or repeatedly redeploying the old attempt cannot complete these checks.

Use the latest main-domain source when the public release is actually ready. Keep Preview as the protected connected environment for technical testing; do not switch Production to demo/connected mode or set false acceptance flags merely to obtain a green build. Complete [the remaining launch work](LAUNCH_STATUS.md), assemble the approved release, and then build the validated production source. The marketing `/app` proxy must ultimately target that validated production deployment.
