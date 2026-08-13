# Phase 14.5A Step 3: DOM Visual Offsets

This step adds a pure DOM-to-visual-offset adapter.

## Contract

- Text nodes contribute their exact UTF-16 text length.
- `<br>` contributes exactly one visual newline.
- `<rt>`, `<rp>`, `<script>`, and `<style>` contribute no visual text.
- Horizontal and vertical writing modes share the same source offsets.
- Selection endpoints may span multiple rendered elements and ruby markup.
- The resulting visual offsets can be passed to the Step 2 logical-sentence resolver.
- The adapter is not wired into Reader runtime.
- JP Analyzer requests, output schemas, spans, candidates, cache identities, and scheduling are unchanged.
- Teaching selection, panels, evidence, corrections, decisions, hashes, and corpus formats are unchanged.
- Mining and prefetch are unchanged.

Step 3 is qualification-only. Runtime wiring must wait until this DOM contract and a separate sentence-local analyzer ownership path are both complete.
