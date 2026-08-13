# Alpha Source-of-Truth Matrix

## EPUB and Reader content

- Authority: Phase 13 EPUB Reader model in Novel Audio Miner
- Owns: package order, sections, scenes, text, markup, ruby, images, image roles,
  chapter ownership, and scene identity
- Consumers: Reader presentation, navigation, Teaching source context, Debug
  Report
- Forbidden: reconstructing scene or image ownership in UI components

## Linguistic Reader data

- Authority: JP Analyzer compact output `readerSpans`, validated by the frontend
  Reader-span adapter
- Owns: exact offsets, surface, display role, headword, known and frequency
  lookup identities, comprehension membership, New Words membership, action
  recommendation metadata, grammar identity, and correction provenance
- Views: coloring, comprehension, New Words, interaction summaries
- Forbidden: actionable use of partial span copies or surface-text re-search

## Reader interaction selection

- Present state: multiple entry paths with non-equivalent shapes
- Target authority: canonical frontend interaction identity resolved from the
  current authoritative span and scene
- Consumers: selected-word UI, known actions, enrichment preparation, Debug
  Report, and Teaching references

## Known-word state

- Authority: known-word service
- Inputs: Anki-derived Kiku and configured note-type cache plus manual-known store
- Owns: Anki-known, manually known, unknown, unavailable, cache readiness,
  completeness, refresh time, and per-source failures
- Forbidden: deriving known state from display color or union count

## Kiku note creation

- Authority: standalone Yomitan browser extension and Anki
- Application relationship: none
- Novel Audio Miner must not claim to create the entry or dictionary meaning

## Enrichment

- Authority: Novel Audio Miner enrichment service
- Owns: newest Kiku note discovery, preview and mismatch warning, fixed note ID,
  novel sentence, book metadata, Nadeshiko, VOICEVOX fallback, media storage,
  Anki field updates, progress, result, and receipt
- Forbidden: repeating newest-note discovery during one operation

## Teaching and corrections

- Authority: JP Analyzer versioned snapshots, corrections, decision records, and
  stores
- Frontend role: qualification, presentation, user intent capture, and API calls
- Forbidden: frontend recreation of correction or evidence truth

## Dictionary state

- Authority: JP Analyzer dictionary registry and SQLite store
- Frontend role: management and status presentation through versioned routes

## Application startup

- Authority: JP Analyzer startup supervisor, ownership manifest, health probes,
  and sanitized status endpoint
- Frontend role: application-status presentation
