# Project Snapshot Current

<!-- PHASE14_CONSOLIDATED_SNAPSHOT_START -->
## Consolidated current status through Phase 14

**Snapshot consolidation date:** 13 August 2026, IST
**Repository:** Novel Audio Miner
**Current production baseline:** Phase 14 complete
**Next planned phase:** Phase 15

> This section is the authoritative current continuation point. The complete earlier snapshot below is preserved as historical context. When an earlier current-state statement conflicts with this section, this Phase 14 consolidation takes precedence.

### Executive status

Novel Audio Miner is the Reader and orchestration application for the local Japanese Novel Miner system. JP Analyzer remains the sole linguistic authority. The supported baseline now includes Phase 8 governed Teaching evidence and corpus contracts, Phase 10 one-application startup, Phase 11 Kuromoji retirement, Phase 12 performance work, Phase 13 authoritative EPUB reconstruction, and Phase 14 contextual reading with logical-sentence Teaching compatibility.

Phase 9 tuning remains deferred until the governed corpus is mature. Phase 14 performed no training, candidate derivation, analyzer mutation, dictionary mutation, activation, or deployment.

### Roadmap position

- Phases 1-8: complete; detailed history is preserved below.
- Phase 9 governed tuning: deferred until corpus maturity.
- Phase 10 one-application startup: complete.
- Phase 11 Kuromoji retirement: complete.
- Phase 12A backend performance and Phase 12B Reader performance: complete.
- Phase 13 authoritative EPUB parser and Reader model: complete.
- Phase 14 contextual reading and logical Teaching ownership: complete.
- Phase 15: next baseline.

### Final cross-project ownership

JP Analyzer owns Japanese morphology, structure, candidates, dictionary and KWJA evidence, evidence gates, conservative resolution, exact `readerSpans`, `readerCandidates`, `readerSelection`, correction-aware identities, immutable analyzer observations, and backend Teaching/corpus contracts.

Novel Audio Miner owns EPUB interpretation, package/navigation/content-event reconstruction, sections and image roles, atomic logical sentence ranges, contextual visual scenes, DOM selection mapping, Reader rendering and navigation, known/frequency lookup, Teaching UI orchestration, Anki mining, bounded prefetch, and debug-report presentation.

Novel Audio Miner must not merge or split analyzer spans for linguistic purposes, invent grammar/name/compound identity, manufacture lookup keys, or treat dictionary misses as linguistic rejection.

### Phase 13 authoritative EPUB pipeline

```text
EPUB archive
  -> canonical package model
  -> fragment-preserving navigation and ordered XHTML events
  -> lossless text and image ownership
  -> structural sections and image roles
  -> qualified authoritative Reader model
```

The pipeline preserves ordered text, images, ruby base text, headings, breaks, tables, lists, captions, navigation fragments, cover/front-matter ownership, and chapter boundaries. Navigation documents provide structure without becoming normal Reader scenes. Qualification fallback remains inside the same Phase 13 authoritative runtime and does not restore the retired parser.

### Phase 14 contextual Reader architecture

Phase 14 delivered atomic gap-free text ranges, Unicode meaningful-character counting, complete-candidate minimum-context planning, markup-preserving slices, privacy-safe contextual diagnostics, contextual Reader activation, immutable logical-sentence ownership, DOM visual-offset mapping, sentence-local on-demand analyzer access, and controlled Teaching runtime integration.

Contextual scenes never cross images, EPUB documents, structural sections, headings, thematic breaks, or excluded navigation. Attached candidates are complete and are never truncated. Separate source blocks retain visual line or vertical-column breaks. Ruby and safe inline markup remain preserved.

Visual grouping does not redefine Teaching identity. Contextual Teaching resolves one retained logical sentence, requests an ordinary sentence-local analyzer record, and supplies the unchanged formal Teaching selection and `{ words, candidates, selection }` analysis objects.

### Analyzer, Teaching, mining, and prefetch compatibility

