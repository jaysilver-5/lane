# Authoring inputs are not public release content

The included `ontario-g1.draft.json` remains unapproved. Do not publish it, promote its approval flags without actual review, or deploy the repository root as a website.

A genuinely reviewed release belongs at `content/release/ontario-g1.approved.json`; it is not present in this delivery. `scripts/bundle-content.mjs` checks exact revision approvals, fixed sample IDs and required metadata. Connected apps import only `src/data/generated-bank.json` (40 fixed samples), not this complete authoring bank. Explicit internal demo builds can generate all draft questions for testing.

Run the full content, source and release checks after changes. See `../PRODUCTION_HANDOFF.md` for independent/rights review, visual media requirements, private publication and acceptance steps.

## Owner review workflow — 22 October 2026

The owner volunteered to review the questions personally. This is FirstLane's internal editorial/release decision, not government or payment-provider certification. Reviewer assignment is not a completed review. The AI-assisted author ID is `ai-assisted-draft-2026-10-03`; the actual human reviewer identity and decisions must be recorded separately.

1. Run `npm run content:prepare`, then `npm run content:review`. Open `http://127.0.0.1:4175/` on this computer. The review server exposes only the internal review page on loopback; never deploy this page or its answer keys with the customer app.
2. Enter your reviewer name or ID. Check each keyed answer, all distractors, explanation, exceptions and cited source. Review both variants of each concept: this is 500 prompts covering 250 paired concepts, not 500 unrelated facts.
3. Record the factual decision and the rights decision separately. Use Needs correction with a note when uncertain. Check originality and any reproduction permissions; access to an official website is not itself commercial reproduction permission. Save review & next records the exact revision/hash and time locally. Export periodically and before clearing browser data or changing browser profiles.
4. Return the exported decisions for reconciliation. Corrections get new immutable revisions and need another review. The 40 free and 10 guest questions are included in this same review; they are not exempt.
5. Resolve release-wide coverage and rehearsal checks. All 200 sign prompts are text-only and have no recognition images. The bank records gaps for full printed-handbook coverage, current numerical rules/sanctions and the exact official exam format. Do not silently waive those gaps or call this an official question bank.
6. After actual decisions and the remaining checks are complete, assemble `content/release/ontario-g1.approved.json`, run content/release validation and generate the protected artifact. Upload it to versioned private storage, record the exact checksum/bytes/version and named approval in `content_releases`, deploy the approved server sample payload, and rebuild the guest sample export. Verify the paid browser automatically loads all 500 while guest/free/refunded accounts remain restricted. A public paid rollout still requires its own final authorization.

Current official references for the reviewer: [DriveTest knowledge tests](https://drivetest.ca/tests/knowledge-tests/) confirms untimed multiple-choice tests and recommends the printed handbook because the web handbook is partial; this page alone does not establish the proposed exact 20/20 and per-section scoring settings. [Ontario copyright information](https://www.ontario.ca/page/copyright-information) distinguishes commercial reproduction licences and specific exceptions. These references do not constitute factual or rights sign-off on FirstLane's questions.

The interactive review page and its exports never set bank approval flags, publish a release, or grant access. Their purpose is to collect real, auditable review work.
