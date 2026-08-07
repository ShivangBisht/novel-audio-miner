# Phase 12B.4 Bounded Reader Session Cache

Phase 12B.4 makes JP Analyzer sentence results memory-only and bounded to 50 entries per Reader session. The current sentence, immediate previous sentence, next ten planned sentences, and active or queued foreground identities are protected from eviction.

When the limit is exceeded, the least recently accessed unprotected result is removed first. Accessing a cached result refreshes its recency. Reader close, book replacement, correction mutation, or manual analyzer-cache clearing empties the session cache and queue.

Legacy `jp-analyzer-reader-cache-v3:` localStorage records are removed. No new sentence analysis is written to localStorage. Anki known words, manual known words, frequency data, progress, settings, corrections, Teaching, dictionaries, and mining state use separate storage and remain unchanged.
