import { useEffect, useMemo, useRef, useState } from 'react';
import { analyzeSentence, getAnalyzerHealth } from './jpAnalyzerClient.js';
import { AnalyzerPriorityScheduler } from './analyzerPriorityScheduler.js';
import { AnalyzerSessionCache } from './analyzerSessionCache.js';
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

const memoryCache = new AnalyzerSessionCache();
const pendingRequests = new Map();
const analysisScheduler = new AnalyzerPriorityScheduler(analyzeSentence);
let planSequence = 0;
let cacheGeneration = 0;

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

function purgeLegacyAnalyzerStorage() {
  try {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(ANALYZER_CACHE_PREFIX)) keys.push(key);
    }
    keys.forEach(key => localStorage.removeItem(key));
  } catch {}
}
purgeLegacyAnalyzerStorage();

function requestAnalysis(identity, text, { priority = 0, kind = 'foreground', planId = null } = {}) {
  if (pendingRequests.has(identity)) {
    analysisScheduler.schedule({ identity, text, priority, kind, planId });
    return pendingRequests.get(identity);
  }
  const started = performance.now();
  const request = analysisScheduler.schedule({ identity, text, priority, kind, planId })
    .then(result => ({ result, elapsedMs: performance.now() - started }))
    .finally(() => pendingRequests.delete(identity));
  pendingRequests.set(identity, request);
  return request;
}

async function resolveSentence(text, metadata, scheduling = {}) {
  const requestedGeneration = cacheGeneration;
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


  if (scheduling.kind === 'foreground') {
    const snapshot = analysisScheduler.snapshot();
    memoryCache.setProtected([identity, ...snapshot.queued.map(target => target.identity), snapshot.active?.identity]);
  }
  const response = await requestAnalysis(identity, sourceText, scheduling);
  const responseMetadata = normalizeAnalyzerMetadata(response.result);
  if (createAnalyzerCacheIdentity(hash, responseMetadata) !== identity) {
    throw new Error('Analyzer metadata changed during analysis; result was not cached.');
  }

  if (requestedGeneration !== cacheGeneration) {
    throw new DOMException('Analyzer Reader session changed.', 'AbortError');
  }
  const record = createAnalyzerCacheRecord(
    response.result, hash, normalizedMetadata
  );
  const check = validateAnalyzerCacheRecord(
    record, sourceText, hash, normalizedMetadata
  );
  if (!check.valid) throw new Error(`Analyzer result is not cacheable: ${check.reason}`);
  memoryCache.set(identity, record);
  return { source: 'network', record, elapsedMs: response.elapsedMs, hash, identity };
}

export async function prefetchJpAnalyzerSentences(targets, metadata, onProgress, protectedIdentities = []) {
  const planId = `plan-${++planSequence}`;
  const normalized = [];
  const seen = new Set();
  for (const value of targets || []) {
    const target = typeof value === 'string' ? { text: value } : value;
    const text = String(target?.text ?? '').trim();
    if (!text || seen.has(text)) continue;
    seen.add(text); normalized.push({ ...target, text });
  }
  const prepared = await Promise.all(normalized.map(async target => {
    const hash = await textHash(target.text);
    return { ...target, identity: createAnalyzerCacheIdentity(hash, metadata) };
  }));
  const schedulerSnapshot = analysisScheduler.snapshot();
  memoryCache.setProtected([
    ...prepared.map(target => target.identity),
    ...protectedIdentities,
    schedulerSnapshot.active?.identity,
    ...schedulerSnapshot.queued.filter(target => target.kind === 'foreground').map(target => target.identity)
  ]);
  analysisScheduler.replaceSpeculativePlan(planId, prepared.map(target => target.identity).filter(Boolean));
  const summary = { targetCount: prepared.length, completedCount: 0, failedCount: 0, results: [] };
  await Promise.all(prepared.map(async target => {
    try {
      const result = await resolveSentence(target.text, metadata, { priority: target.queuePriority ?? 50, kind: 'prefetch', planId });
      summary.completedCount += 1; summary.results.push({ source: result.source, status: 'ready' });
    } catch (error) {
      if (error?.name !== 'AbortError') { summary.failedCount += 1; summary.results.push({ status: 'error', error: error?.message ?? String(error) }); }
    }
    onProgress?.({ ...summary, results: [...summary.results] });
  }));
  return summary;
}
export function clearJpAnalyzerShadowCache() {
  cacheGeneration += 1;
  analysisScheduler.clear();
  pendingRequests.clear();
  memoryCache.clear();
  clearAnalyzerMetadataLease();
  purgeLegacyAnalyzerStorage();
}

export function getJpAnalyzerShadowCacheSize() { return memoryCache.size; }
export function getAnalyzerSchedulerSnapshot() { return analysisScheduler.snapshot(); }
export function getAnalyzerSessionCacheSnapshot() { return memoryCache.snapshot(); }

export function useJpAnalyzerShadow(text, { enabled = true, prefetchTargets = [], refreshKey = 0 } = {}) {
  const sourceText = String(text ?? '');
  const generation = useRef(0);
  const [state, setState] = useState(initial);
  const stablePrefetchTargets = useMemo(
    () => (prefetchTargets || []).map(target => ({ ...target, text: String(target?.text ?? '').trim() })).filter(target => target.text),
    [JSON.stringify(prefetchTargets || [])]
  );
  const prefetchSignature = JSON.stringify(stablePrefetchTargets.map(target => [target.index, target.queuePriority, target.text]));

  useEffect(() => {
    generation.current += 1;
    const runId = generation.current;
    if (!enabled || !sourceText.trim()) { setState(initial()); return; }
    let disposed = false;

    async function runPrefetch(metadata) {
      if (!stablePrefetchTargets.length) return;
      setState(previous => previous.status === 'ready'
        ? { ...previous, prefetchStatus: 'running' }
        : previous);
      const currentHash = await textHash(sourceText.trim());
      const currentIdentity = createAnalyzerCacheIdentity(currentHash, metadata);
      const summary = await prefetchJpAnalyzerSentences(
        stablePrefetchTargets,
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
        },
        [currentIdentity]
      );
      if (disposed || runId !== generation.current) return;
      if (summary.completedCount > 0) {
        // Successful cache resolution under this authoritative identity keeps
        // the immediate-navigation lease fresh after a long prefetch cycle.
        setAnalyzerMetadataLease(metadata);
      }
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
        prefetchStatus: stablePrefetchTargets.length ? 'queued' : 'idle',
        prefetchTargetCount: stablePrefetchTargets.length
      });
    }

    async function run() {
      const leasedMetadata = getAnalyzerMetadataLease();
      if (!leasedMetadata) {
        setState({ ...initial(), status: 'metadata', cacheReason: 'checking-authoritative-metadata' });
      }

      try {
        if (leasedMetadata) {
          const leasedForeground = await resolveSentence(sourceText, leasedMetadata, { priority: 0, kind: 'foreground' });
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
          const foreground = await resolveSentence(sourceText, metadata, { priority: 0, kind: 'foreground' });
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
  }, [sourceText, enabled, prefetchSignature, refreshKey]);

  return state;
}
