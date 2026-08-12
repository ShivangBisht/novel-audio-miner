# Phase 14.5A Step 4: Sentence-Local Analyzer Ownership

Step 4 exposes an explicit on-demand sentence analysis entry point that reuses the existing JP Analyzer infrastructure.

## Unchanged formal contracts

- Analyzer HTTP request and response formats are unchanged.
- `readerSpans`, `readerCandidates`, and `readerSelection` schemas are unchanged.
- Analyzer cache schema, sentence hashing, metadata lease, correction revision, validation, and scheduler are unchanged.
- The function returns the same authoritative cache record shape already consumed by Reader analysis.
- Reader runtime is not wired to this function in Step 4.
- Teaching selection, panels, evidence, corrections, decisions, snapshots, supersession, corpus collection, exports, quality, governance, portability, evaluation, and tuning formats are unchanged.
- Mining and Reader prefetch are unchanged.

## Ownership

`analyzeJpAnalyzerSentenceOnDemand(text)` validates non-empty sentence text, obtains the existing authoritative analyzer metadata lease or health metadata, and delegates to the existing `resolveSentence()` path as foreground work. It does not slice contextual analyzer spans, synthesize candidates, alter offsets, or create an alternate Teaching format.

Runtime integration remains deferred. A later step may call this entry point only after Steps 2 and 3 resolve one logical sentence and sentence-local offsets.
