# Project Snapshot

<!-- PHASE7_FINAL_BEGIN -->
<!-- PHASE8-ALPHA10-STATUS-UPDATE:START -->

## Status Addendum â€” Phase 8 Alpha 1â€“10 Complete; Post-Alpha Inserted Before Phase 8 Closeout

**Addendum date:** 31 July 2026, IST  
**Status authority:** This addendum supersedes older â€œcurrent phase,â€ â€œnext checkpoint,â€ and Phase 8 status statements elsewhere in this historical snapshot. Earlier implementation history and embedded source evidence remain retained for audit.  
**Verified Git baseline:**  
- **JP Analyzer:** `main` at `f47da3da95438a6b8a8d5eb195b8cfe928b2072f`  
- **Novel Audio Miner:** `main` at `c3706091a5bdf2f9520f1f27aa318294dd55dd9f`  

### Current roadmap position

- **Phase 7 â€” Dictionary Management and Online Updates: complete.**
- **Phase 8 â€” Teaching, Correction, Annotation Corpus, and Read-Only Tuning: active; Phase 8 Alpha 1â€“10 is complete.**
- **Current checkpoint:** **Phase 8 Post-Alpha â€” portability, packaging, clarity, and corpus-readiness consolidation.**
- **Phase 8.10 â€” Phase 8 validation and closeout: pending completion of the Post-Alpha checkpoint.**
- **Phase 9 â€” Correction data and ranker tuning / later controlled tuning: deliberately deferred to the last major implementation phase, after sufficient corpus has been collected through normal reading and maintenance.**
- **Phase 10 â€” One-application startup: pending.**
- **Phase 11 â€” Retire Kuromoji: completed early in Phase 5.2E.**
- **Phase 12 â€” Reading-driven maintenance: ongoing/final operating phase after the remaining implementation phases.**

### Phase 8 Alpha 1â€“10 completed outcome

1. **Alpha 1 â€” Current analyzer observability audit: complete.** Analyzer fields, evidence, scoring, gates, conflicts, and final-decision ownership are documented.
2. **Alpha 2 â€” `AnalyzerDecisionSnapshot.v1`: complete.** Immutable, content-addressed analyzer observations preserve analyzer and dictionary identity.
3. **Alpha 3 â€” `TeachingDecisionRecord.v1`: complete.** Accepted-current and corrected judgments, asserted target, partial review coverage, confidence, provenance, and immutable digests are represented.
4. **Alpha 4 â€” Persistent decision store and executable validation: complete.** Snapshots, records, lifecycle events, integrity checks, and contract fixtures are persisted.
5. **Alpha 5 â€” Authoritative taught-range workflow: complete.** The workflow captures the real analyzer state and reviewer-approved target without creating a second semantic engine.
6. **Alpha 6 â€” Review management and failure diagnosis: complete.** Inspection, diagnosis, retraction, supersession, and failure classification are supported.
7. **Alpha 7 â€” Corpus quality governance: complete.** Captured, needs-review, reviewed, approved, and rejected-for-corpus states, reviewer history, duplicate/conflict handling, and eligibility are implemented.
8. **Alpha 8 â€” Deterministic corpus export dry run: complete.** `TeachingCorpusExport.v1` assigns deterministic train/validation/test splits and produces verifiable artifacts while export and activation remain disabled.
9. **Alpha 9 â€” Read-only offline evaluation: complete as an evaluation harness.** `TeachingOfflineExperiment.v1` compares a frozen baseline with supplied candidate predictions, reports dependency-aware metrics, leakage and regressions, and does not tune the analyzer.
10. **Alpha 10 â€” Controlled activation contract: complete in shadow-only form.** `TeachingControlledActivation.v1` supports verifiable plans and observations while Reader replacement, live mutation, dictionary mutation, automatic deployment, and production activation remain disabled.

### Verified current evidence and runtime state