Phase 14 did not change analyzer HTTP records, `readerSpans`, `readerCandidates`, `readerSelection`, cache identity, correction revision, metadata lease, scheduling, Teaching selection/analysis, correction payloads, evidence, decisions, supersession, sentence hashes, corpus records, export, portability, governance, evaluation, tuning handoff, or mining selection formats.

Existing Teaching evidence remains recognized. New evidence from contextual scenes can be previewed, reviewed, saved, reopened, edited, superseded, and corrected through the existing lifecycle. No corpus migration is required.

Reader analysis remains single-worker, foreground-first, duplicate-coalescing, correction-aware, and bounded to a memory-only 50-entry session cache. The rolling plan protects current, immediate previous, and next ten planned text scenes. Images do not trigger text analysis. Mining retains its established Reader-analysis ownership.

### Qualification and cleanup

Automated qualification covers Phase 14.1-14.5, all six Phase 14.5A steps, Teaching lifecycle and decision workflow, analyzer selection ownership, mining, prefetch, session cache, Debug Report v2, Phase 13 baseline, Phase 12B validation, and production build.

Manual qualification covered multiple unrelated EPUBs with narration, dialogue, ruby, symbols, images, front/afterword material, EPUB 2/3 navigation, normalized reconstruction, horizontal/vertical layouts, standalone/contextual Teaching, existing evidence recognition, and new evidence save/reopen. Phase 14.7 found no removable live production module or unwanted tracked artifact.

### Current safety state and deferred work

Training, automatic rule generation, activation, and deployment remain disabled unless separately qualified. Continue collecting genuine Teaching evidence and preserve the earlier governance maturity gates and dictionary-recovery record.

Known non-blocking limitations:

- some tiny typographic end-matter images may remain standalone scenes;
- the production JavaScript bundle is slightly above Vite's default warning threshold;
- exact publisher pagination and fixed EPUB page geometry are not reproduced;
- the six post-recovery dictionary updates recorded below remain a controlled maintenance item unless already reapplied through the supported workflow.

### Phase 15 continuation rule

Phase 15 may rely on one authoritative EPUB parser, contextual visual scenes, immutable logical-sentence ownership, stable analyzer/Teaching/corpus contracts, and qualified mining/prefetch behavior. Phase 13 or 14 ownership must not be reopened without a documented production defect, bounded tests, and rollback.
<!-- PHASE14_CONSOLIDATED_SNAPSHOT_END -->

<!-- PHASE15_UI_PLAN_START -->
## Phase 15 UI overhaul baseline

The authoritative Phase 15 roadmap is stored at
[`docs/PHASE15_UI_OVERHAUL_PLAN.md`](PHASE15_UI_OVERHAUL_PLAN.md). Phase 15.1's
frozen information architecture is stored at
[`docs/PHASE15_1_UI_CONTRACT_FREEZE.md`](PHASE15_1_UI_CONTRACT_FREEZE.md).

Phase 15 is a presentation-only overhaul beginning from `phase14-complete`. It
may reorganize UI layout, hierarchy, styling, typography, components,
accessibility, responsiveness, visibility, and read-only presentation adapters.
It must not change EPUB reconstruction, contextual scene wording, logical
sentence ownership, JP Analyzer behavior or schemas, Teaching persistence,
corpus formats, learning/tuning, mining semantics, prefetch, or startup
ownership.

The visual direction is minimalist and harmonious across Reader, Teaching,
settings, dictionaries, diagnostics, and administration. EPUB typography remains
preserved inside the reading viewport; all application UI uses one coherent
local sans-serif stack and semantic design system.
<!-- PHASE15_UI_PLAN_END -->


**Snapshot date:** 1 August 2026, IST  
**Repository:** Novel Audio Miner  
**Post-Alpha status:** A-F complete  
**Next checkpoint:** Phase 8.10 full validation and Phase 8 closeout

## Executive status

