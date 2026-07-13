# Novel Audio Miner v4.1 Stable Core

Novel Audio Miner is a local Japanese EPUB reader and Anki mining helper focused on stable reading, vocabulary visibility, known-word tracking, and controlled card enrichment.

This stable core is the cleaned baseline before adding Debug Mode / Token Inspector.

## Current workflow

1. Load a Japanese EPUB locally in the browser.
2. Read sentence and illustration scenes in vertical or horizontal mode.
3. Toggle furigana while preserving word coloring.
4. Review known and unknown words with frequency-based colors.
5. Mark already-known words manually without creating Anki cards.
6. Undo manually marked known words when needed.
7. Mine selected words to the latest Kiku note through AnkiConnect.
8. Use Nadeshiko when available, with VOICEVOX fallback when online enrichment is unavailable or forced TTS is enabled.

## Stable features

- Local EPUB parsing.
- Sentence/image reading stream.
- Vertical and horizontal reading modes.
- Furigana ON/OFF support.
- Stable word coloring in furigana and non-furigana modes.
- Frequency-based unknown word colors.
- Known-word cache from Anki.
- Persistent manual-known word database.
- Undo manual-known words.
- Proper noun/name coloring and exclusion from comprehension.
- Grammar/function-token exclusion from comprehension and New Words.
- Numeric/counter grouping such as `二十歳`, `二人`, and `三日`.
- Kiku note update through AnkiConnect.
- Nadeshiko enrichment with VOICEVOX fallback.
- Stable package metadata with exact dependency versions.

## Deferred until diagnostics/debug mode

The following are intentionally deferred until a Token Inspector / Debug Mode exists:

- Broad compound-word merging.
- Composite-known judgement based on component words.
- Click-to-select token spans.
- Sentence grouping rewrite.
- EPUB parser/image-order diagnostics.
- Full debug report export.

## Run

```bash
npm install
npm run dev
```

Open the local Vite URL shown in the terminal, usually:

```text
http://127.0.0.1:5173
```

## Requirements

- Anki must be running.
- AnkiConnect must be installed and available at `http://127.0.0.1:8765`.
- The Kuromoji browser script must be loaded from `index.html`.
- Local frequency dictionaries should exist in `public/dict/`.

## Expected local dictionary files

```text
public/dict/jpdb.json
public/dict/jiten.json
public/dict/cc100.json
public/dict/bccwj.json
```

## Kiku field usage

- `SelectionText`: original novel sentence / reading context.
- `Sentence`: mined/enriched example sentence or fallback novel sentence.
- `SentenceFurigana`: sentence with furigana where available.
- `SentenceAudio`: sentence audio where available.
- `Picture`: image where available.
- `MiscInfo`: cleaned book title and chapter.

## Stable source ownership

- `src/components/Reader.jsx`: reader UI, navigation, selection, known/undo actions, and mining action.
- `src/lib/tokenizer.js`: raw Kuromoji tokenization only.
- `src/lib/wordModel.js`: vocabulary classification policy.
- `src/lib/wordCache.js`: Anki known cache and manual-known database.
- `src/lib/epubParser.js`: EPUB extraction, ordering, and token attachment.
- `src/lib/frequencyMap.js`: frequency dictionary loading and lookup.
- `src/lib/enrichService.js`: Nadeshiko/VOICEVOX enrichment preparation.
- `src/lib/ankiConnect.js`: local AnkiConnect client.

## Important design rule

If a future improvement depends on hidden tokenizer/parser state, add diagnostics first.

This applies especially to:

- compound words
- token click selection
- sentence grouping
- image ordering
