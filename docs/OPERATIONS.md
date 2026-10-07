# FirstLane operations — v0.4.0

## Daily commerce checks
- Review store/RevenueCat transaction errors and unresolved pending purchases.
- Review RevenueCat webhook delivery failures.
- Verify that refund/revocation events remove premium access.
- Review support tickets for duplicate-account or restore issues.

## Support decision tree

### “I paid but it is still locked”
1. Confirm the customer is signed into the intended FirstLane account.
2. Ask them to use **Restore purchases / refresh access**.
3. Check RevenueCat entitlement status and transaction environment.
4. Check the Supabase commerce mirror/webhook event.
5. Do not grant permanent access manually without traceable evidence and an audited operator action.

### “I changed phones”
Use the same FirstLane account and store account, then restore purchases. Do not ask the customer to repurchase as the first remedy.

### “I received a refund”
Refund processing follows the relevant store. When RevenueCat reports revocation/cancellation, FirstLane removes Ontario Complete while preserving valid free progress.

## Content operations
- User-reported dangerous-rule errors are triaged immediately.
- Source changes are reviewed before publishing a new immutable question revision.
- Authors cannot be the sole approver of their own live question revision.
- Every production release records exact question revisions and source evidence.

## Expansion
A new jurisdiction requires its own:
- authority/source review;
- exam template and content bank;
- store product and RevenueCat entitlement;
- local price decision;
- acquisition campaign and reporting;
- support/readiness checklist.

Never reuse Ontario rules just because the UI and learning engine are shared.

## Fulfillment boundary

An SDK success alone is not a fulfilled purchase. The app waits for the authenticated server mirror. Investigate pending webhook deliveries before asking a customer to pay again. Unexpected event types require operator review; no automatic general-purpose reconciliation service is included.
