# Alpha 2 Canonical Reader Interaction Truth

## Purpose

Alpha 2 establishes one immutable word-level interaction identity derived only
from the current validated authoritative `readerSpans` array.

## Entry paths

- DOM selection resolves exact analyzer offsets against authoritative spans.
- New Words stores an immutable span reference and resolves it back to the
  current authoritative span before actions are enabled.
- Compatibility mining-selection exports delegate to the canonical resolver.
- Known-word mutations receive an explicit interaction identity.

## New Words boundary

New Words remains a read-only learning view. It no longer exposes a partial
`analyzerSpan` object as action authority. A New Words item carries only display
data plus a stable reference containing offsets, surface, and correction ID.

## Preserved systems

Teaching range selection, logical sentences, corrections, analyzer schemas,
known-word persistence, cache behavior, enrichment, latest-note behavior, EPUB,
prefetch, dictionary management, and backend behavior are unchanged.


## Contextual multi-sentence Reader qualification

Normal Reader interaction uses the scene-level authoritative `readerSpans`; Teaching remains sentence-local and unchanged. HTML `<br>` elements occupy one `\n` position in the visible-text coordinate model. Authoritative analyzer spans use only their exact source offsets and never fall back to surface-text searching. Structural whitespace remains in the full-coverage partition but is neutral, excluded from comprehension and New Words, and unavailable for vocabulary actions.

## Cross-project closeout

The contextual multi-sentence Reader qualification depends on the JP Analyzer
structural-whitespace correction committed as:

- JP Analyzer commit: `a82d2713a90fb80fc66503d8d76b0be493cfde1a`

Structural whitespace remains part of the lossless authoritative Reader
partition, but it is neutral, excluded from comprehension and New Words, and
ineligible for vocabulary actions.