The Japanese novel reading and mining system uses JP Analyzer as the single authority for Japanese boundaries, roles, evidence, and correction-free analyzer observations. Novel Audio Miner consumes the versioned reader-facing contracts and provides the reader, Teaching workflow, corpus administration, and advanced verification tools.

Novel Audio Miner owns the reader, Teaching workflow, correction preview, Advanced Teaching tools, and the UI clients for analyzer contracts.

Verified implementation baseline at the start of Post-Alpha F:

- JP Analyzer `main`: `f02e8f3200358733dd38a3b7ddd6c4c0d9156c12`
- Novel Audio Miner `main`: `24e9eaeb4361568d2b77b001e657f76a204317f1`
- Phase F branch: `feature/phase8-post-alpha-f-snapshot-cleanup`

## Roadmap position

- Phases 1-6: complete.
- Phase 7, dictionary management and online updates: complete.
- Phase 8 Alpha 1-10: complete.
- Phase 8 Post-Alpha A-F: complete.
- Phase 8.10, full validation and closeout: next.
- Phase 9, correction-data tuning and later controlled tuning: deliberately deferred until the governed corpus is mature.
- Phase 10, one-application startup: pending.
- Phase 11, Kuromoji retirement: completed early.
- Phase 12, reading-driven maintenance: future operating phase.

## Authoritative architecture and invariants

1. JP Analyzer owns morphology, structure, candidates, dictionary and KWJA evidence, evidence gating, final resolution, diagnostics, and compact/full output.
2. `readerSpans` is the authoritative reader-facing span contract. Spans are contiguous, non-overlapping, use exact source offsets, and reconstruct the sentence.
3. Dictionary data is evidence only. A dictionary miss is not a candidate rejection.
4. Ambiguity yields neutral or unresolved output rather than unsupported inference.
5. Operational Reader corrections are exact-occurrence records and remain separate from immutable Teaching evidence.
6. Teaching, portability, packaging, governance, handoff, and evaluation operations do not tune or mutate the analyzer.
7. Activation and deployment remain disabled unless a later phase separately validates and authorizes them.

## Phase 8 Alpha 1-10 outcome

- Alpha 1 documented analyzer observability, field ownership, scoring, gates, and serialization gaps.
- Alpha 2 implemented immutable `AnalyzerDecisionSnapshot.v1` observations with analyzer and dictionary identity.
- Alpha 3 implemented `TeachingDecisionRecord.v1` for accepted-current and corrected judgments.
- Alpha 4 added persistent snapshots, records, lifecycle events, and integrity validation.
- Alpha 5 connected the authoritative taught-range workflow to the correction-free analyzer state.
- Alpha 6 added diagnosis, inspection, supersession, and retraction.
- Alpha 7 added corpus quality states, reviewer history, duplicate/conflict handling, and eligibility.
- Alpha 8 added deterministic `TeachingCorpusExport.v1` dry-run artifacts and split assignment.
- Alpha 9 added read-only offline evaluation with leakage and regression reporting.
- Alpha 10 added verifiable controlled-activation plans and observations while live activation remained disabled.

## Post-Alpha A-F outcome

### A. Teaching evidence portability

`TeachingEvidenceTransfer.v1` provides deterministic, digest-verified export, preview, transactional import, conflict detection, and idempotency. Dictionary bytes, operational corrections, tuning, and activation are excluded. Raw JSON transport preserves large integer values and immutable digests.

### B. Self-contained corpus packaging

`TeachingTuningCorpus.v1` provides `private-local` and `redacted-shareable` profiles. Packages are deterministic and independently verifiable. Shareable packages remove source text, reviewer/private context, source identifiers, database paths, synchronization identifiers, and dictionary contents. No SQLite bytes, operational corrections, tuning artifact, activation state, or deployment state are embedded.

### C. Guided Teaching UX

