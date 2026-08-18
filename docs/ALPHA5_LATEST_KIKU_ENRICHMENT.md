# Alpha 5 Latest-Kiku-Note Enrichment Stabilization

Alpha 5 extracts enrichment orchestration from Reader.jsx. Each operation discovers the latest configured Kiku note exactly once, pins its note ID and expression, compares that expression with the canonical Reader mining lookup identity, and retains the comparison as an explicit warning.

All media storage, field preparation, note update, and Anki browser actions consume the pinned note ID. A newer note created after discovery cannot retarget the active operation. Target identity is shown in the Reader before mutation stages continue and is retained in Debug Report v2.

Yomitan remains external and owns Kiku note creation. Nadeshiko, VOICEVOX, field mappings, post-mining known state, JP Analyzer, Teaching, EPUB, contextual scenes, dictionaries, prefetch, and startup remain unchanged.
