# Alpha 8 Persistence and Migration Hardening

Alpha 8 registers browser, memory, IndexedDB, SQLite, dictionary, and startup persistence ownership. Reader progress now uses a versioned envelope with backup-before-write migration, read-back validation, migration receipts, and rollback metadata. Read-only health distinguishes absent, current, migratable, corrupt, incompatible, recovery-required, and externally owned stores.

Backend SQLite, dictionary, Teaching, and startup stores remain unchanged and are classified as backend-owned, read-only from the frontend. Qualification does not mutate authoritative runtime stores. Alpha 7 contracts and Alpha 1-7 behavior remain unchanged.
