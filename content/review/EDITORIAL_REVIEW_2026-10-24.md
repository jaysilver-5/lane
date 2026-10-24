# Ontario G1 editorial review — 24 October 2026

All **500 questions / 250 paired concepts** received an AI editorial review of the prompt, every answer choice, keyed answer, explanation, relevant exceptions and cited official-source support. The corrected draft is version 0.1.1. This is a completed AI editorial pass, not independent human, legal, government or visual certification.

## Changes

**44 exact revisions changed: 16 wording/explanation changes and 28 citation-only changes.** Stable question IDs, concept IDs, option IDs and access-tier sample IDs are preserved. Changed questions have new revision UUIDs and incremented revision numbers; their complete previous payloads and reasons are retained in [the change record](editorial-changes-2026-10-24.json). No existing human decision was invented or transferred to a changed revision.

| Questions | Correction |
|---|---|
| 0001–0002 | Complete stopping-position sequence, including an unmarked crosswalk and sidewalk/intersection fallback. |
| 0045–0046 | A displayed accessible permit must be used for its eligible holder; borrowing it is insufficient. Added the precise parking reference. |
| 0241–0242 | Emergency 911 exception includes pulling off the road to a safe area to call. |
| 0277 | Explicit all-way-stop context; simultaneous stopping alone does not establish the intended priority. |
| 0295–0304 | Added the current official school-bus infocard for amber/red/stop-arm, physical-median and 20-metre rules. |
| 0319–0330, 0497–0498 | Current canonical emergency/tow guidance; distinguish the work-vehicle extension effective 1 January 2027. The current questions do not incorrectly apply that extension early. |
| 0321–0322 | Specify clearing straight through an intersection before pulling over; avoid suggesting a left turn across a responder. |
| 0375–0376 | Continuing around after a missed exit is conditional on the inside lane and actual markings; follow a required exit and reroute if necessary. |
| 0377–0378 | Take the intended roundabout exit and pass the traffic island before pulling over. |
| 0471–0472 | Replace the unsupported blanket snowplow wording with the documented danger of passing between working plows in staggered formation. |
| 0486 | State that a stop is required; an unmarked crosswalk alone is not a universal stop instruction. |
| 0489–0494 | Replace a broad legacy book-export citation with the specific readiness/control-familiarity page. |

No answer-option IDs were flipped. Several correct-answer texts were clarified or rewritten, including the narrowed snowplow scenario. The cited source register now contains 21 records.

## Evidence and checks

- [Exact editorial ledger](ai-editorial-2026-10-24.json): all 500 current revision hashes, scope, source IDs and decisions, explicitly attributed to AI. Bank SHA-256: `9f5b1f4ae44e9f1f3977e6013f782e47ccc42a2ff92530315c4a4d1bcd24ce1d`.
- `npm run content:check` now verifies normalized answer-choice/prompt uniqueness, registered question/concept source mappings, valid answer IDs, explanation presence and exact editorial-report coverage/hashes. A changed answer or source invalidates the recorded review. These checks verify integrity, not factual truth by themselves.
- Refreshed the internal review packet and the 10-question guest / 40-question free preview payloads. They are now approved under the separate owner-accepted AI editorial release manifest. The full authoring bank and review page are not exported as customer assets.
- 226 JavaScript tests, TypeScript, 94-file source parsing and all seven Edge entrypoint syntax checks passed locally. Hosted export/build results are recorded on the app PR.
- Private corrected-bank workbench: `http://127.0.0.1:4176/`. The older workbench on 4175 uses the earlier bank and should not be used for these new revisions. The page now distinguishes the completed AI pass from separately recorded factual/rights decisions.

## Source scope and remaining release decisions

DriveTest page text was retrieved directly. Ontario origin pages frequently denied automated fetches; their current indexed official-page text was used. No third-party practice bank was used as an authority, and no official examination questions or sign artwork were imported.

The source review checked the bank's actual subjects and numerical answers, including G1 age/learning periods/supervision, restraints, school-bus and rail distances, parking setbacks, headlight distances, U-turn visibility and responder-following distance. It does not establish a comprehensive review of the printed handbook, all legal exceptions or omitted sanctions/thresholds.

The 200 sign questions describe signs in words; no image-recognition coverage is claimed. Many distractors are intentionally basic, and this is not an empirically calibrated test. The 500 prompts represent 250 paired concepts. The owner has accepted the 40-question, 20-per-section session and 16-correct target as FirstLane editorial practice, without a verified official-format claim. The app describes it as FirstLane practice, and the promotional “closer to the real thing” eyebrow was removed.

The actual independent factual/rights decisions are still **0/500**. The existing release policy requires those decisions, release-wide coverage/format approval and an approved artifact before publication. The AI ledger does not masquerade as those approvals or generate `content/release/ontario-g1.approved.json`.

For rights, the bank uses AI-assisted original wording about facts and contains no copied media. That is an editorial observation, not a commercial reproduction licence or a legal clearance. [Ontario's copyright policy](https://www.ontario.ca/page/copyright-information) gives specific conditions for commercial reproduction; merely citing a handbook does not license its prose or artwork.

Relevant primary references: [MTO signs](https://www.ontario.ca/document/official-mto-drivers-handbook/signs), [turns and roundabouts](https://www.ontario.ca/document/official-mto-drivers-handbook/changing-directions), [weather and snowplows](https://www.ontario.ca/document/official-mto-drivers-handbook/driving-night-and-bad-weather), [distracted driving](https://www.ontario.ca/page/distracted-driving), [emergency/tow/work vehicles](https://www.ontario.ca/page/driving-near-emergency-vehicles-tow-trucks-and-work-vehicles), [school-bus infocard](https://www.ontario.ca/files/2025-09/mto-school-bus-safety-infocard-en-2025-09-09.pdf), [licensing requirements](https://drivetest.ca/licences/drivers-licences-cars/) and [knowledge tests](https://drivetest.ca/tests/knowledge-tests/). Per-question references are in the ledger and bank.