- Teaching records: **3 total, 2 active, 1 superseded**.
- Approved active records: **2**.
- Duplicate groups: **0**.
- Conflicts: **0**.
- Export eligible: **2**.
- Corpus split: **train 1, validation 0, test 1**.
- Corpus digest: `sha256:a5e76119835fb5cbe3798c77a62cc9c110b50c5146edc715d6aff633f50bdd34`.
- Teaching database integrity: valid, with zero reported issues.
- Corrected train evidence: `ã ã£ãŸ`, role `function`, diagnosis `candidate-generation-miss`; correction-free analyzer output remains `ã ã£ | ãŸ`.
- Accepted-current test evidence: `å¼•ãå–ã‚Šã¾ã™`, role `lexical`; candidate, boundary, and classification match the frozen analyzer decision.
- Dictionary: **4,248,697 entries across 24 dictionaries**, registry consistent.
- Dictionary SHA-256: `D2D926647AC7035C43971D57D46A270A7112FA21472CDD720879ABABA8E55D85`.

### Teaching requirement clarified

Teaching captures a trustworthy supervised example consisting of:

- exact source sentence, selected range, offsets, surface, and provenance;
- frozen analyzer before-state, candidate inventory, Reader partition, analyzer identity, and dictionary identity;
- reviewer judgment, approved boundary, approved classification, optional identity, confidence, and note;
- failure diagnosis when the analyzer is corrected;
- immutable record/snapshot digests, lifecycle history, quality history, and deterministic corpus split.

Teaching itself **does not** train the analyzer, generate global rules, mutate dictionaries, activate candidate behavior, or deploy changes. Occurrence-level Reader correction remains a separate operational feature.

### Phase 8 Post-Alpha â€” inserted checkpoint before Phase 8.10 closeout

This checkpoint completes the readiness work exposed by the Alpha verification. It remains part of Phase 8 and remains non-tuning and non-activating.

#### A. Runtime-data portability and safe synchronization

- Add a versioned Teaching export/import contract for moving evidence between work and home computers.
- Merge by record and snapshot identity; detect digest conflicts rather than overwriting silently.
- Preserve lifecycle events, quality events, snapshot references, reviewer metadata, and supersession history.
- Make imports idempotent and provide a dry-run preview before writes.
- Keep SQLite runtime databases out of Git.
- Treat operational corrections as a separate optional portability stream.

#### B. Self-contained, privacy-aware corpus packaging

- Produce a tuning-input package that can be verified without direct access to the local Teaching SQLite database.
- Include source input or an approved redacted representation, frozen baseline spans/candidates, approved target, analyzer identity, dictionary identity, quality approval, split, and record/snapshot digests.
- Provide private-local and redacted-shareable profiles.
- Do not embed SQLite bytes by default and do not perform tuning during package generation.

#### C. Teaching UX clarity and guided review

- Clearly separate **Teaching evidence**, **occurrence correction**, **quality approval**, **corpus preparation**, **offline evaluation**, and **shadow activation**.
- Explain every field and action in plain language.
- Show before-state, approved target, diagnosis, lifecycle, reviewer, quality state, split, and export eligibility.
- Never imply that Save, approval, or export preview tunes the analyzer.
- Keep test-split records visibly evaluation-only.

#### D. Corpus governance and scale readiness

- Add coverage and balance reports by judgment, failure class, asserted role, provenance group, reviewer, and split.
- Add corpus sufficiency reporting for train, validation, and test.
- Strengthen leakage prevention using provenance groups, not only record IDs.
- Distinguish `harness-valid`, `train-fit`, `validation-passed`, `test-passed`, and `deployment-eligible`.
- Never present train-only improvement as generalization or deployment readiness.

#### E. Tuning-pipeline handoff contract only

- Define versioned future tuning-input and candidate-output contracts.
- Pin analyzer and dictionary identities and require reproducibility, provenance, evaluation reports, compatibility checks, and rollback metadata.
- Keep candidate derivation, candidate evaluation, shadow observation, and production deployment as separate controlled stages.
- Do not implement model training, automatic rule generation, live mutation, or deployment inside Phase 8.

#### F. Snapshot and export cleanup

