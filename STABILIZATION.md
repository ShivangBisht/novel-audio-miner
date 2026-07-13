# Stabilization Log

## Current stable baseline

The current stable baseline is the working v4.1 source after Cleanup Patches 1-20.

The purpose of this baseline is to keep the app clean, formalized, efficient, and ready for Debug Mode without carrying unused experimental code.

## Stable runtime capabilities

- Local Japanese EPUB loading.
- Sentence/image reader stream.
- Vertical and horizontal reading modes.
- Furigana ON/OFF rendering.
- Stable word coloring in furigana and non-furigana modes.
- Frequency-based unknown word coloring.
- Proper noun/name separation.
- Grammar/function-token exclusion.
- Numeric/counter expression grouping.
- Anki-derived known-word cache.
- Persistent manual-known word database.
- Manual Mark Known.
- Undo Known.
- Known count from Anki-known plus manual-known union.
- Latest Kiku note update through AnkiConnect.
- Nadeshiko enrichment.
- VOICEVOX fallback / forced TTS support.

## Completed stabilization steps

### Step 1.1 - Rendering/colorization stabilization

Status: passed.

Confirmed behavior:

- Furigana ON/OFF coloring works.
- Plain text coloring works.
- Existing reader navigation remains functional.

### Step 2A - Token categories

Status: passed.

Confirmed behavior:

- Proper nouns/names are separated.
- Names are excluded from comprehension.
- Names are excluded from New Words.
- Grammar and particles are excluded from New Words.

### Step 2A.1 - Numeric/counter merge

Status: passed.

Confirmed behavior:

- `二十歳` is grouped.
- `二人` is grouped.
- Similar number/counter expressions are treated as numeric.

### Step 2B - Manual Mark as Known

Status: passed.

Confirmed behavior:

- New Words can be marked known.
- Selected words can be marked known.
- The known state updates in the reader.

### Step 2B.1 / Step 2B.3 - Persistent manual-known database and undo

Status: passed.

Confirmed behavior:

- Manual-known words persist after reload.
- Manual-known words remain after Anki cache rebuild.
- Undo Known works.
- Surface/dictionary-form mismatch is handled better.

### Step 2C - Broad compound handling

Status: deferred.

Reason:

Broad compound merging caused unstable behavior and requires Token Inspector / Debug Mode before continuing.

## Cleanup patches applied

### Cleanup Patch 1

Status: passed.

Changes:

- Removed deferred composite-known runtime leftovers.
- Removed unused `isFrequencyMapLoaded` import from `Reader.jsx`.
- Removed unused `getContentWords` import from `epubParser.js`.
- Removed unused composite-known CSS.

### Cleanup Patch 2

Status: passed.

Changes:

- Simplified `tokenizer.js` responsibility.
- Removed old unused `getContentWords()` filtering logic.
- Removed unused parser helpers.

### Cleanup Patch 3

Status: documentation/formalization.

Changes:

- Updated `README.md`.
- Added `WORD_MODEL_POLICY.md`.
- Added/updated `STABILIZATION.md`.

### Cleanup Patch 4

Status: code cleanup.

Changes:

- Removed unused helper exports from Anki, enrichment, and frequency modules.

### Cleanup Patch 5

Status: word-cache cleanup.

Changes:

- Formalized known-word storage.
- Removed noisy normal-operation logs.
- Removed unused manual-known debug exports.

### Cleanup Patch 6

Status: word-model cleanup.

Changes:

- Formalized `wordModel.js` responsibility.
- Removed unused debug merge export.

### Cleanup Patch 7

Status: sentence-splitter cleanup.

Changes:

- Formalized `japaneseSentenceSplitter.js`.
- Removed unused `flattenBookSentences()`.
- Marked `readingUnitGrouper.js` as removable dead/deferred code.

### Cleanup Patch 8

Status: storage cleanup.

Changes:

- Formalized `storage.js`.
- Added safe key helper and missing-id guard.

### Cleanup Patch 9

Status: upload UI cleanup.

Changes:

- Formalized `FileLoader.jsx`.
- Removed outdated upload text and special arrow symbols.

### Cleanup Patch 10

Status: app shell cleanup.

Changes:

- Formalized `App.jsx`.
- Removed temporary `window.__book` debug exposure.
- Added state-based load-another-book callback.

### Cleanup Patch 11

Status: reader cleanup.

Changes:

- Replaced hard page reload with App-controlled book reset.

### Cleanup Patch 12

Status: stylesheet cleanup.

Changes:

- Removed unused/no-op CSS blocks.

### Cleanup Patch 13

Status: app entry cleanup.

Changes:

- Formalized `index.html` and `src/main.jsx`.

### Cleanup Patch 14

Status: Vite config cleanup.

Changes:

- Formalized server/proxy config with named constants.

### Cleanup Patch 15

Status: package metadata cleanup.

Changes:

- Set app version to `4.1.0`.
- Replaced `latest` dependency ranges with exact lockfile versions.

### Cleanup Patch 16

Status: frequency-map cleanup.

Changes:

- Formalized frequency-map responsibility.
- Split frequency loading/combining into named helpers.
- Removed normal-operation logs.

### Cleanup Patch 17

Status: enrichment-service cleanup.

Changes:

- Formalized Nadeshiko/VOICEVOX enrichment service.
- Added named constants and clearer VOICEVOX formatting.

### Cleanup Patch 18

Status: AnkiConnect cleanup.

Changes:

- Formalized AnkiConnect client.
- Added named version constant and note-query escaping helper.

### Cleanup Patch 19

Status: EPUB parser cleanup.

Changes:

- Formalized parser responsibility.
- Removed normal parser logs and misleading generated comment.

### Cleanup Patch 20

Status: tokenizer final cleanup.

Changes:

- Removed normal tokenizer-loaded log.
- Added centralized fallback token helper.

## Deferred until Debug Mode

The following are intentionally deferred until Token Inspector / Debug Mode exists:

- Broad compound-word merging.
- Composite-known judgment based on component words.
- Click-to-select token spans.
- Sentence grouping rewrite.
- EPUB parser/image-order diagnostics.
- Full debug report export.

## Next recommended phase

Phase 3A: Token Inspector / Debug Mode foundation.

Recommended first inspector fields:

- surface
- dictionary form
- POS
- POS details
- token category
- color role
- known state
- manual-known state
- frequency category
- comprehension inclusion
- New Words inclusion