The reader preserves whole-sentence before/after boundary preview and guides the reviewer through intended result, automatic diagnosis, confidence/note, and final save. User-facing `Vocabulary` maps to internal `lexical`. Candidate-generation miss, accepted-current, boundary, ranking, and role outcomes are derived from a frozen authoritative snapshot. Teaching evidence and occurrence corrections remain separate records but can be coordinated in one workflow. Existing reviewed occurrences are reconstructed, expert tools are grouped under Advanced Teaching tools, and shared analyzer access is serialized.

### D. Corpus governance and readiness

`TeachingCorpusGovernance.v1` is deterministic, independently verified, and read-only. Current verified maturity:

- harness-valid: passed;
- train-fit: insufficient;
- validation-passed: unavailable because validation is empty;
- test-passed: not claimed;
- deployment-eligible: false.

Current governed corpus evidence at the verified Phase D checkpoint:

- 5 total records, 3 active and 2 historical;
- 2 approved and 2 export-eligible records;
- train 1, validation 0, protected test 1;
- 2 independent provenance groups;
- 0 leakage findings, duplicate groups, or conflicts.

Governance report digest: `sha256:ec8d5b26ba73c76ab0137a686f7e8c820ea2da34057adacfed3171c926a72f60`.

### E. Tuning-pipeline handoff contracts

The following versioned contracts are implemented and independently verified:

- `TeachingTuningInput.v1`
- `AnalyzerCandidateArtifact.v1`
- `AnalyzerCandidateEvaluation.v1`
- `TeachingTuningHandoff.v1`

Contracts bind analyzer identity, dictionary identity, corpus and governance digests, provenance/leakage policy, split policy, compatibility, and rollback metadata. Current tuning input is blocked by `corpus-not-train-fit`. Candidate derivation, validation claims, protected-test claims, activation, and deployment were not performed.

### F. Snapshot and repository cleanup

The two project snapshots were replaced with concise current-state documents. Obsolete embedded source dumps, duplicate historical status addenda, stale resume instructions, old machine-state notes, command transcripts, and superseded current-state claims were removed from the snapshots. Relevant history, architecture, contracts, verified counts, safety boundaries, and roadmap remain.

Repository audit result at the start of Phase F:

- both feature branches were clean;
- no suspicious or untracked files were reported;
- JP Analyzer had 187 tracked files;
- Novel Audio Miner had 109 tracked files;
- runtime data, virtual environments, dependencies, caches, and generated output were ignored as intended;
- no tracked source or test file was deleted by Phase F;
- only safe regenerable cache/build artifacts are cleanup candidates.

## Current runtime and safety state

- Dictionary: 4,248,697 entries across 24 dictionaries; registry consistent.
- Dictionary SHA-256: `D2D926647AC7035C43971D57D46A270A7112FA21472CDD720879ABABA8E55D85`.
- Teaching database integrity: valid with zero reported issues at the last verified check.
- Teaching database SHA-256 at the Phase E installation checkpoint: `8186748218029B3FE07025829B0852B336F5A8563BA9920CE39724CB6ADFD2AC`.
- Training performed: no.
- Candidate artifact derived: no.
- Automatic rules generated: no.
- Analyzer mutated by Teaching: no.
- Dictionary mutated by Teaching: no.
- Activation performed: no.
- Deployment enabled: no.

Runtime databases, dictionary contents, novel files, exported evidence packages, generated reports, virtual environments, dependency directories, and build output are not committed to Git.

## Repository structure retained

### JP Analyzer

- `app/analyzer/`: production analyzer, runtime, contracts, Teaching, governance, portability, packaging, evaluation, and handoff modules.
- `app/analyzer/layers/`: consolidated linguistic layers and dictionary integration.
- `docs/`: current snapshot, phase documentation, setup guidance, and versioned schemas.
- `tests/`: contract, API, regression, lifecycle, governance, portability, packaging, and handoff tests.
- `scripts/`: supported setup and maintenance utilities.
- root requirements and test runners: retained.

