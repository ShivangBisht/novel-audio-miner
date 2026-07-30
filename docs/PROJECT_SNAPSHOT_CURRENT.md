# Project Snapshot

<!-- PHASE7_FINAL_BEGIN -->
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

