# Billing — FirstLane 0.4.0

The V1 purchase rails are Apple In-App Purchase and Google Play Billing through RevenueCat. There is no Paddle, card form, subscription or web checkout.

## Product contract

| Field | Value |
|---|---|
| Pack | `CA-ON-G1` |
| Product, both platforms | `firstlane_on_g1_lifetime` |
| RevenueCat entitlement | `ca_on_g1_full` |
| Canadian price | **CA$14.99 once / CAD 1499 minor units** |
| Renewal | None |

Configure the matching one-time/non-consumable products and Canadian prices in the real developer consoles. Attach both to the intended RevenueCat offering/entitlement. The reference price migration is not a store-price API call.

## Purchase authority and sequence

1. Require a verified FirstLane/Supabase user and verify the originating token server-side.
2. Associate RevenueCat with that user's UUID and load the actual native store product.
3. Display the store-localized price. For CAD, require the canonical 1499 minor units before opening payment.
4. Persist a pending marker before presenting the native sheet; serialize customer-ID changes during purchase/restore.
5. Handle cancellation, rejection and pending outcomes without fabricating access or prompting an immediate duplicate purchase.
6. Let the authenticated RevenueCat webhook durably update Supabase commerce/access records.
7. Refresh `firstlane_my_access` for the originating user. **Only the server grant opens paid content/success; CustomerInfo alone is not the fulfillment signal.**
8. If the mirror is delayed, show pending/recheck/support. The automatic polling is bounded; manual recheck remains available.

No client-supplied paid boolean or amount grants permanent access. The displayed store product remains authoritative for payment; the app does not fabricate foreign-currency prices.

## Restore, refunds and environments

Use a verified user's UUID consistently as the RevenueCat App User ID. Configure and test the intended original-account restore policy; do not silently transfer a purchase between unrelated FirstLane accounts. Restore refreshes store state and then server access. A new phone should use the original account, not repurchase as the first remedy.

The supplied commerce function handles this product's `NON_RENEWING_PURCHASE` and `CANCELLATION` events, with durable event deduplication and refund tombstones. Unexpected event types are retained for operator review rather than used to grant access. The workflow relies on webhook delivery; monitor retries and unresolved fulfillment.

The database starts in SANDBOX. Use separate backend environments and only enable PRODUCTION after real acceptance. Test late/out-of-order events, replays, refunds, account deletion, clean-install restore and account switching. These cases have not been exercised with the user's stores here.

## Offline policy and receipts

A valid server grant may be cached for up to 30 days for offline study. Authentication rejection is not treated as permission to fall back to stale access. A failed/expired offline check asks for reconnection; it is not a new paid term. Refund/revocation removes access on authoritative refresh.

Receipt history is loaded for the originating account and reports loading/errors. Do not rewrite historic transaction amounts when changing the offer price.

## Server/client secrets

Only public RevenueCat platform SDK keys and a Supabase publishable/legacy anon key belong in the client. Webhook authorization, service-role keys, store server credentials and signing assets remain server-side. Refer to `SUPABASE.md` and the root handoff for deployment/acceptance steps.


## 0.5.0 refund-reversal extension

The new sixth migration is `202610070001_refund_reversal.sql`. Apply all migrations in filename order in staging first. See `REFUND_REVERSAL.md` and the unexecuted rollback-only `supabase/tests/refund_reversal_acceptance.sql`. Source-review success is not database or store acceptance.
