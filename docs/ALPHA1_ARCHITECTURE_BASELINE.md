# Alpha 1 Architecture Baseline and Audit Closeout

## Baselines

The machine-readable baseline is `docs/ALPHA_BASELINE_MANIFEST.json` in both
repositories. It records repository path, branch, commit, audit bundle name, and
workflow responsibility.

## Alpha 1 deliverables

- Alpha roadmap frozen
- Phase 15 resumption plan frozen
- Phase 16 roadmap preserved
- source-of-truth matrix created
- route and contract registry created
- persistence registry created
- deprecation inventory created
- frontend and backend snapshot links created
- validation script added to the frontend repository

## Non-production boundary

Alpha 1 changes documentation, baseline metadata, and validation only. It does
not modify Reader, analyzer, Teaching, dictionary, correction, enrichment,
startup, cache, or persistence runtime behavior.

## Exit criteria

- frontend is clean at the recorded Phase 15.4 commit before installation
- backend is clean at the recorded main commit before installation
- both repositories contain identical responsibility and roadmap decisions
- every primary domain fact has one named owner
- every persistent store has one named owner
- every compatibility item is classified before removal
- Phase 16 remains durable after Alpha and Phase 15
