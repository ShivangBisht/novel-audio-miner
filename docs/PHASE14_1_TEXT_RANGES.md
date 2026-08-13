# Phase 14.1: Atomic Text Ranges

Phase 14.1 introduces diagnostic sentence candidates without changing Reader output.

## Contract

- The default candidate is one locale-aware sentence range.
- Open quote structures are kept atomic until their matching closer.
- Symbols and punctuation are retained exactly in source order.
- Meaningful length counts Unicode letters, numbers, and marks, excluding punctuation, whitespace, and decorative symbols.
- Candidate ranges are ordered, gap-free, non-overlapping, and reconstruct the complete source text.
- There are no expression-specific Japanese rules.

## Deferred to Phase 14.2

The minimum-context rule is not activated in Phase 14.1. Phase 14.2 will attach a complete following candidate when the current candidate has fewer than eight meaningful characters, repeating until the threshold is met or a hard boundary is reached.