- Correct snapshot README interpolation and escape corruption.
- Remove misleading `invalid-record-digest` reasons caused only by hydrated historical lifecycle state.
- Add a stable consolidated snapshot generator, regression tests, and privacy checks.
- Redact local paths, book titles, and neighboring novel context in shareable snapshots.

### Phase 8 Post-Alpha exit criteria

The inserted checkpoint is complete only when:

- Teaching evidence can be exported, previewed, verified, merged, and imported without loss of immutable records, snapshots, lifecycle events, or quality history;
- repeated imports are idempotent and digest conflicts require explicit resolution;
- a deterministic self-contained corpus package is independently verifiable without opening the local Teaching database;
- the frontend clearly distinguishes evidence capture, occurrence correction, approval, export preparation, offline evaluation, and shadow activation;
- corpus reports state whether train, validation, and test evidence is sufficient;
- the future tuning handoff contract is versioned and documented while tuning remains unimplemented;
- all Phase 8 and Post-Alpha tests pass, both repositories are synchronized on `main`, and dictionary identity remains unchanged.

### Reiterated remaining roadmap after the inserted checkpoint

1. **Phase 8.10 â€” Phase 8 validation and closeout.** Re-run end-to-end capture, accepted/corrected/rejected labels, persistence, supersession, approval, portable export/import, self-contained packaging, replay/simulation, privacy checks, regression suites, and dictionary invariance. Close Phase 8 only after the Post-Alpha exit criteria pass.
2. **Phase 10 â€” One-application startup.** Provide one reliable startup and shutdown workflow for the Reader, JP Analyzer, local services, health checks, logs, and recovery.
3. **Phase 11 â€” Retire Kuromoji.** Already completed early in Phase 5.2E; retain as historical roadmap context and do not repeat it.
4. **Phase 12 â€” Reading-driven maintenance and corpus growth.** Continue real reading, Teaching evidence capture, dictionary maintenance, analyzer bug triage, EPUB issue classification, regression monitoring, and controlled releases. Use this operating period to build a sufficiently diverse approved corpus with meaningful train, validation, and protected test coverage.
5. **Deferred Phase 9 â€” Correction data and ranker tuning / later controlled tuning.** Treat Phase 9 as the last major implementation phase for now. Start it only after corpus sufficiency gates are met. Use train data for derivation, validation data for selection, and protected test data for final evaluation; publish versioned artifacts and prevent production activation unless separately approved. After any approved tuning release, return to Phase 12 reading-driven maintenance.

### Safety state

```text
Tuning performed: false
Rules generated: false
Corpus export activation: false
Live analyzer mutation: false
Dictionary mutation: false
Automatic deployment: false
Production deployment: false
```

<!-- PHASE8-ALPHA10-STATUS-UPDATE:END -->

## Phase 7 — Dictionary Management and Online Updates (Complete)

Completed on 2026-07-27.

- JP Analyzer SQLite remains the authoritative dictionary store.
- Installed dictionaries: **24**.
- Live and registered entries: **4,241,269**.
- Registry consistency: **true**.
- Integrity check: **ok**.
- Configured online update sources: **5**.
- Five real dictionaries were updated successfully through the integrated Settings workflow.
- Unsupported or source-less dictionaries remain manually replaceable by ZIP.
- Browser-first update checks/downloads use a controlled JP Analyzer fallback.
- Per-dictionary replacement is staged, validated, and atomically promoted.
- Home-network follow-up is retained for sources blocked by the office network.

Final runtime evidence: `D:\Mining\_DELETE_AFTER_20260726\phase7\audits\PHASE7_FINAL_RUNTIME_REPORT.md`.
<!-- PHASE7_FINAL_END -->

<!-- PHASE7_CLOSEOUT_BEGIN -->
### Phase 7 closeout status

- Finalized: **2026-07-27**.
- JP Analyzer commit at closeout: `0d12d51`.
- Novel Audio Miner commit at closeout: `08dc3bc`.
- Authoritative database: `D:\Mining\JP analyzer\data\phase8_analysis_lexicon.sqlite3`.
- Installed dictionaries: **24**.
- Live entries: **4,241,269**.
- Registry entries: **4,241,269**.
- Registry consistency: **true**.
- SQLite integrity: **ok**.
- Configured online update sources: **5**.
- Staged entries: **0**.
- Active dictionary operations: **0**.
- Five real dictionaries were updated successfully through the integrated Settings workflow.
- Dictionaries without a verified online source remain supported through atomic local ZIP replacement.
- Remaining network-dependent source checks are documented for home-network verification.
<!-- PHASE7_CLOSEOUT_END -->

