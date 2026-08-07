# Phase 12B.2 Priority-Aware Single-Worker Scheduler

Phase 12B.2 replaces the background promise chain with one explicit scheduler. One request may be active. A visible sentence uses priority zero and runs immediately after any already-active request. Queued duplicate identities share one promise and are promoted when they become visible.

Each Reader navigation installs a new speculative plan. Queued speculative work outside the new rolling window is removed, while an already-active request is allowed to finish. Reader session cleanup rejects queued work and clears sentence-analysis cache state.

The scheduler does not change analyzer output, Reader-span interpretation, correction-aware cache identity, Teaching, dictionary, known-word, progress, or mining state.
