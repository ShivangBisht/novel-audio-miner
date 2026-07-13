# v4.1 Stable Core Release Checklist

Use this checklist after applying Cleanup Patches 1-21.

## File placement checks

Confirm these files exist:

```text
README.md
STABILIZATION.md
WORD_MODEL_POLICY.md
PROJECT_STRUCTURE.md
package.json
package-lock.json
index.html
vite.config.js
src/main.jsx
src/App.jsx
src/styles.css
src/components/FileLoader.jsx
src/components/Reader.jsx
src/lib/ankiConnect.js
src/lib/enrichService.js
src/lib/epubParser.js
src/lib/frequencyMap.js
src/lib/japaneseSentenceSplitter.js
src/lib/storage.js
src/lib/tokenizer.js
src/lib/wordCache.js
src/lib/wordModel.js
```

Confirm this unused/deferred file has been removed:

```text
src/lib/readingUnitGrouper.js
```

## Install/build checks

Run:

```powershell
npm install
npm run dev
```

Expected:

```text
Vite starts on http://127.0.0.1:5173
Upload screen appears
No compile overlay appears
```

Optional production build check:

```powershell
npm run build
```

## Reader checks

Test with at least one EPUB:

```text
1. EPUB loads.
2. Sentences appear.
3. Images appear.
4. Vertical mode works.
5. Horizontal mode works.
6. Furigana ON works.
7. Furigana OFF works.
8. Long dashes display correctly in vertical mode.
9. Load another book returns to upload screen without full page reload.
```

## Word model checks

Confirm:

```text
1. Known words are green.
2. Unknown words use frequency colors.
3. Unlisted unknown words are grey.
4. Names/proper nouns use name color.
5. Names/proper nouns do not reduce comprehension.
6. Grammar/particles do not appear in New Words.
7. Numeric/counter expressions such as 二十歳 and 二人 are grouped/excluded.
8. Comprehension percentage appears.
9. New Words list appears.
```

## Manual known checks

Confirm:

```text
1. Mark Known works from New Words.
2. Mark Known works from selected word.
3. Undo Known works.
4. Manual-known words persist after refresh.
5. Clear Anki Cache does not remove manual-known words.
6. Rebuild cache keeps manual-known words in the known union.
```

## Mining checks

With Anki and AnkiConnect running:

```text
1. Anki status connects.
2. Latest Kiku note can be found.
3. Mine to Anki updates expected fields.
4. Nadeshiko enrichment works when available.
5. Force TTS uses VOICEVOX when enabled.
6. VOICEVOX fallback works when Nadeshiko fails.
```

## Console cleanliness checks

Expected:

```text
No normal tokenizer-loaded logs.
No normal parser tokenization logs.
No normal word-cache operation logs.
Warnings appear only for actual failures or missing optional resources.
```

## Ready for Debug Mode when

All of the following are true:

```text
- EPUB reading is stable.
- Coloring is stable.
- Comprehension/New Words are stable.
- Manual Known/Undo Known are stable.
- Mining works.
- No experimental compound logic is active.
```