### Novel Audio Miner

- `src/components/`: reader, Teaching workflow, Advanced Teaching tools, governance, portability, packaging, evaluation, and handoff views.
- `src/lib/`: API clients and integration contracts.
- `scripts/`: supported contract and build checks.
- `docs/`: current snapshot and relevant project documentation.
- root application configuration and release documentation: retained.

## Phase 8.10 closeout requirements

Before Phase 8 is declared complete:

1. run the full supported backend test suite and frontend contract/build gates on merged `main`;
2. verify portability, packaging, governance, and handoff contracts against the real runtime state;
3. verify Teaching-store integrity and dictionary registry consistency;
4. confirm Teaching and dictionary hashes remain unchanged by read-only validation;
5. confirm both repositories are clean and synchronized with `origin/main`;
6. record final merged commit IDs, final counts and digests, and any intentional deviations;
7. create the final Phase 8 completion tag only after the consolidated closeout commit is pushed.

## Phase 8.10 validation and formal closure

Status: Complete

### Validation gates

- JP Analyzer complete test suite: passed, with one intentionally disabled
  destructive legacy lifecycle case skipped.
- Novel Audio Miner frontend compatibility and contract suite: 37 passed,
  0 failed.
- Vite production build: passed.
- Required Teaching route groups: 10 of 10 present.
- Teaching-store integrity: passed.
- Corpus export verification: passed.
- Teaching portability round trip: passed.
- Private and redacted corpus-package verification: passed.
- Redacted-package privacy scan: passed.
- Corpus-governance verification: passed.
- Tuning-input and handoff-manifest verification: passed.

### Runtime identities

Teaching database SHA-256:

`8186748218029B3FE07025829B0852B336F5A8563BA9920CE39724CB6ADFD2AC`

Recovered authoritative dictionary SHA-256:

`C085D5ED805B287509AC5DC0AE26D0766AABA93C077F736D75EA19AD902C63CD`

Dictionary state:

- entries: 4,223,665;
- installed dictionaries: 24;
- registry consistency: passed;
- staged entries: 0;
- recovery required: false.

Dictionary identity digest:

`sha256:33c600e1ddf565e9f45fa209a483db83e7c25a12d8c7751a5a6d77b314306b6b`

### Contract digests

Corpus digest:

`sha256:3ca7d0a6584e4d3f1febe710f3e6f5670e43b67db8b57793093c5269ad8ebc34`

Governance-report digest:

`sha256:ec8d5b26ba73c76ab0137a686f7e8c820ea2da34057adacfed3171c926a72f60`

Tuning-input digest:

`sha256:9eeaa83086dfe941b25e0f90007a6532bf339595925d9cea4bc8bce63dc30315`

### Governance maturity

- harness valid: passed;
- train fit: insufficient;
- validation: unavailable;
- protected test: not claimed;
- candidate derivation: not performed;
- activation: disabled;
- deployment: disabled.

The insufficient training corpus does not block Phase 8 closure. Phase 8
established safe evidence capture, correction separation, lifecycle
management, quality governance, portability, deterministic packaging,
readiness reporting, and future tuning-handoff contracts. Phase 8 did not
claim that the corpus was mature enough for tuning.

### Dictionary recovery incident

The full Phase 8.10 test run exposed an isolation defect in
`test_dictionary_sync_lifecycle.py`. Synthetic lifecycle data had been written
to the authoritative runtime lexicon.

The contaminated database was preserved for forensic analysis. The runtime
dictionary was restored from the most recent structurally complete verified
recovery database. The lifecycle tests were then isolated to an operating-
system temporary database.

The complete backend suite was rerun with before-and-after dictionary hash
guards and did not modify the recovered runtime dictionary.

Six dictionary updates performed after the recovered baseline are not present
in the restored database. Those updates must be reapplied later through the
controlled dictionary-update workflow.

### Post-Alpha completion

