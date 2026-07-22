import { useEffect, useMemo, useRef, useState } from 'react';
import { analyzeSentence, getAnalyzerHealth } from './jpAnalyzerClient.js';
import {
  ANALYZER_CACHE_PREFIX,
  createAnalyzerCacheIdentity,
  createAnalyzerCacheRecord,
  normalizeAnalyzerMetadata,
  validateAnalyzerCacheRecord
} from './analyzerCacheIdentity.js';
import {
  clearAnalyzerMetadataLease,
  getAnalyzerMetadataLease,
  setAnalyzerMetadataLease
} from './analyzerMetadataLease.js';

const MAX_PERSISTED_ENTRIES = 100;
const memoryCache = new Map();
const pendingRequests = new Map();
let backgroundQueue = Promise.resolve();

function initial() {
  return {
    status: 'idle', source: null, result: null, error: null, elapsedMs: null,
    cacheKey: null, cacheIdentity: null, cacheReason: null, correctionRevision: null,
    analyzerVersion: null, readerSpanSchemaVersion: null,
    inFlightRequestCount: pendingRequests.size,
    prefetchStatus: 'idle', prefetchTargetCount: 0,
    prefetchCompletedCount: 0, prefetchFailedCount: 0
  };
}

async function textHash(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map(value => value.toString(16).padStart(2, '0'))
    .join('');
}

function storageKey(identity) { return ANALYZER_CACHE_PREFIX + identity; }
function removeStored(identity) { try { localStorage.removeItem(storageKey(identity)); } catch {} }

function readStored(identity, text, hash, metadata) {
  try {
    const raw = localStorage.getItem(storageKey(identity));
    if (!raw) return null;
    const record = JSON.parse(raw);
    const check = validateAnalyzerCacheRecord(record, text, hash, metadata);
    if (!check.valid) { removeStored(identity); return null; }
    record.lastAccessedAt = new Date().toISOString();
    localStorage.setItem(storageKey(identity), JSON.stringify(record));
    return record;
  } catch {
    removeStored(identity);
    return null;
  }
}

function trimStorage() {
  try {
    const rows = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(ANALYZER_CACHE_PREFIX)) continue;
      try {
        const value = JSON.parse(localStorage.getItem(key));
        rows.push({ key, at: value?.lastAccessedAt || value?.savedAt || '' });
      } catch {
        rows.push({ key, at: '' });
      }
    }
    rows.sort((a, b) => String(b.at).localeCompare(String(a.at)))
      .slice(MAX_PERSISTED_ENTRIES)
      .forEach(row => localStorage.removeItem(row.key));
  } catch {}
}

function persist(record) {
  try {
    localStorage.setItem(storageKey(record.cacheIdentity), JSON.stringify(record));
    trimStorage();
  } catch {}
}

function requestAnalysis(identity, text) {
  if (pendingRequests.has(identity)) return pendingRequests.get(identity);
  const started = performance.now();
  const request = analyzeSentence(text)
    .then(result => ({ result, elapsedMs: Math.round(performance.now() - started) }))
    .finally(() => pendingRequests.delete(identity));
  pendingRequests.set(identity, request);
  return request;
}

async function resolveSentence(text, metadata) {
  const sourceText = String(text ?? '').trim();
  if (!sourceText) return { source: 'skipped', record: null, elapsedMs: 0, hash: null, identity: null };

  const normalizedMetadata = normalizeAnalyzerMetadata(metadata);
  if (!normalizedMetadata.valid) throw new Error('JP Analyzer health lacks cache identity metadata.');
  const hash = await textHash(sourceText);
  const identity = createAnalyzerCacheIdentity(hash, normalizedMetadata);
  if (!identity) throw new Error('Could not create analyzer cache identity.');

  const memoryRecord = memoryCache.get(identity);
  const memoryCheck = validateAnalyzerCacheRecord(
    memoryRecord, sourceText, hash, normalizedMetadata
  );
  if (memoryCheck.valid) {
    return { source: 'memory-cache', record: memoryRecord, elapsedMs: 0, hash, identity };
  }
  if (memoryRecord) memoryCache.delete(identity);

  const stored = readStored(identity, sourceText, hash, normalizedMetadata);
  if (stored) {
    memoryCache.set(identity, stored);
    return { source: 'persistent-cache', record: stored, elapsedMs: 0, hash, identity };
  }

  const response = await requestAnalysis(identity, sourceText);
  const responseMetadata = normalizeAnalyzerMetadata(response.result);
  if (createAnalyzerCacheIdentity(hash, responseMetadata) !== identity) {
    throw new Error('Analyzer metadata changed during analysis; result was not cached.');
  }

  const record = createAnalyzerCacheRecord(
    response.result, hash, normalizedMetadata
  );
  const check = validateAnalyzerCacheRecord(
    record, sourceText, hash, normalizedMetadata
  );
  if (!check.valid) throw new Error(`Analyzer result is not cacheable: ${check.reason}`);
  memoryCache.set(identity, record);
  persist(record);
  return { source: 'network', record, elapsedMs: response.elapsedMs, hash, identity };
}

function enqueueBackground(task) {
  const result = backgroundQueue.then(task, task);
  backgroundQueue = result.catch(() => {});
  return result;
}

