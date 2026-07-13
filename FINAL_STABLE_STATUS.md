# Final Stable Core Status

## Version

```text
Novel Audio Miner v4.1 Stable Core
```

## Status

```text
Stable cleanup complete.
Ready for Debug Mode / Token Inspector foundation.
```

## Purpose of this stable baseline

This baseline exists to provide a clean, efficient, formalized, and predictable app state before adding Debug Mode.

The stable baseline intentionally avoids risky feature changes and removes/deactivates unfinished experimental logic.

## Completed cleanup scope

Cleanup Patches 1-22 completed the following stabilization work:

```text
- Removed deferred composite-known runtime logic.
- Removed unused imports and unused helper exports.
- Removed obsolete content-word filtering from tokenizer.js.
- Formalized tokenizer responsibility.
- Formalized word model responsibility.
- Formalized known-word cache/storage responsibility.
- Formalized reader-progress storage responsibility.
- Formalized EPUB parser responsibility.
- Formalized AnkiConnect responsibility.
- Formalized Nadeshiko/VOICEVOX enrichment responsibility.
- Formalized frequency-map responsibility.
- Removed normal-operation console noise.
- Removed unused/no-op CSS.
- Removed/reclassified unused sentence grouping code as deferred.
- Removed hard page reload for Load another book.
- Updated package metadata and exact dependency versions.
- Added project documentation and release checklist.
```

## Stable behavior expected

The stable app should support:

```text
- EPUB upload and parsing.
- Sentence/image reading stream.
- Vertical and horizontal reading modes.
- Furigana ON/OFF.
- Stable word coloring.
- Frequency-based unknown word colors.
- Proper noun/name coloring and exclusion.
- Grammar/function-token exclusion.
- Numeric/counter expression grouping.
- Comprehension percentage.
- New Words list.
- Manual Mark Known.
- Undo Known.
- Persistent manual-known database.
- Anki known-word cache.
- Clear/Rebuild Anki cache while preserving manual-known words.
- Latest Kiku note update.
- Nadeshiko enrichment.
- VOICEVOX fallback / Force TTS.
```

## Deferred intentionally

The following are intentionally not part of this stable runtime yet:

```text
- Broad compound-word merging.
- Composite-known logic.
- Click-to-select token spans.
- Sentence grouping rewrite.
- EPUB image-order diagnostics.
- Parser debug export.
- Token Inspector.
- Full Debug Mode.
```

## Reason for deferral

These features depend on hidden tokenizer/parser state. Adding them without diagnostics created instability earlier, especially around compound words such as:

```text
交通事故
響き渡る
現実的
精一杯
一瞬間
```

The next changes should therefore expose diagnostics first instead of adding more guessing rules.

## Final recommendation

After final release checklist passes:

```text
Stop stable cleanup.
Start Phase 3A: Token Inspector.
```
