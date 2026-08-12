# Phase 14.5A Step 2: Logical Sentence Selection

This step adds a pure visual-offset-to-logical-sentence resolver.

## Contract

- It consumes Step 1 `logicalSentences` metadata.
- It returns a logical sentence and sentence-local offsets.
- It rejects structural layout gaps, symbol-only units, invalid ownership, and selections crossing logical sentences.
- It does not inspect or modify JP Analyzer spans, candidates, cache identities, scheduling, or output schemas.
- It does not inspect or modify Teaching selection objects, panels, evidence, corrections, decisions, corpus records, exports, or hashes.
- It does not inspect or modify mining behavior.
- It is not wired into Reader runtime in this step.

Step 2 is a pure qualification boundary only. Runtime integration will occur only after browser DOM offset mapping and sentence-local analyzer ownership are independently qualified.
