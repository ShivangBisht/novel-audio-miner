# Phase 12B Complete

Phase 12B replaces open-ended adjacent prefetch with a bounded, priority-aware Reader analysis system.

## Delivered

- B.1: deterministic next-ten rolling planner with immediate-previous protection.
- B.2: one-request priority scheduler with foreground promotion, duplicate coalescing, and stale speculative removal.
- B.3: qualified forward replenishment, backward reuse, distant jumps, chapter navigation, and session cleanup.
- B.4: memory-only 50-entry LRU session cache with protected current, previous, forward-window, and foreground work.
- B.5: independently sanitized scheduler, cache, timing, and rolling-window observability.
- B.6: unified automated qualification, structural validation, runtime acceptance criteria, and closeout procedure.

## Final invariants

JP Analyzer remains the sole linguistic authority. Analyzer concurrency is one. Whole-book prefetch is disabled. Sentence analyses do not persist across Reader sessions. Known words, progress, settings, corrections, Teaching, dictionaries, frequency data, and mining state remain separate and unaffected.

## Release procedure

After the B.6 branch passes both closeout commands and the runtime smoke test, merge it into `main`, rerun the commands from `main`, create annotated tag `phase12b-complete`, and push `main` plus the tag.
