# Alpha Stabilization Program

## Status

Phase 15 is paused after Phase 15.4. Alpha stabilization begins from the clean,
audited frontend and backend baselines recorded in `ALPHA_BASELINE_MANIFEST.json`.
Phase 15.5 through Phase 15.10 resume only after Alpha closeout.

## Responsibility model

- Yomitan is a standalone browser extension. It creates the Kiku note with the
  expression, source sentence, and dictionary meaning. It has no application
  integration contract.
- Novel Audio Miner reads EPUB content and enriches the newest Kiku note through
  AnkiConnect with novel context, Nadeshiko or VOICEVOX audio, images, and book
  metadata.
- JP Analyzer owns linguistic analysis, authoritative Reader spans, boundaries,
  roles, lookup identities, comprehension membership, New Words membership,
  action recommendation metadata, corrections, and Teaching evidence.
- UI components display authoritative domain facts. They must not reconstruct,
  infer, or silently default missing authority fields.

## Program milestones

### Alpha 1: Baselines, rollback, and audit closeout

Freeze both clean repositories, archive audit identities, define domain owners,
register routes and persistence, record deprecation candidates, and preserve the
Alpha, Phase 15, and Phase 16 roadmaps.

### Alpha 2: Canonical Reader interaction truth

Create one canonical word-level interaction identity derived from the current
authoritative `readerSpans`. Resolve text, keyboard, and New Words entry paths to
that identity. Eliminate actionable use of partial learning projections.

### Alpha 3: Selection interaction and usability

Add click, tap, and keyboard span selection, persistent highlighting, Escape to
clear, and accessible focus. Keep native drag for copying and Teaching ranges.

### Alpha 4: Known-word authority and cache stabilization

Separate Anki-derived and manual-known ownership, cache readiness, completeness,
refresh time, partial failures, and union display. Make mutations consume an
explicit canonical interaction identity.

### Alpha 5: Latest-Kiku-note enrichment stabilization

Extract enrichment from `Reader.jsx`. Load the newest Kiku note once, preview its
identity and expression, warn on target mismatch, pin the note ID for the entire
operation, then enrich it with novel context and media. Yomitan remains entirely
standalone.

### Alpha 6: Status, errors, and integration authority

Replace shared Reader status with domain-scoped selection, known-word,
enrichment, Teaching, correction, analyzer, dictionary, AnkiConnect, and startup
operation states.

### Alpha 7: Frontend/backend contract consolidation

Register and version every request and response, verify frontend clients against
backend routes, prevent compatibility projections from becoming production
authority, and fail tests on schema drift.

### Alpha 8: Persistence and migration hardening

Version, migrate, back up, validate, and report health for backend SQLite stores,
frontend local storage, analyzer caches, and startup manifests.

### Alpha 9: Legacy and unwanted code retirement

Remove only consumer-verified dead UI, obsolete CSS, retired storage keys,
duplicate helpers, temporary wrappers, unused compatibility exports, obsolete
endpoint aliases, and tests that preserve retired text instead of behavior.

### Alpha 10: Full-system qualification and closeout

Run complete frontend and backend suites, cross-project contract tests,
migration qualification, selection equivalence, known-word authority, latest
Kiku note enrichment qualification, snapshots, and matching Alpha tags.

## Global invariants

- `readerSpans` is the sole linguistic Reader truth.
- New Words is a view, not an authority.
- Known state is never inferred from color.
- Missing or partial cache state is not equivalent to unknown vocabulary.
- The newest Kiku note is discovered once and pinned before enrichment updates.
- Analyzer recommendation does not create or mine Anki notes.
- Yomitan remains external and independent.
- Teaching, correction, dictionary, corpus, and startup safety contracts remain
  active until verified replacements exist.
- Compatibility and fallback code is removed only after consumer and migration
  evidence proves retirement is safe.
