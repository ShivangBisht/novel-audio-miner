# Alpha 10 Runtime Qualification Worksheet

**Status:** Not observed

Complete this worksheet only with directly observed results. Use `passed`, `failed`, `blocked`, or `not-applicable`. Record timestamps and evidence paths. Do not convert the manifest to `release-candidate` until every required section passes.

## Identity

- Frontend commit: `2b1d62686466d55fba6ae6cd26b978f71da4fcd7` baseline plus Alpha 10 implementation commit
- Backend commit: `a82d2713a90fb80fc66503d8d76b0be493cfde1a`
- Operator: Not recorded
- Started at: Not recorded
- Completed at: Not recorded

## Startup and ownership

- [ ] One supported launcher starts the system.
- [ ] JP Analyzer health and liveness are available.
- [ ] Frontend is available.
- [ ] Duplicate launch reuses the owned application.
- [ ] Foreign or incompatible listeners are not terminated.
- [ ] Dictionary readiness is reported without synchronization or mutation.
- [ ] Optional AnkiConnect and VOICEVOX failures remain nonblocking.

## Reader and persistence

- [ ] EPUB opens with ordered text, images, ruby, headings, and navigation.
- [ ] Contextual scenes and chapter navigation work.
- [ ] Vertical and horizontal layouts work.
- [ ] Furigana on and off work.
- [ ] Pointer and keyboard span selection are equivalent.
- [ ] Selection highlight persists and Escape clears it.
- [ ] Native drag selection remains available.
- [ ] Reader progress reloads at the same scene.
- [ ] Legacy progress migrates with backup and receipt.
- [ ] Corrupt progress fails safely without destructive overwrite.

## Analyzer and known words

- [ ] `readerSpans` render with schema 1.1 and exact source offsets.
- [ ] Unsupported analyzer schema is rejected.
- [ ] Analyzer unavailable state is recoverable.
- [ ] Complete Anki cache produces confirmed unknown vocabulary.
- [ ] Missing or partial cache does not produce false New Words.
- [ ] Manual Mark Known and Undo Known persist.
- [ ] Anki-owned known state cannot be removed by Undo Known.

## Mining and enrichment

- [ ] Latest Kiku note is loaded once and pinned throughout the operation.
- [ ] Expression mismatch is shown as a warning.
- [ ] Mid-operation newer-note creation does not retarget the operation.
- [ ] Nadeshiko path succeeds when available.
- [ ] VOICEVOX path succeeds when forced or required.
- [ ] Anki, enrichment, and media failures are recoverable and domain-scoped.

## Teaching, corrections, and dictionary

- [ ] One logical sentence can enter Teaching.
- [ ] Cross-sentence Teaching selection is rejected.
- [ ] Snapshot, diagnosis, decision, supersession, and retraction work.
- [ ] Teaching save does not tune or activate the analyzer.
- [ ] Correction preview, save, refresh, and undo work.
- [ ] Dictionary status, import, metadata, update check, cancellation, and recovery work.
- [ ] Read-only qualification does not change authoritative dictionary or Teaching bytes.

## Diagnostics and shutdown

- [ ] Debug Report includes status domains, contracts, and persistence health.
- [ ] Debug Report excludes secrets and unrestricted raw inventories by default.
- [ ] Coordinated shutdown closes frontend and analyzer listeners.
- [ ] No orphan process chain or stale owned lock remains.
- [ ] Foreign processes remain untouched.
- [ ] Both repositories are clean and synchronized after qualification.

## Final decision

- Automated frontend: Not observed
- Automated backend: Not observed
- Runtime: Not observed
- Shutdown: Not observed
- Release decision: Blocked pending evidence