export async function prefetchJpAnalyzerSentences(texts, metadata, onProgress) {
  const uniqueTexts = [...new Set((texts || []).map(value => String(value ?? '').trim()).filter(Boolean))];
  const summary = { targetCount: uniqueTexts.length, completedCount: 0, failedCount: 0, results: [] };

  for (const text of uniqueTexts) {
    await enqueueBackground(async () => {
      try {
        const result = await resolveSentence(text, metadata);
        summary.completedCount += 1;
        summary.results.push({ text, source: result.source, status: 'ready' });
      } catch (error) {
        summary.failedCount += 1;
        summary.results.push({ text, status: 'error', error: error?.message ?? String(error) });
      }
      onProgress?.({ ...summary, results: [...summary.results] });
    });
  }
  return summary;
}

export function clearJpAnalyzerShadowCache() {
  memoryCache.clear();
  clearAnalyzerMetadataLease();
  try {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(ANALYZER_CACHE_PREFIX)) keys.push(key);
    }
    keys.forEach(key => localStorage.removeItem(key));
  } catch {}
}

export function getJpAnalyzerShadowCacheSize() { return memoryCache.size; }

export function useJpAnalyzerShadow(text, { enabled = true, prefetchTexts = [] } = {}) {
  const sourceText = String(text ?? '');
  const generation = useRef(0);
  const [state, setState] = useState(initial);
  const stablePrefetchTexts = useMemo(
    () => [...new Set((prefetchTexts || []).map(value => String(value ?? '').trim()).filter(Boolean))],
    [JSON.stringify(prefetchTexts || [])]
  );
  const prefetchSignature = stablePrefetchTexts.join('\u0000');

  useEffect(() => {
    generation.current += 1;
    const runId = generation.current;
    if (!enabled || !sourceText.trim()) { setState(initial()); return; }
    let disposed = false;

    async function runPrefetch(metadata) {
      if (!stablePrefetchTexts.length) return;
      setState(previous => previous.status === 'ready'
        ? { ...previous, prefetchStatus: 'running' }
        : previous);
      const summary = await prefetchJpAnalyzerSentences(
        stablePrefetchTexts,
        metadata,
        progress => {
          if (disposed || runId !== generation.current) return;
          setState(previous => previous.status === 'ready' ? {
            ...previous,
            prefetchStatus: 'running',
            prefetchTargetCount: progress.targetCount,
            prefetchCompletedCount: progress.completedCount,
            prefetchFailedCount: progress.failedCount,
            inFlightRequestCount: pendingRequests.size
          } : previous);
        }
      );
      if (disposed || runId !== generation.current) return;
      setState(previous => previous.status === 'ready' ? {
        ...previous,
        prefetchStatus: summary.failedCount ? 'complete-with-errors' : 'complete',
        prefetchTargetCount: summary.targetCount,
        prefetchCompletedCount: summary.completedCount,
        prefetchFailedCount: summary.failedCount,
        inFlightRequestCount: pendingRequests.size
      } : previous);
    }

    function publishForeground(foreground, metadata, reasonPrefix = 'validated') {
      const common = {
        correctionRevision: metadata.correctionRevision,
        analyzerVersion: metadata.analyzerVersion,
        readerSpanSchemaVersion: metadata.readerSpanSchemaVersion
      };
      setState({
        ...initial(), ...common, status: 'ready', source: foreground.source,
        result: foreground.record, elapsedMs: foreground.elapsedMs,
        cacheKey: foreground.hash, cacheIdentity: foreground.identity,
        cacheReason: foreground.source === 'network'
          ? 'network-result-cached'
          : `${reasonPrefix}-${foreground.source}-hit`,
        inFlightRequestCount: pendingRequests.size,
        prefetchStatus: stablePrefetchTexts.length ? 'queued' : 'idle',
        prefetchTargetCount: stablePrefetchTexts.length
      });
    }

    async function run() {
      const leasedMetadata = getAnalyzerMetadataLease();
      if (!leasedMetadata) {
        setState({ ...initial(), status: 'metadata', cacheReason: 'checking-authoritative-metadata' });
      }

      try {
        if (leasedMetadata) {
          const leasedForeground = await resolveSentence(sourceText, leasedMetadata);
          if (disposed || runId !== generation.current) return;
          publishForeground(leasedForeground, leasedMetadata, 'leased');
        }

        const health = await getAnalyzerHealth();
        const metadata = normalizeAnalyzerMetadata(health);
        if (!metadata.valid) throw new Error('JP Analyzer health lacks cache identity metadata.');
        setAnalyzerMetadataLease(metadata);

        const leaseStillMatches = leasedMetadata &&
          leasedMetadata.analyzerVersion === metadata.analyzerVersion &&
          leasedMetadata.readerSpanSchemaVersion === metadata.readerSpanSchemaVersion &&
          leasedMetadata.correctionRevision === metadata.correctionRevision;

        if (!leaseStillMatches) {
          const foreground = await resolveSentence(sourceText, metadata);
          if (disposed || runId !== generation.current) return;
          publishForeground(foreground, metadata);
        }

        await runPrefetch(metadata);
      } catch (error) {
        clearAnalyzerMetadataLease();
        if (disposed || runId !== generation.current) return;
        setState(previous => {
          if (previous.status === 'ready') {
            return {
              ...previous,
              prefetchStatus: 'complete-with-errors',
              prefetchFailedCount: Math.max(1, previous.prefetchFailedCount),
              error
            };
          }
          return {
            ...initial(), status: 'error', source: 'network', error,
            cacheReason: 'metadata-or-analysis-failed'
          };
        });
      }
    }

    run();
    return () => { disposed = true; };
  }, [sourceText, enabled, prefetchSignature]);

  return state;
}
