# Public product page for Paddle review

The owner reports Paddle requested that app.getfirstlane.com be available for review. The actual Expo preview requires Vercel team authentication, and its question bank and production acceptance are not approved for a public release.

The independent static site in review-site/ provides a truthful public product page without publishing the unfinished app. It identifies the prelaunch status, operator, planned free/Complete offer and price, shows a real dashboard screenshot, and links to the existing published terms, privacy, refunds, support and account-deletion pages. It has no account forms, payment SDK, question content, analytics or credentials.

Deploy this folder as the Root Directory of a separate Vercel project, using its own package.json and vercel.json. Its build copies only index.html, styles.css and assets/ to its own dist/. Do not override the Expo app's production release checks or remove the actual app project's All Deployments authentication. Assign the public custom domain to this static project's production deployment; the actual app remains accessible to the owner through its protected Vercel preview URL.

Public accessibility is not Paddle approval or permission to sell. After a successful anonymous HTTPS check of the exact domain and its policies, resubmit the existing app domain entry in Paddle. Do not create another domain entry or a replacement token.

Once approved content and production acceptance are complete, the app domain can be moved back to the genuine production app, after reviewing the concrete public release. The default payment link must then point to the functioning, approved Paddle.js checkout page. Do not use this informational page as a payment link.

## Public review page and Paddle resubmission — 24 October 2026

The owner supplied Paddle's email request to make app.getfirstlane.com available for review. Published the isolated static `review-site/` to the separate Vercel `firstlane-review` project (`prj_sk41zr4wcx9rBkCibNISfNTJo9Rm`), root directory `review-site`, production branch `codex/firstlane-production-web`, basic queued builds, with outside-root files excluded and no environment variables. Ready deployment `4ifg6K7cqa4E1rSCkwceiE3Ce6ba` uses source `ea368c98cca0877504b3c5a04b4cd76a7fd79c9b`.

Moved only app.getfirstlane.com from the protected app preview to this site's Production deployment. The existing CNAME and root/www/mail/Clerk records were preserved. Anonymous HTTPS returns 200 for the exact host, CSS, both images and the pricing/terms/privacy/refunds routes. Local recursive DNS now resolves, and the public hostname loads in the in-app browser. The page truthfully describes the prelaunch product, free/Complete options and planned CA$14.99 one-time price, shows the existing dashboard, identifies Tervlon Labs Limited, and links published policies/support. It contains no scripts, forms, payment SDK, credentials or question content. Desktop and narrow viewport checks passed with no horizontal overflow; the narrow check measured 383 CSS-pixel client width.

The actual `firstlane-app` project retains Vercel Authentication on All Deployments. Its branch URL still redirects anonymous requests to Vercel SSO: https://firstlane-app-git-codex-firstlan-d306dd-joshs-projects-e9dac4f7.vercel.app/. It is not the current public custom-domain target. Production content and acceptance gates are unchanged; Preview still has no Paddle browser token.

Confirmed the requested accessibility change in Paddle and resubmitted the existing domain entry `chedom_01m5psjn2q2sh4bftmv8pbv4h4`; the dashboard now shows **In review**. This supersedes the earlier Changes needed status, not an approval. The default payment link remains blank: this informational site deliberately has no Paddle.js and cannot serve as a payment page. Approved content, actual production account/payment acceptance and a functioning approved checkout remain necessary before sales.

Evidence in the local app: `qa/public-paddle-review-page.png` and `qa/paddle-app-domain-resubmitted.png`. Both GitHub validation jobs and both Vercel projects passed for ea368c9. See [PUBLIC_REVIEW_PAGE.md](PUBLIC_REVIEW_PAGE.md) for the domain handover plan.