---

## Phase 8 Architecture Addendum — Teaching, Correction, Annotation Corpus, and Read-Only Tuning

**Addendum date:** 28 July 2026, IST  
**Status supersession:** This addendum preserves the historical snapshot above but supersedes its older roadmap position. Phase 7 is complete. Phase 8.1 through Phase 8.4 are complete and manually validated. The next implementation checkpoint is **Phase 8.5A — annotation contract and current-data audit**.

### Clarified Phase 8 objective

Teaching Mode is not only a visual boundary editor. It must support two connected outcomes:

1. **Immediate operational correction.** The current Reader must apply the corrected span boundary, role, learning eligibility, lookup behaviour, and resulting colour after an explicit Save.
2. **Long-term supervised evidence.** Every successful Save must also capture a safe, analyzer-compatible annotation that can later be used to diagnose and tune the appropriate analyzer stage.

Real production tuning is intentionally deferred until a sufficiently broad corpus has been collected through normal reading. Phase 8 will include the complete correction and data-gathering system plus a **read-only tuning lab** that can simulate and evaluate proposals without changing production analyzer rules, dictionaries, weights, or runtime behaviour.

### Operational corrections versus learning annotations

The two records are linked but have different purposes:

- **Operational correction:** small, deterministic, active/inactive, revision-aware, immediately applied to exact sentence/range output, and undoable.
- **Learning annotation:** immutable or revisioned evidence containing the historical analyzer snapshot, user target, coverage mask, confidence, provenance, derived outcome, and Save/Undo/supersession history.

Undo deactivates the operational correction but must not erase the historical learning event. The annotation becomes retracted or superseded and is excluded from active tuning data by default.

### User-supervision semantics

A Teaching action certifies only what the user explicitly selected:

- **Show as one unit:** selected range is one preferred Reader span.
- **Split:** selected range has the explicitly chosen internal boundaries.
- **Vocabulary:** selected range is one preferred span with lexical/vocabulary role.
- **Grammar:** selected range is one preferred span with learnable-grammar role.
- **Function:** selected range is function material.
- **Name:** selected range is a name span.
- **Leave uncoloured / unresolved:** no confident learning colour or linguistic role should be asserted for the selected range.

The analyzer remains responsible for derived headword, grammar identity, known lookup key, frequency lookup key, dictionary evidence, comprehension inclusion, New Words inclusion, mining eligibility, and colour policy. The annotation must distinguish **user asserted**, **analyzer derived**, **baseline observed**, **unknown**, **unreviewed**, **retracted**, and **superseded** values.

For a Vocabulary correction such as `電子 | 書籍 → 電子書籍`, the explicit target is one lexical unit. The corrected pipeline must then derive and record whether `電子書籍` became the known/frequency lookup identity and whether the expected comprehension, New Words, mining, and colour behaviour followed. A visually merged span with incorrect lookup identity is not a complete correction.

### Partial-range supervision safety

Every saved annotation is partial by default:

- selected range: `reviewed-corrected`;
- remainder of sentence: `unreviewed`;
- whole sentence reviewed: `false`.

Unreviewed boundaries, roles, identities, and colours must never be treated as approved, rejected, gold, or negative training labels. Read-only tuning and future training must use an ignore mask outside reviewed ranges. A later explicit whole-sentence review action may be added, but must require deliberate confirmation and should be described as user-reviewed rather than automatically linguistic gold.

### Multiple corrections and overlap rules

One sentence example may contain multiple independent annotations sharing a sentence/analyzer snapshot.

