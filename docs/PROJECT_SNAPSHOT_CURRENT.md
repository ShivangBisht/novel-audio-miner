# Project Snapshot Current

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

## Deferred work

- Corpus collection continues through genuine reading and review; records must not be manufactured to satisfy readiness thresholds.
- Phase 9 tuning remains blocked until governance reports train-fit and later validation/test policies are satisfied.
- Minor Teaching UI spacing and presentation polish may be handled later without reopening Post-Alpha C.
- One-application startup remains Phase 10 work.

## Resume point

Proceed with Phase 8.10 full validation. Treat `main` in both repositories, the versioned schemas, and this snapshot as the source of truth. Do not infer tuning readiness from contract availability alone.
