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

