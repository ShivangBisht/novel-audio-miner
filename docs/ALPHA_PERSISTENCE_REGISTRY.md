# Alpha Persistence Registry

## Frontend

- Reader progress: local storage, owned by Reader storage module
- Reader appearance and mode: local storage, owned by Reader settings state
- Analyzer cache: browser storage/session ownership, correction and schema aware
- Anki-known cache: frontend known-word service
- Manual-known store: frontend known-word service
- Integration configuration: local storage, owned by settings/integration layer

## Backend

- Analysis dictionary: `phase8_analysis_lexicon.sqlite3`, owned by dictionary
  store and registry
- Reader corrections: `reader_corrections.sqlite3`, owned by correction store
- Teaching annotations: `teaching_annotations.sqlite3`, owned by annotation store
- Teaching decisions and snapshots: `teaching_decisions.sqlite3`, owned by
  Teaching decision store
- Teaching quality: owned by Teaching quality store
- Startup local configuration: versioned JSON configuration
- Startup process ownership: versioned ownership manifest and instance lock

## Alpha 8 requirements

Each store must expose or document schema version, migration path, backup and
rollback, atomicity, corruption handling, health state, test isolation, and
retirement rules for prior keys or columns.