- Non-overlapping ranges may coexist.
- A later correction on the same range is a revision/supersession with retained history.
- Partial overlap or containment must not be silently applied as contradictory flat spans. The UI/API must require undo, replacement, or an explicit future hierarchical model.
- Each Save is followed by correction-aware re-analysis. A later annotation records both the original raw analyzer baseline and the effective correction revision against which the new decision was made.

### Confidence and review state

Each annotation supports:

- `preference` — default;
- `confident`;
- `needs-review`.

Recommended quality progression is: user preference → repeated preference → evidence-supported → reviewed → gold. Ordinary Teaching saves must not claim expert linguistic gold.

### Provenance and cross-book applicability

Annotations retain book ID/title, chapter, scene, canonical sentence, sentence fingerprint, selected offsets, surrounding context, analyzer version, schema versions, correction revision, dictionary identity, and timestamps when available. Provenance is book-specific for audit, duplicate control, and data-leakage prevention. Validated tuning proposals may apply globally across future books after grouped evaluation; one operational correction never becomes an immediate global rule.

### Required annotation content

A committed sample must preserve or reference:

1. sentence and source provenance;
2. raw analyzer identity and schema versions;
3. correction revision before and after Save;
4. relevant analyzer layers or a lossless snapshot reference;
5. baseline `readerSpans`;
6. complete `readerCandidates`;
7. complete `readerSelection` and final-decider decisions;
8. selected source range and surface;
9. Teaching action, target role, and split offsets;
10. authoritative preview target spans;
11. effective post-correction spans and derived lookup/learning/colour fields;
12. correction ID and annotation ID;
13. confidence, optional note, and coverage mask;
14. Save, Undo, retraction, and supersession history;
15. deterministic grouped train/development/test assignment for later experiments.

Preview alone does not create a committed annotation. Every successful explicit Save creates one automatically.

### Tuning taxonomy

Corpus analysis must classify likely failure location rather than treating every correction as one generic error:

- desired candidate missing;
- candidate present but final decider rejected it;
- under-grouping;
- over-grouping;
- role classification error;
- lookup/headword identity error;
- Reader projection error;
- learning-eligibility error;
- colour-policy consequence;
- insufficient evidence or unclassified.

This distinction determines whether eventual work belongs in candidate generation, dictionary evidence, scoring/gates, overlap resolution, role policy, identity resolution, or Reader projection.

### Read-only tuning lab

Phase 8 includes a safe trial-tuning facility that can:

- select an annotation subset;
- group related examples to prevent train/test leakage;
- propose or load a candidate rule;
- replay or simulate baseline versus proposed output;
- evaluate only reviewed ranges;
- report supporting examples, improvements, regressions, abstentions, and unchanged cases;
- calculate boundary, role, identity, and candidate-selection metrics;
- export a reproducible proposal report.

The lab must never modify production analyzer rules, dictionaries, correction data, final-decider weights, cache identity, or runtime configuration. Production tuning remains a later controlled phase after sufficient data collection.

### Revised remaining Phase 8 roadmap

- **8.5A — Annotation contract and current-data audit:** inventory available analyzer layers/candidates/decisions and define versioned schemas, assertions, coverage, history, conflict, and export contracts.
- **8.5B — Corpus persistence backend:** append-only/revisioned snapshots, annotations, correction links, retraction, supersession, provenance, and validation.
- **8.5C — Multiple annotations and conflict handling:** shared sentence snapshots, raw versus effective baselines, same-range revision, non-overlapping coexistence, and overlap rejection/replacement.
- **8.6 — Frontend annotation workflow:** confidence, notes, derived identity/colour preview, annotation IDs/status/history, sentence review coverage, and conflict messages.
- **8.7 — Corpus management and export:** filters, summaries, JSONL export, optional indexes, schema validation, duplicate checks, and deterministic grouping.
- **8.8 — Read-only corpus analysis:** failure taxonomy, repeated-pattern discovery, candidate-presence analysis, and likely responsible-stage reporting.
- **8.9 — Read-only tuning lab:** baseline/proposal simulation, partial-mask evaluation, grouped development/test comparison, regression reporting, and no activation.
- **8.10 — Phase 8 validation and closeout:** end-to-end correction, colour, persistence, multiple corrections, history, export, analysis, tuning simulation, and regression verification.

