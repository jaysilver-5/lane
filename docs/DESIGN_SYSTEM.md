> Retained design/reference notes. The root `PRODUCTION_HANDOFF.md`, `QA_REPORT.md`, and current source govern release status and behavior. No earlier approval claim supersedes the current release gate.

# FirstLane design system

## Direction

Calm, grown-up learning software rather than a dashboard full of alerts. Warm ivory, deep forest, electric lime, low-contrast borders and occasional lavender/blue topic surfaces. Typography is system-native, generously spaced and left-aligned. No custom font downloads are required.

Light background `#F6F5EF`, ink `#1C2922`, surface `#FFFFFF`, lime `#D9F778`, forest `#243C2E`. Dark background `#101A14`, surface `#1C2A21`, ink `#F4F6ED`. All tokens live in `src/theme/tokens.ts`. Avoid placing light text on lime; use `accentText`.

Radii: 12, 18, 25, 32 and pill. Standard page padding 24. Reading width capped at 600. Main buttons minimum 56 high; icon controls 44. Cards use restrained one-pixel borders rather than heavy blue containers. Floating tabs include text labels and a clear selected state.

## Original imagery

`journey.svg` is a dimensional green landscape with a winding road, destination marker and small lime car. `road.svg` is a quieter route composition for dark hero cards. `trophy.svg` is reserved for completed study celebrations. The FirstLane F-and-road mark is supplied as an editable SVG plus native app-icon, adaptive-icon and splash assets.

These are decorative brand illustrations, not authoritative road-sign diagrams. Never use them as factual exam evidence. Actual visual sign training remains a separate accurate, rights-cleared content task. Asset creation source is in `scripts/make-art.py`; rebuilding the raster derivatives requires Python Pillow/cairosvg. Runtime uses bundled SVG strings, so it does not require the image-builder dependencies.

## Motion

Native buttons use a restrained 0.975 press scale and spring release. Screen content enters with a short fade/10-point translate. Stack navigation and sheets follow native transitions. Optional haptic selection is disabled by the user preference. Reduced-motion preference and OS accessibility setting remove or shorten nonessential motion. The browser companion uses its own CSS transitions and respects the preview setting.

## Accessible interactions

Stable labels, radio states for quiz answers and goals, button roles, progress semantics, meaningful empty states and live feedback. Color is not the only feedback channel: text explains correct and incorrect answers. Maintain readable contrast, text wrapping and clear focus styles. VoiceOver/TalkBack, very large text, actual safe-area behavior and real-device keyboard overlap still require acceptance testing; source-level attributes do not certify accessibility.

## Copy principles

Teach rather than punish: “A useful one to remember,” not “You failed.” Use “practice accuracy,” never an unsupported pass probability. Use “rehearsal” until exam-format review is complete. Draft, planned, local, synced, free and paid are distinct states. Never claim that a local action created an account, sent an email or charged a card.