- Post-Alpha A: complete.
- Post-Alpha B: complete.
- Post-Alpha C: complete.
- Post-Alpha D: complete.
- Post-Alpha E: complete.
- Post-Alpha F: complete.
- Phase 8.10: complete.
- Phase 8: closed.

### Deferred work

- Reapply the six post-recovery dictionary updates.
- Continue collecting genuine Teaching evidence.
- Improve corpus balance and independent provenance coverage.
- Keep tuning, candidate derivation, activation, and deployment blocked until
  corpus-governance maturity gates are met.
- Handle additional Teaching UI polish outside Phase 8.
## Phase 10: One-application startup

Status: Complete

### Delivered milestones

- Phase 10.1: startup-supervisor foundation.
- Phase 10.2: machine-local auto-discovery and diagnostics.
- Phase 10.3: in-application startup status and diagnostics.
- Phase 10.4: hidden one-click Windows launch, Reader-safe status layout,
  persistent process ownership, diagnostics launcher, and safe shutdown.
- Phase 10.5: final lifecycle hardening and formal validation.

### User experience

The application now starts from one user action:

`Japanese Novel Miner.vbs`

The launcher starts and supervises JP Analyzer and Novel Audio Miner in the
background, validates dictionary and KWJA readiness, opens the browser, and
keeps optional VOICEVOX and AnkiConnect failures nonblocking.

Users no longer need to start JP Analyzer and Novel Audio Miner separately or
open PowerShell for normal use.

### Supporting launchers

- `Japanese Novel Miner.vbs`: normal hidden startup.
- `Japanese Novel Miner - Diagnostics.vbs`: read-only startup diagnostics.
- `Japanese Novel Miner - Stop.vbs`: coordinated safe shutdown.

### Startup safety

- Duplicate launches reuse the running application.
- Foreign or incompatible services are never terminated.
- Launcher-owned listener identities are persisted and verified.
- Safe orphan cleanup is available if the supervisor exits unexpectedly.
- Final coordinated shutdown records all components as stopped.
- Startup does not synchronize or mutate the dictionary.
- No permanent dictionary file hash is hard-coded.
- Work and home computers may use different resolved paths and dictionaries.

### Reader integration

The application-status control uses reserved Reader layout space and no longer
overlaps the book toolbar, Load another book control, scene navigation, or
vertical reading content.

### Teaching behavior

Startup-only operation does not modify the Teaching database.

Entering guided Teaching review may capture an immutable analyzer snapshot for
reproducibility. No Teaching decision is created until Save Teaching evidence
is explicitly selected.

### Remaining roadmap

- Phase 9 remains deferred until the governed Teaching corpus is mature.
- Phase 10 is complete.
- Phase 11, Kuromoji retirement, was completed early.
- Phase 12 remains future reading-driven maintenance.

<!-- ALPHA_STABILIZATION_BASELINE_START -->
## Alpha stabilization baseline

novel-audio-miner is frozen for Alpha stabilization. Phase 15 is paused after Phase
15.4. The authoritative stabilization roadmap is
[`docs/ALPHA_STABILIZATION_ROADMAP.md`](ALPHA_STABILIZATION_ROADMAP.md), and the
preserved post-Alpha roadmap is
[`docs/PHASE16_ROADMAP.md`](PHASE16_ROADMAP.md).

Alpha 1 records responsibility, source-of-truth, route, persistence, and
retirement registries without changing production behavior.
<!-- ALPHA_STABILIZATION_BASELINE_END -->

<!-- ALPHA2_CANONICAL_INTERACTION_START -->
## Alpha 2 canonical Reader interaction

Alpha 2 establishes one immutable word-level interaction identity resolved from
the current authoritative `readerSpans`. New Words is now a reference-based view,
not an actionable span authority. DOM and New Words entry paths are qualified by
an equivalence test, and known-word mutations receive explicit interaction
identity. Teaching range contracts and backend contracts remain unchanged.
<!-- ALPHA2_CANONICAL_INTERACTION_END -->