### Phase 8 closure criteria

Phase 8 closes when the application can:

- correct any supported Reader boundary or role mistake;
- immediately reflect corrected grouping, role, learning behaviour, lookup identity where derivable, and colour;
- persist, refresh, restart, and Undo operational corrections;
- automatically capture a safe partial annotation with historical analyzer evidence;
- support multiple non-overlapping corrections per sentence and explicit conflict handling;
- retain retraction and supersession history;
- manage, validate, and export the corpus;
- analyze likely failure stages;
- simulate tuning proposals reproducibly without modifying production behaviour;
- pass existing Reader, cache, prefetch, selection, mining, dictionary, Debug Report, layout, and build regressions.

After Phase 8 closeout, normal novel reading becomes the data-collection period. Real global analyzer tuning begins only after enough diverse annotations exist and read-only experiments demonstrate cross-book improvement on held-out data.


### Novel Audio Miner status through Phase 8.4

Completed frontend capabilities include exact browser-selection resolution across plain text, ruby/furigana, EPUB whitespace, fragmented coloured spans, horizontal and vertical rendering; Teaching Mode actions and authoritative Preview; explicit confirmed Save; immediate analyzer cache/metadata invalidation and forced refresh; active correction display; confirmed Undo; restart persistence; and vertical-text layout isolation so selection does not resize the Reader.

The next frontend work must present annotation confidence, optional notes, user target versus analyzer-derived outcome, correction/annotation IDs, current sentence review coverage, annotation history, multiple active corrections, and clear overlap/supersession handling. The frontend must continue sending exact source offsets and EPUB/book/chapter/scene provenance while leaving all linguistic interpretation to JP Analyzer.

Colour is part of validation, not a cosmetic afterthought. After a role correction, the UI must verify and expose the corrected span's derived lookup identity, known/frequency state, comprehension inclusion, New Words inclusion, mining eligibility, presentation class, and final visible colour source.

---

## Phase 8 Alpha Frontend Addendum: Analyzer-Native Teaching Supervision

**Addendum date:** 30 July 2026, IST  
**Current repository phase:** `feature/phase8-teaching-annotations`  
**Status:** Phase 8.6 established the experimental Teaching panel, confidence, notes, provenance, annotation history, derived-outcome display, Save, replacement, and Undo lifecycle. Production corpus retention is paused pending Phase 8 Alpha contracts.

### Frontend purpose supersession

The Teaching panel's primary purpose is not to show a corrected colour or permanently edit one Reader span. Its primary purpose is to create reliable partial supervision for JP Analyzer while the user reads normally.

The frontend must help the reader state one of the following about an exact reviewed range:

```text
✓ Analyzer is correct
Correct analyzer boundary and/or classification
Reject an analyzer candidate or classification
Skip / leave unreviewed
```

The backend remains solely responsible for linguistic evidence, candidate generation, dictionary/KWJA evaluation, scoring, decision comparison, Reader-span construction, learning policy, and corpus persistence.

### Positive examples

A visible tick action must be added:

```text
✓ Analyzer is correct
```

This labels only the selected current range as `reviewed-accepted`. All other sentence ranges remain unreviewed. The positive action is mandatory so the corpus does not contain only analyzer errors and become correction-biased.

Future corpus summaries must expose accepted, corrected, rejected, skipped, and unreviewed counts by role and candidate family.

### Teaching workflow v2 controls

Boundary and classification must become separate controls.

```text
Boundary
- Keep current
- Merge into one unit
- Split at selected offsets

Classification
- Keep current
- Vocabulary
- Grammar
- Function
- Name
- Unresolved

Review outcome
- ✓ Analyzer is correct
- Save correction
- Reject candidate or classification
```

Quality metadata must also separate:

```text
Judgment type
- Objective correction
- Contextual interpretation
- Reader presentation preference

Confidence
- High
- Medium
- Low
- Needs review
```

The frontend must not supply lookup keys, grammar IDs, name identities, feature values, scores, mining policy, comprehension policy, or colour policy unless a later explicit expert-editing workflow is designed. Those fields are analyzer-derived and displayed for audit only.

