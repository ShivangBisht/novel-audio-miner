# Phase 13.4 Diagnostic Book Sections and Chapter Boundaries

Phase 13.4 builds a sanitized, diagnostic-only book model from the canonical package and lossless ordered event stream. It resolves declared-cover occurrences, navigation-source exclusions, front matter, fragment-aware chapter starts, chapter end points, and chapter-opening heading or image evidence.

The model uses manifest roles, spine order, navigation targets, fragments, DOM IDs, guide references, and event order. It does not depend on Japanese chapter phrases or publisher filenames. Navigation titles are represented only by lengths in the diagnostic payload.

The legacy Reader remains authoritative. No pages are hidden, reordered, or reclassified in the visible application, and JP Analyzer behavior is unchanged.
