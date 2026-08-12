# Phase 14.5A Step 6: Controlled Runtime Integration

Step 6 is the first runtime integration. Only contextual visual scenes containing more than one logical sentence use the new path. Standalone scenes retain the original Teaching selection path.

## Contextual path

1. Map the DOM selection to visual offsets.
2. Resolve exactly one logical sentence.
3. Analyze that sentence through the existing authoritative on-demand analyzer path.
4. Qualify the result through the existing reader-span adapter and Teaching selection resolver.
5. Pass the existing `selection` and `analysis` objects to the unchanged `TeachingPanel`.

## Non-interference

Reader-visible contextual analysis, colorization, comprehension, prefetch, and mining remain unchanged. TeachingPanel, TeachingDecisionPanel, correction clients, decision clients, evidence formats, sentence hashes, corpus formats, exports, quality, governance, portability, evaluation, and tuning formats remain unchanged.
