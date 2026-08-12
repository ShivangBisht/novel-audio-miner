# Phase 14.5A Step 1: Logical Sentence Ownership

This step preserves immutable atomic logical sentences inside every contextual visual Reader scene.

## Contract

- Contextual `plainText` and `htmlText` remain unchanged.
- Image, document, section, heading, and thematic boundaries remain unchanged.
- Each visual scene exposes `logicalSentences` with source coordinates and visual offsets.
- Inserted visual newlines and `<br>` separators belong to no logical sentence.
- JP Analyzer requests are unchanged.
- Teaching components, selection resolution, evidence, corrections, decisions, and corpus formats are unchanged.
- Mining behavior is unchanged.

The retained ownership metadata is foundation-only. Later steps may use it to resolve a browser selection to one logical sentence and request a separate sentence-local Teaching analysis without changing formalized Teaching formats.
