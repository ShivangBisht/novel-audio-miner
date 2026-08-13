# Phase 15.2 Reader Shell Decomposition

## Purpose

Phase 15.2 extracts stable presentation regions from `Reader.jsx` without changing visible behavior, state ownership, event handlers, processing, or formal contracts.

## Extracted presentation regions

- `ReaderShell`
- `ReaderStatusBar`
- `ReaderTopBar`
- `ReaderMainLayout`
- `ReaderSidebar`
- `ReaderViewport`

`Reader.jsx` remains the orchestration owner. Existing state and callbacks remain in place and are passed through unchanged. The extracted components preserve the existing DOM classes so Phase 15.2 is structurally neutral and does not begin the Phase 15.3 visual redesign.

## Frozen behavior

EPUB parsing, contextual scenes, analyzer records, Reader spans, Teaching inputs and persistence, correction and decision workflows, corpus formats, mining, prefetch, known-word behavior, frequency behavior, and startup ownership remain unchanged.

## Qualification

`npm run test:phase15.2` runs the complete Phase 15.1 gate, the Reader-shell contract test, the Teaching shell/lifecycle gates, mining ownership, and Reader prefetch integration.
