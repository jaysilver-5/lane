# Refund reversal — implementation and acceptance boundary

New migration: `202610070001_refund_reversal.sql`.

RevenueCat documents `REFUND_REVERSED` for App Store. Its event ID and event-generation timestamp remain stable on retries. The event-generation time does not necessarily equal the underlying action time. Reference checked 7 October 2026: https://www.revenuecat.com/docs/integrations/webhooks/event-types-and-fields

## Implementation

The existing authenticated webhook/service-role boundary remains in place. A private transaction-lifecycle table records refund/reversal order for the exact store, environment, transaction and pack. A valid reversal clears only the matching tombstone, clears the original receipt's refunded state and restores the original account's grant. It does not create another receipt or another payment.

Confirmed signed-in account ownership is required. Cross-account, cross-pack and conflicting event-ID replays are rejected. Unsupported stores/environments are ignored. Repeated identical events are idempotent. Old lifecycle events cannot override a newer recorded event; timestamp ties remain refunded. A reversal arriving before its original purchase records lifecycle state but creates no grant until the original receipt is validated. Historical refunds seed the new lifecycle table.

## Deliberate limits

This is a proposed tested-in-source implementation, not a deployed or database-executed change. The full PL/pgSQL and privileges have not been accepted against a live Supabase database. The unit test checks source guards, not SQL execution.

The ordering policy uses the provider event-generation timestamp. For ambiguous historical ordering, unresolved aliases, account transfers, or unexpected store delivery patterns, use authenticated server-side reconciliation/manual review rather than treating client purchase success as proof. The supplied app intentionally does not transfer receipts between account aliases. Validate actual RevenueCat identity mappings before production.

Apply all six migrations to a disposable/staging project in filename order. Execute both rollback-only acceptance scripts as an appropriately privileged operator. Test real sandbox purchase → refund → reversal → restore, duplicates, delayed deliveries, mismatch/revocation, and reinstall/account switching. Never run fixture insertion scripts in the production database.

`refundReversalPassed` and the existing store/backend acceptance flags remain false.
