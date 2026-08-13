# Phase 14.5A Step 5: Teaching Input Qualification

Step 5 adds a pure bridge from a qualified logical selection and an authoritative sentence-local analyzer record to the existing Teaching inputs.

## Formal compatibility

- The bridge calls the existing `adaptReaderSpansForRendering()` adapter.
- The bridge calls the existing `resolveTeachingSelectionFromOffsets()` resolver.
- The returned `selection` is the existing formal Teaching selection object without added or removed fields.
- The returned `analysis` has the existing `{ words, candidates, selection }` shape.
- Candidates and analyzer selection decisions are passed through from the authoritative sentence-local analyzer record without synthesis or rebasing.
- Analyzer HTTP formats, cache formats, reader-span schemas, candidate schemas, correction revisions, and scheduling are unchanged.
- Teaching panels, evidence, corrections, decisions, hashes, snapshots, supersession, corpus collection, exports, quality, governance, portability, evaluation, and tuning formats are unchanged.
- Reader runtime, mining, and prefetch remain unchanged.

Step 5 is qualification-only and is not imported by `Reader.jsx`.
