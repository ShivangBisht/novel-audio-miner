# Phase 12B.3 Reader Rolling-Window Integration Qualification

Phase 12B.3 qualifies the B.1 rolling planner and B.2 single-worker scheduler as one Reader navigation system.

The qualification covers initial window ordering, one-step forward replenishment, immediate-previous protection, one-step backward reuse, distant jumps, stale speculative removal, preservation of an already-active request, foreground promotion, duplicate coalescing, and session queue cleanup.

The production Reader already passes structured B.1 targets into the B.2 scheduler. This phase adds integration evidence without changing linguistic output, Reader-span rendering, correction-aware identity, Teaching, dictionary, known-word, progress, or mining behavior.

A real-Reader smoke test remains required before commit: sequential navigation, one-step backward movement, a distant scene jump, correct colourization, and zero analyzer restarts or fallbacks.
