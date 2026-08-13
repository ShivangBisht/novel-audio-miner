# Phase 15.1 UI Contract Freeze

## Result

Phase 15.1 freezes the UI-only boundary and the application information
architecture before visible redesign begins.

## Canonical regions

1. Application bar
2. Reader header
3. Reader navigation
4. Reading sidebar
5. Reader viewport
6. Context-sensitive Reader actions and feedback
7. Reader-connected Teaching surface
8. Settings and administration workspace

## Default reading sidebar

Allowed by default:

- book and author identity
- current chapter or section
- reading progress and chapter navigation
- current-scene New Words
- chapter illustrations
- compact furigana, writing-direction, and appearance entry controls

Moved out of the default sidebar:

- dictionary administration
- Anki field mapping and integration credentials
- force-TTS and cache administration
- Debug Report and analyzer technical state
- advanced Teaching and corpus administration

## Display adapters

Phase 15 may introduce read-only presentation adapters for Reader shell,
reading insights, sidebar groups, Teaching state, application status, and admin
navigation. Adapters must retain authoritative source objects and IDs for all
actions and must not reproduce linguistic, parsing, Teaching, mining, or
scheduling decisions.

## Terminology

Use: Scene, Logical sentence, Reader analysis, Teaching evidence, Occurrence
correction, New Words, Illustration, Book section, Application status, Advanced
tools.

Do not restore legacy tokenizer, Kuromoji, old parser, or one-scene-equals-one-
sentence terminology.

## Typography and visual harmony

Application UI uses one local sans-serif stack and a shared token/component
system. Book content retains EPUB typography and writing-mode behavior. No
feature panel may introduce a separate visual language.

## Regression boundary

Every Phase 15 milestone must keep `npm run test:phase14`, the Phase 13 baseline,
Phase 12B validation, and production build passing. UI tests verify placement,
labels, accessibility, and callback/data pass-through rather than replacing
process tests.

## Exit criteria

- authoritative Phase 15 plan is stored and linked from the current snapshot
- frozen processing contracts are explicit
- canonical UI regions and sidebar disposition are explicit
- shared visual and typography direction is explicit
- presentation-adapter restrictions are explicit
- milestone sequence and qualification requirements are durable