### Reasoning preview

Before Save, the panel should present a concise projection of:

```text
current analyzer structure
current selected candidate or partition
relevant alternative candidates
reader-approved target
whether the approved candidate already existed
candidate-generation miss versus ranking/gate/role/identity outcome
identity confirmation or ambiguity
partial review coverage
```

Detailed feature values, utility dimensions, scores, gates, dictionary attempts, and evidence can remain in an expandable diagnostics section.

### Partial review safety

Every interaction must identify exact source offsets and one of:

```text
reviewed-accepted
reviewed-corrected
reviewed-rejected
unreviewed
```

The frontend must never imply that the complete sentence was approved merely because one range was corrected or accepted. Whole-sentence review, if added later, requires a separate deliberate action.

### Analyzer-native target display

The post-Teaching target shown in the Reader must come from JP Analyzer in the same authoritative `readerSpans` format used by ordinary analysis.

The frontend must continue to:

- validate sentence equality, offsets, surfaces, order, contiguity, no overlap, and full reconstruction;
- consume analyzer-owned role, lookup, comprehension, New Words, mining, and colour fields;
- avoid frontend merge, split, reclassification, lookup repair, or semantic fallback;
- show neutral readable text when authoritative analysis is unavailable.

### Exact-occurrence behavior

After a Teaching record is saved, an optional linked operational correction may update only the exact current sentence occurrence. This improves the reading session but does not create a global rule.

The frontend should distinguish:

```text
Saved for this occurrence
Captured for future tuning
Approved for export
```

These are separate states.

### Freshness and failure handling

Preview must carry a server-issued token bound to the sentence, analyzer snapshot, candidate set, dictionary revision, correction revision, assertion, and schema versions. Save must show a clear stale-preview message and require Preview again when any dependency changes.

Structured error states should include:

```text
stale preview
target candidate absent
dictionary revision changed
range overlap or containment
source mismatch
identity unresolved
post-target validation failed
persistence or reconciliation failure
```

History or integrity-loading failure must be visible; the panel must not silently omit unavailable corpus history.

### Current experimental UI caveat

The Phase 8.6 result for reader-taught Vocabulary `響き渡る` showed structural completion but semantic `unresolved`. The frontend correctly displayed the backend output, but the current wording can imply full success. Future UI must separate:

```text
Structural validation
Classification validation
Identity validation
Policy validation
Overall review status
```

Until Phase 8 Alpha contracts are complete, current Teaching records remain test-only and excluded from export.

### Frontend responsibilities by Phase 8 Alpha stage

#### Alpha 1–4

- No new production data capture.
- Support schema fixtures and contract tests where required.
- Preserve current exact-selection, Preview, Save, Undo, and history behavior as an experimental shell.

#### Alpha 5–7

- Consume authoritative taught-range analysis and comparison responses.
- Never derive missing analyzer semantics locally.
- Display target-candidate presence and failure classification.

#### Alpha 8

- Add the tick action for accepted-current.
- Separate boundary and classification controls.
- Add reject-candidate/classification actions.
- Add judgment type and revised confidence controls.
- Display concise analyzer choice, alternatives, target, and diagnosis.

#### Alpha 9–10

- Enforce Preview token freshness.
- Display operation IDs and structured errors.
- Add review/approval/export states and corpus-balance summaries.

### Frontend acceptance criteria

The Phase 8 Alpha frontend is complete only when:

- exact reviewed ranges can be accepted, corrected, rejected, or skipped;
- `✓ Analyzer is correct` creates a positive partial label;
- correction controls separate boundary from classification;
- the panel displays analyzer-selected versus reader-approved structure;
- the panel indicates whether the target candidate existed;
- unreviewed sentence ranges remain explicitly ignored;
- the Reader target is delivered in normal analyzer `readerSpans` format;
- stale Preview is rejected by the backend and explained clearly;
- operational correction, corpus capture, review approval, and export eligibility are visibly distinct;
- no frontend behavior creates a global linguistic rule.

