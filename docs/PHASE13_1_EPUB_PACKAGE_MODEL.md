# Phase 13.1 Canonical EPUB Package Model and Lossless Diagnostics

Phase 13.1 introduces a new, non-invasive EPUB foundation. It does not change Reader output or JP Analyzer behavior.

Delivered modules:

- `epub/pathResolver.js`: canonical ZIP paths plus fragment-preserving reference resolution.
- `epub/packageModel.js`: manifest, spine, navigation, linearity, resource roles, and declared-cover candidates.
- `epub/contentStream.js`: ordered DOM content events for headings, text blocks, breaks, and images.
- `epub/parserDiagnostics.js`: per-document text reconstruction and event counts.

The new model preserves navigation fragments so multiple chapters inside one XHTML document remain representable. Images and text share one event order. Visible text blocks are retained without sentence splitting, and headings remain distinct metadata events.

Phase 13.1 is intentionally parallel to the existing parser. The current Reader remains unchanged until the new model is qualified against synthetic fixtures and multiple private local novels.

## Non-negotiable invariants

- No JP Analyzer changes.
- No Reader scene behavior changes.
- No phrase-specific Japanese parsing rules.
- No discarded one-character content.
- No early TOC-fragment removal in the new model.
- Every reconstruction failure is explicit.
