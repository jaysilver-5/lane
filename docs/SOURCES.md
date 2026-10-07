> Retained design/reference notes. The root `PRODUCTION_HANDOFF.md`, `QA_REPORT.md`, and current source govern release status and behavior. No earlier approval claim supersedes the current release gate.

# Technical source register

Official documentation consulted on 3 October 2026. Pin and verify the dependency set on installation; 'latest' URLs can change after this handoff.

- Expo SDK compatibility, including SDK 57 / React Native 0.86 / React 19.2.3: https://docs.expo.dev/versions/latest/
- Expo SQLite; native persistence and special web requirements: https://docs.expo.dev/versions/latest/sdk/sqlite/
- Expo / Supabase integration: https://docs.expo.dev/guides/using-supabase/
- Supabase React Native Auth quickstart: https://supabase.com/docs/guides/auth/quickstarts/react-native
- Supabase row-level security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Expo recommended React Native Screens (~4.26.0): https://docs.expo.dev/versions/latest/sdk/screens/
- Expo recommended Safe Area Context (~5.7.0): https://docs.expo.dev/versions/latest/sdk/safe-area-context/
- Expo recommended SVG (15.15.4): https://docs.expo.dev/versions/latest/sdk/svg/
- Expo development client: https://docs.expo.dev/versions/latest/sdk/dev-client/

Driving-content sources remain attached to each question and in the original source register. This UI implementation does not independently reapprove those facts. See the original review handoff under `reference/reports/`.


## v0.3 purchase integration sources — rechecked 4 October 2026

https://www.revenuecat.com/docs/platform-resources/non-subscriptions
https://www.revenuecat.com/docs/getting-started/entitlements
https://www.revenuecat.com/docs/integrations/webhooks
https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields
https://www.revenuecat.com/docs/projects/restore-behavior
https://www.revenuecat.com/docs/getting-started/installation/expo
https://revenuecat.github.io/react-native-purchases-docs/9.6.1/classes/default.html#getProducts
https://supabase.com/docs/reference/javascript/auth-verifyotp

These are implementation references, not evidence that this project has been deployed,
a store product approved, a native binary built or a payment successfully tested.
