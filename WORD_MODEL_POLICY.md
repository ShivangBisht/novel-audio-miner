# Word Model Policy

## Principle

Color broadly. Measure comprehension fairly. Mine selectively. Allow user override.

## Known-word definition

A word is known if the word exists in either:

1. the Anki-derived known-word cache, or
2. the persistent manual-known word database.

Known words are colored green and count as understood.

## Manual-known words

Manual-known words are separate from the Anki cache.

Rules:

- Rebuilding the Anki cache does not remove manual-known words.
- Clearing the Anki cache does not remove manual-known words.
- Undo Known removes only the manual-known entry.
- If a word also exists in Anki, Undo Known does not make the word unknown.

## Proper nouns and names

Proper nouns are displayed separately from normal learning words.

Examples:

- character names
- place names
- organization names

Behavior:

- color role: `name`
- comprehension: excluded
- New Words: excluded
- mining candidates: excluded

## Grammar and function tokens

Grammar/function tokens are excluded from learning calculations.

Examples:

- particles
- auxiliaries
- symbols
- suffix-like grammar tokens
- other ignored function tokens

Behavior:

- color role: `grammar`
- comprehension: excluded
- New Words: excluded
- mining candidates: excluded

## Numeric/counter expressions

Common numeric/counter expressions are grouped when Kuromoji splits them into adjacent parts.

Examples:

```text
二十 + 歳 -> 二十歳
二 + 人  -> 二人
三 + 日  -> 三日
```

Behavior:

- color role: `numeric`
- comprehension: excluded
- New Words: excluded
- mining candidates: excluded

## Learning words

Learning words are meaningful vocabulary candidates.

Behavior:

- Known words: green.
- Unknown words: colored by frequency when available.
- Comprehension: included.
- New Words: included when unknown.
- Mining candidates: included when unknown.

## Deferred compound handling

Broad compound handling is intentionally disabled/deferred until Token Inspector / Debug Mode exists.

Deferred examples:

```text
交通事故
響き渡る
現実的
精一杯
一瞬間
```

Reason:

Compound merging without diagnostics caused misclassification and over-merging. Future compound handling should be diagnostics-driven and should prefer explicit evidence from dictionaries, known-word data, or token inspection.
