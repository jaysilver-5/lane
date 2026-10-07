# FirstLane access and billing contract — v0.4.0

## Commercial promise

**Start free. Ontario G1 Complete is CA$14.99 once. No subscription. No expiry.**

There is no timed free trial in V1. The app must never imply that a card will be charged later, that access renews automatically, or that buying Ontario unlocks future jurisdictions.

## Access states

### Guest
- No account required.
- 10 fixed Ontario sample questions.
- Guest IDs are a subset of the 40-question free pool.
- Local-only temporary progress.

### FirstLane Free
- Verified FirstLane account.
- 40 fixed Ontario sample questions.
- Explanations, sample review, saved progress and basic results.
- Free forever.
- Repeated sessions cannot expose questions outside the free manifest.

### Ontario G1 Complete
- One-time/non-consumable store purchase.
- Required Canadian launch price: **CA$14.99**.
- Full approved Ontario pack and premium learning modes.
- No subscription and no access expiry.
- Entitlement key: `ca_on_g1_full`.
- Restorable to the same store/FirstLane identity subject to Apple/Google/RevenueCat behavior and account-linking rules.

## Premium features

Premium access is required for:
- questions outside the fixed 40-question free manifest;
- full topic practice across the approved Ontario bank;
- full mock/rehearsal sessions;
- premium explanations/history outside the free set;
- mistake-focused revision across premium questions;
- premium saved-question sessions;
- offline premium pack installation.

Free users keep their saved free progress. Refund/revocation removes premium access but does not erase legitimate study history.

## Future packs

Each jurisdiction has its own entitlement and product mapping. Example:

```text
ca_on_g1_full        Ontario G1
us_ca_permit_full    California permit (future)
us_ny_permit_full    New York permit (future)
```

Purchasing one pack does not implicitly grant another.

## Source of truth

- Apple/Google are the purchase processors for the installed mobile apps.
- RevenueCat coordinates store purchases; its authenticated webhooks feed the server mirror.
- Supabase records the FirstLane account and commerce/audit mirror; a valid server grant controls paid UI and content.
- The device never grants itself permanent premium access from an unverified local boolean.

## Offline behavior

A recently verified entitlement may be cached for offline study for the configured verification window. The cache is an availability mechanism, not a new entitlement. On refund/revocation, the next authoritative refresh must remove premium access.


## 0.5.0 refund-reversal extension

The new sixth migration is `202610070001_refund_reversal.sql`. Apply all migrations in filename order in staging first. See `REFUND_REVERSAL.md` and the unexecuted rollback-only `supabase/tests/refund_reversal_acceptance.sql`. Source-review success is not database or store acceptance.
