# Authoring inputs are not public release content

The included `ontario-g1.draft.json` remains unapproved. Do not publish it, promote its approval flags without actual review, or deploy the repository root as a website.

A genuinely reviewed release belongs at `content/release/ontario-g1.approved.json`; it is not present in this delivery. `scripts/bundle-content.mjs` checks exact revision approvals, fixed sample IDs and required metadata. Connected apps import only `src/data/generated-bank.json` (40 fixed samples), not this complete authoring bank. Explicit internal demo builds can generate all draft questions for testing.

Run the full content, source and release checks after changes. See `../PRODUCTION_HANDOFF.md` for independent/rights review, visual media requirements, private publication and acceptance steps.
