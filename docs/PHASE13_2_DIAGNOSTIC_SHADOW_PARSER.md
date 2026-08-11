# Phase 13.2 Diagnostic EPUB Shadow Parser

Phase 13.2 connects the Phase 13.1 package and content-event models to real EPUB parsing in diagnostic shadow mode.

The existing parser remains authoritative for visible Reader output. The shadow parser receives the already-open ZIP package and OPF document, builds a fragment-preserving package model, adapts EPUB 3 navigation or EPUB 2 NCX, walks linear HTML spine resources, and records structural diagnostics.

The book result now contains `epubShadowParser`. Debug Report v2 exports the same structural section under `epub.shadowParser`.

The diagnostic payload includes counts, canonical resource paths, navigation fragments, cover candidates, document event summaries, and reconstruction failures. It excludes extracted block text and HTML. A shadow failure is captured as a status and never blocks the legacy parser from opening the book.

## Qualification procedure

Open representative private novels with Debug Mode enabled and export Debug Report v2. The visible Reader should remain unchanged. Compare the structural shadow section for a known-good EPUB and examples with visible TOC pages, incorrect chapter assignment, misplaced images, image-based chapter titles, or decorative logos.

No EPUB files or copyrighted book content are committed.
