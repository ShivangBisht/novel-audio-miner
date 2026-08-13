# Alpha Deprecation and Retirement Inventory

## Classification rules

- Keep: current authority or required safety behavior
- Migrate: active consumer must move to a canonical replacement
- Retire after proof: no active consumer after migration and tests
- Investigate: runtime use cannot be established statically

## Initial keep list

- authoritative `readerSpans`
- schema and correction revision fields
- coverage fallbacks that guarantee complete Reader projection
- KWJA fresh-process fallback
- compatibility Reader projections until consumer audit completes
- Teaching snapshots, decisions, corpus safety gates, and controlled activation
- dictionary migrations and registry
- startup ownership manifests and instance lock
- legacy cache-key cleanup required for existing installations

## Initial migrate list

- partial learning-model spans used for actionable New Words selection
- global Reader status shared across unrelated workflows
- known-word union count used as cache readiness
- direct newest-note enrichment orchestration inside `Reader.jsx`
- visual labels and tests that describe enrichment as application-owned mining
- interaction paths that return incompatible selection shapes

## Retirement evidence required

- import and dynamic-use search
- production caller migration
- test and documentation migration
- persisted-data migration, where applicable
- retirement regression test
- complete frontend and backend qualification