## Alpha 3 selection interaction

Alpha 3 adds click, tap, and keyboard activation for exact authoritative Reader spans, persistent canonical-span highlighting, accessible focus, and Escape-to-clear. Native drag remains available for copying and existing Teaching ranges. JP Analyzer contracts, New Words authority, known-word persistence, Teaching, contextual scenes, EPUB parsing, enrichment, dictionaries, and prefetch remain unchanged.


## Alpha 4 known-word authority

Alpha 4 separates Anki-derived, manual-known, and effective union state. Cache readiness, completeness, refresh time, counts, failures, and indeterminate unknown state are explicit. Missing or partial cache data is not treated as confirmed unknown vocabulary.


## Alpha 5 latest-Kiku-note enrichment

Alpha 5 extracts enrichment orchestration, discovers the latest configured Kiku note once, pins its identity throughout the operation, previews the target expression, warns on canonical lookup mismatch, and prevents mid-operation retargeting.


## Alpha 6 status and integration authority

Alpha 6 replaces shared Reader status with immutable domain-owned selection, known-word, enrichment, Teaching, correction, analyzer, dictionary, AnkiConnect, and startup status snapshots. Cross-domain overwriting is eliminated and Debug Report v2 retains all domains.


## Alpha 7 frontend/backend contract consolidation

Alpha 7 registers canonical production routes and request/response structures, validates authoritative analyzer payloads, detects route and schema drift, contains compatibility projections, and includes contract diagnostics in Debug Report v2.


## Alpha 8 persistence and migration hardening

Alpha 8 inventories persistence ownership, versions Reader progress, adds backup-before-write migration and rollback receipts, classifies corrupt and incompatible records, and includes read-only persistence health in Debug Report v2 without mutating backend stores.


## Alpha 9 legacy and unwanted code retirement

Alpha 9 removes the unused known-word legacy-key symbol while preserving bounded cleanup for existing installations, and records explicit consumer or migration blockers for compatibility code that remains active. No production authority or backend store changes.


## Alpha 10 full-system qualification and release candidate

Alpha 10 binds the frontend and backend checkpoints in a release-candidate manifest, adds a complete inherited automated gate, replaces stale Kuromoji-era release documentation, and provides an operator runtime worksheet. Initial status is implementation-complete and release remains blocked until backend, runtime, shutdown, clean-repository, and pushed-commit evidence is recorded.


## Phase 15.5 Reader actions and feedback cleanup

Phase 15.5 extracts the Reader action area into a presentation-only component and clarifies selected-span role, known ownership, mining eligibility, pinned Kiku target, progress, completion, mismatch, failure, and recovery text. Alpha 1-10 authority, persistence, and release-candidate boundaries remain unchanged.

## Phase 15.6 Teaching presentation overhaul
Phase 15.6 presents the Reader-connected Teaching workflow as a responsive drawer or full-screen sheet with clearer selection, preview, diagnosis, evidence, correction, quality, save, success, and recovery hierarchy. Teaching inputs, records, lifecycle, persistence, clients, and backend behavior remain unchanged.

### Phase 15.6 runtime layout refinement
The Teaching surface opens from the left edge of the Reader content area, uses a wider readable layout with two-column choices and comparisons where space permits, and uses a distinct plum-charcoal surface palette.

## Phase 15.7 settings and administration workspace
Phase 15.7 replaces nested Reader Tools disclosures with a coherent responsive workspace for Reading, Integrations, Dictionaries, Teaching administration, and Diagnostics while retaining existing clients, state ownership, persistence, and backend contracts.

## Phase 15.8 design system, responsiveness, and accessibility
Phase 15.8 consolidates semantic UI tokens, shared controls, focus treatment, touch sizing, responsive overflow behavior, reduced motion, forced-colour support, and Settings focus management while preserving Reader typography and all processing contracts.
