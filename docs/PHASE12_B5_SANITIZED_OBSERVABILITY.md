# Phase 12B.5 Sanitized Scheduler Observability

Phase 12B.5 adds a privacy-safe operational snapshot to Debug Report v2. It reports scheduler counts, active work class and priority, queue composition, promotions, duplicate coalescing, stale removals, session-cache size and limit, protected count, evictions, visible analysis timing and source, and rolling-window progress.

The observability snapshot excludes sentence text, hashes, cache identities, stored identities, analyzer results, Reader-span surfaces, raw KNP output, EPUB content, and book text. Reading the snapshot is observational only and does not mutate scheduling or cache state.

The broader manual debug report retains its existing troubleshooting content. The new `analyzerObservability` section is independently sanitized for performance qualification and operational comparison.
