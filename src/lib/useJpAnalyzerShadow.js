import { useEffect, useRef, useState } from 'react';
import { analyzeSentence } from './jpAnalyzerClient.js';

const CACHE_PREFIX = 'jp-analyzer-reader-spans-v2:';
const MAX_PERSISTED_ENTRIES = 100;

const memoryCache = new Map();
const pendingRequests = new Map();

function createInitialState() {
  return {
    status: 'idle',
    source: null,
    result: null,
    error: null,
    elapsedMs: null,
    cacheKey: null
  };
}

async function createTextHash(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest(
    'SHA-256',
    bytes
  );

  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

function getStorageKey(hash) {
  return `${CACHE_PREFIX}${hash}`;
}

function createCacheRecord(result) {
  return {
    savedAt: new Date().toISOString(),
    schemaVersion: result.schemaVersion ?? null,
    analyzerVersion: result.analyzerVersion ?? null,
    engineVersion: result.engineVersion ?? null,
    text: result.text,
    readerSpanSchemaVersion:
      result.readerSpanSchemaVersion ?? null,
    readerCandidateSchemaVersion:
      result.readerCandidateSchemaVersion ?? null,
    readerSpans: result.readerSpans ?? [],
    readerSelection: result.readerSelection ?? null,
    appliedReaderCorrections:
      result.appliedReaderCorrections ?? [],
    resolvedSpans: result.resolvedSpans ?? [],
    coverage: result.coverage ?? null,
    diagnostics: result.diagnostics ?? []
  };
}

function readPersistedResult(hash, expectedText) {
  try {
    const raw = localStorage.getItem(getStorageKey(hash));

    if (!raw) {
      return null;
    }

    const record = JSON.parse(raw);

    if (
      !record ||
      record.text !== expectedText ||
      !Array.isArray(record.readerSpans) ||
      !Array.isArray(record.resolvedSpans)
    ) {
      localStorage.removeItem(getStorageKey(hash));
      return null;
    }

    return record;
  } catch {
    return null;
  }
}

function persistResult(hash, result) {
  try {
    const record = createCacheRecord(result);

    localStorage.setItem(
      getStorageKey(hash),
      JSON.stringify(record)
    );

    enforceStorageLimit();
  } catch {
    // Cache failure must never affect normal reading.
  }
}

function enforceStorageLimit() {
  try {
    const entries = [];

    for (
      let index = 0;
      index < localStorage.length;
      index += 1
    ) {
      const key = localStorage.key(index);

      if (!key?.startsWith(CACHE_PREFIX)) {
        continue;
      }

      let savedAt = '';

      try {
        const value = JSON.parse(
          localStorage.getItem(key)
        );

        savedAt = value?.savedAt ?? '';
      } catch {
        // Invalid entries are the oldest and will be removed.
      }

      entries.push({
        key,
        savedAt
      });
    }

    entries
      .sort((left, right) =>
        String(right.savedAt).localeCompare(
          String(left.savedAt)
        )
      )
      .slice(MAX_PERSISTED_ENTRIES)
      .forEach((entry) => {
        localStorage.removeItem(entry.key);
      });
  } catch {
    // Cache maintenance is best effort only.
  }
}

function getPendingRequest(hash, text) {
  const existing = pendingRequests.get(hash);

  if (existing) {
    return existing;
  }

  const startedAt = performance.now();

  const request = analyzeSentence(text)
    .then((result) => ({
      result,
      elapsedMs: Math.round(
        performance.now() - startedAt
      )
    }))
    .finally(() => {
      pendingRequests.delete(hash);
    });

  pendingRequests.set(hash, request);
  return request;
}

export function clearJpAnalyzerShadowCache() {
  memoryCache.clear();

  try {
    const keys = [];

    for (
      let index = 0;
      index < localStorage.length;
      index += 1
    ) {
      const key = localStorage.key(index);

      if (key?.startsWith(CACHE_PREFIX)) {
        keys.push(key);
      }
    }

    keys.forEach((key) => {
      localStorage.removeItem(key);
    });
  } catch {
    // Cache clearing is best effort only.
  }
}

export function getJpAnalyzerShadowCacheSize() {
  return memoryCache.size;
}

/**
 * Automatically analyzes one active sentence.
 *
 * This hook is shadow-only:
 * its result must not be used for visible reader behaviour yet.
 */
export function useJpAnalyzerShadow(
  text,
  {
    enabled = true
  } = {}
) {
  const sourceText = String(text ?? '');
  const requestGenerationRef = useRef(0);
  const [state, setState] = useState(createInitialState);

  useEffect(() => {
    requestGenerationRef.current += 1;
    const generation = requestGenerationRef.current;

    if (!enabled || !sourceText.trim()) {
      setState(createInitialState());
      return undefined;
    }

    let disposed = false;

    async function run() {
      setState({
        status: 'hashing',
        source: null,
        result: null,
        error: null,
        elapsedMs: null,
        cacheKey: null
      });

      try {
        const hash = await createTextHash(sourceText);

        if (
          disposed ||
          generation !== requestGenerationRef.current
        ) {
          return;
        }

        const memoryResult = memoryCache.get(hash);

        if (memoryResult?.text === sourceText) {
          setState({
            status: 'ready',
            source: 'memory-cache',
            result: memoryResult,
            error: null,
            elapsedMs: 0,
            cacheKey: hash
          });

          return;
        }

        const persistedResult = readPersistedResult(
          hash,
          sourceText
        );

        if (persistedResult) {
          memoryCache.set(hash, persistedResult);

          setState({
            status: 'ready',
            source: 'persistent-cache',
            result: persistedResult,
            error: null,
            elapsedMs: 0,
            cacheKey: hash
          });

          return;
        }

        setState({
          status: 'analyzing',
          source: 'network',
          result: null,
          error: null,
          elapsedMs: null,
          cacheKey: hash
        });

        const response = await getPendingRequest(
          hash,
          sourceText
        );

        if (
          disposed ||
          generation !== requestGenerationRef.current
        ) {
          return;
        }

        memoryCache.set(hash, response.result);
        persistResult(hash, response.result);

        setState({
          status: 'ready',
          source: 'network',
          result: response.result,
          error: null,
          elapsedMs: response.elapsedMs,
          cacheKey: hash
        });
      } catch (error) {
        if (
          disposed ||
          generation !== requestGenerationRef.current
        ) {
          return;
        }

        setState({
          status: 'error',
          source: 'network',
          result: null,
          error,
          elapsedMs: null,
          cacheKey: null
        });
      }
    }

    run();

    return () => {
      disposed = true;
    };
  }, [sourceText, enabled]);

  return state;
}