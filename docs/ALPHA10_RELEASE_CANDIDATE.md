# Alpha 10 Full-System Qualification and Release Candidate

Alpha 10 binds Novel Audio Miner and JP Analyzer to exact commits and freezes the Alpha 1 through Alpha 9 architecture. The automated gate validates the API, persistence, and retirement registries, authority invariants, release documentation, backend test inventory, and the rule that unobserved runtime checks cannot be claimed as passed.

The initial manifest intentionally remains `implementation-complete` with `releaseDecision: blocked-pending-runtime-qualification`. Automated success alone does not create a release candidate. The operator must complete the runtime worksheet, run the supported backend suite, verify shutdown, record evidence, push the final commits, and then update the manifest in a separately reviewed closeout.

JP Analyzer production code is unchanged. Rollback remains the Alpha 9 frontend commit and the retained backend commit recorded in the manifest.
