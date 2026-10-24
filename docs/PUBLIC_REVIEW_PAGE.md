# Public product page for Paddle review

The owner reports Paddle requested that app.getfirstlane.com be available for review. The Expo preview currently requires Vercel team authentication, and its question bank and production acceptance are not approved for a public release.

The independent static site in review-site/ provides a truthful public product page without publishing the unfinished app. It identifies the prelaunch status, operator, planned free/Complete offer and price, shows a real dashboard screenshot, and links to the existing published terms, privacy, refunds, support and account-deletion pages. It has no account forms, payment SDK, question content, analytics or credentials.

Deploy this folder as the Root Directory of a separate Vercel project, using its own package.json and vercel.json. Its build copies only index.html, styles.css and assets/ to its own dist/. Do not override the Expo app's production release checks or remove the actual app project's All Deployments authentication. Assign the public custom domain to this static project's production deployment; the actual app remains accessible to the owner through its protected Vercel preview URL.

Public accessibility is not Paddle approval or permission to sell. After a successful anonymous HTTPS check of the exact domain and its policies, resubmit the existing app domain entry in Paddle. Do not create another domain entry or a replacement token.

Once approved content and production acceptance are complete, the app domain can be moved back to the genuine production app, after reviewing the concrete public release. The default payment link must then point to the functioning, approved Paddle.js checkout page. Do not use this informational page as a payment link.
