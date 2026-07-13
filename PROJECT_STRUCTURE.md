# Project Structure

This document records the stable v4.1 source ownership after Cleanup Patches 1-20.

## Root files

### `package.json`

Owns package metadata, scripts, and exact dependency versions.

### `package-lock.json`

Owns reproducible installed dependency resolution.

### `index.html`

Owns the browser document shell and Kuromoji script loading.

### `vite.config.js`

Owns local dev server configuration and proxy routing for:

- Nadeshiko
- VOICEVOX

## Source entry files

### `src/main.jsx`

Owns React app mounting.

### `src/App.jsx`

Owns top-level app state:

- current book
- load state
- parse errors
- upload screen vs reader screen

## Components

### `src/components/FileLoader.jsx`

Owns EPUB file selection UI.

### `src/components/Reader.jsx`

Owns the reader UI and runtime actions:

- scene navigation
- vertical/horizontal mode
- furigana toggle
- style controls
- selected text handling
- known/undo known actions
- mining action
- Anki field update orchestration

## Library modules

### `src/lib/storage.js`

Owns reader-progress persistence only.

Does not store known-word data.

### `src/lib/tokenizer.js`

Owns raw Kuromoji tokenization only.

Does not classify learning words.

### `src/lib/wordModel.js`

Owns vocabulary classification policy:

- learning words
- proper nouns/names
- grammar/function tokens
- numeric/counter expressions
- display words
- comprehension words
- mining candidates

### `src/lib/wordCache.js`

Owns known-word storage and lookup:

- Anki-derived known words
- manual-known words
- known count union
- Anki cache clearing while preserving manual-known words

### `src/lib/frequencyMap.js`

Owns local frequency dictionary loading and frequency category lookup.

### `src/lib/epubParser.js`

Owns EPUB extraction and reader-stream construction:

- container/package metadata
- spine traversal
- TOC reading
- sentence extraction
- image extraction
- token attachment
- word-model output attachment
- flat reader stream

### `src/lib/japaneseSentenceSplitter.js`

Owns Japanese sentence splitting only.

Does not group short dialogue or merge reading units.

### `src/lib/ankiConnect.js`

Owns local AnkiConnect requests:

- base request
- connection check
- latest note lookup
- note field update

### `src/lib/enrichService.js`

Owns enrichment data preparation:

- Nadeshiko search
- candidate sentence scoring
- Nadeshiko URL normalization
- VOICEVOX fallback data
- VOICEVOX audio generation

## Removed/deferred modules

### `src/lib/readingUnitGrouper.js`

This file is not part of the active stable flow and can be removed.

Reason:

- It is not imported by the current source.
- The current reader uses `flatItems` from `epubParser.js`.
- Sentence grouping is deferred until Debug Mode.

## Design rule for future work

Before adding feature logic, first add diagnostics when the behavior depends on hidden parser/tokenizer state.

This applies especially to:

- compound words
- click-to-select token spans
- sentence grouping
- EPUB image ordering
