# Phase 15.5 Reader Actions and Feedback Cleanup

## Result

The Reader action area is now a dedicated presentation component. It presents the selected authoritative span, human-readable role, known-word ownership, mining eligibility, pinned Kiku target, enrichment stage, completion, mismatch warning, failure, and recovery guidance.

## Ownership

`Reader.jsx` continues to own state, canonical interaction resolution, known-word mutation handlers, and enrichment orchestration. `ReaderActionArea.jsx` receives resolved facts and callbacks and does not derive linguistic, known-word, mining, or note identity.

## Preserved contracts

- `readerSpans` and the canonical Reader interaction remain authoritative.
- Alpha 4 known-word ownership is unchanged.
- Alpha 5 discovers and pins the latest Kiku note exactly once.
- Alpha 6 domain statuses remain independent.
- Teaching, corrections, dictionary management, persistence, EPUB reconstruction, prefetch, startup, and backend behavior are unchanged.

## Accessibility

Actions have explicit labels and help text, operation feedback uses a polite live region, mismatch and error states include text, controls retain focus behavior, and narrow layouts use touch-sized full-width actions.

## Runtime feedback correction

Runtime review found two presentation and contract defects. The production JP Analyzer health payload uses `version`, while the frontend registry incorrectly required `analyzerVersion`; the registry now matches the deployed response without weakening validation. Reader domain feedback now displays at most one actionable Reader-specific notice, suppressing duplicated successful Anki, known-word, dictionary, and startup rows. The no-selection action area is collapsed to one compact instruction.
