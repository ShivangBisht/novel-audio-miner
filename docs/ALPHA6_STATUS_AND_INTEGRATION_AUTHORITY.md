# Alpha 6 Status, Errors, and Integration Authority

Alpha 6 replaces the shared Reader status object with independent selection, known-word, enrichment, Teaching, correction, analyzer, dictionary, AnkiConnect, and startup status domains. Each status records domain, phase, severity, message, timestamp, operation identity, recovery metadata, details, and owner.

Updates are immutable and domain-local, so one integration cannot erase another integration's state. Presentation priority selects the most actionable statuses without discarding lower-priority states. Alpha 5 pinned enrichment details remain intact and Debug Report v2 includes the complete domain snapshot.

Dictionary Management, Teaching panels, and application startup retain their existing internal ownership and persistence contracts. JP Analyzer schemas, EPUB, contextual scenes, known-word semantics, enrichment target ownership, dictionary mutations, prefetch, startup supervision, and Yomitan independence are unchanged.
