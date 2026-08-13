# Alpha Route and Contract Registry

## Frontend-owned external contracts

- AnkiConnect: note search, note information, media storage, field update, GUI
  browse, and configured model fields
- Nadeshiko: enrichment lookup through the existing session-token workflow
- Browser file APIs: EPUB upload and local media handling

## JP Analyzer contract families

- analyzer health, metadata, and sentence analysis
- Reader candidates and authoritative Reader spans
- Reader corrections, preview, activation, history, and revision
- dictionary status, registry, staging, installation, replacement, and removal
- Teaching snapshots, decisions, guided review, quality, corpus export,
  governance, portability, offline evaluation, tuning corpus, tuning handoff,
  and controlled activation
- startup status and diagnostics

## Alpha 7 requirements

For every concrete route, Alpha 7 must record:

- method and path
- owning backend module
- request model and schema version
- response model and schema version
- frontend client and consumers
- null and unavailable semantics
- persistence and mutation owner
- correction, dictionary, or analyzer identity requirements
- compatibility aliases
- tests and deprecation plan
