# Phase 12B.1 Rolling Prefetch Planning and Session Boundaries

Phase 12B.1 replaces adjacent-only planning with a deterministic rolling text-scene window. It changes planning and Reader-session cache lifetime only; priority-aware request execution is deferred to Phase 12B.2.

For current scene `N`, the planner orders valid text scenes as `N+1` through `N+5`, immediate previous, then `N+6` through `N+10`. Images, blank scenes, and duplicate sentence text are skipped. The forward window stops at ten text scenes and never continues through the entire book.

The Reader passes the planner's ordered text targets to the existing serialized prefetch implementation. When the Reader unmounts or the book identity changes, only the JP Analyzer sentence-analysis cache and analyzer metadata lease are cleared. Reading progress, Reader settings, known words, corrections, Teaching data, dictionaries, frequency data, and mining state are unchanged.

Phase 12B.2 will replace the existing promise chain with an explicit single-worker priority scheduler, including foreground promotion and stale speculative queue replacement.
