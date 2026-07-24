# Novel Audio Miner Analyzer Integration Contract

JP Analyzer is the sole owner of Japanese linguistic boundaries, roles, lookup identities and learning/mining eligibility. Novel Audio Miner owns EPUB parsing, rendering, known/frequency lookup, aggregation, UI and integrations.

Novel Audio Miner must not merge or split analyzer spans, infer grammar/names/compounds, derive lookup identities, or use surface search when authoritative offsets exist. Invalid analyzer output is rendered as neutral text.

Kuromoji and the legacy tokenizer model were retired in Phase 5.2E. Plain Text is a presentation mode and continues to use JP Analyzer structure.
