import assert from 'node:assert/strict';
import { buildSanitizedAnalyzerObservability } from '../src/lib/analyzerObservability.js';

const privateText = '秘密の文章。';
const identity = '3.1:private-hash:version:schema:revision';
const snapshot = buildSanitizedAnalyzerObservability({
  scheduler: {
    active: { identity, text: privateText, kind: 'prefetch', priority: 2 },
    queued: [
      { identity: 'a', text: privateText, kind: 'foreground', priority: 0 },
      { identity: 'b', text: privateText, kind: 'prefetch', priority: 3 }
    ],
    activeCount: 1, queuedCount: 2, started: 8, completed: 6, failed: 1,
    promoted: 2, coalesced: 3, staleRemoved: 4
  },
  sessionCache: { size: 12, limit: 50, protectedCount: 11, evictionCount: 5, identities: [identity] },
  shadow: {
    source: 'memory-cache', elapsedMs: 1.4, cacheReason: 'leased-memory-cache-hit',
    cacheIdentity: identity, cacheKey: 'private-hash', result: { text: privateText },
    prefetchStatus: 'running', prefetchTargetCount: 11,
    prefetchCompletedCount: 7, prefetchFailedCount: 0
  },
  reader: { currentSceneIndex: 20, forwardTargetCount: 10, hasPreviousProtection: true }
});

assert.equal(snapshot.scheduler.activeKind, 'prefetch');
assert.equal(snapshot.scheduler.activePriority, 2);
assert.equal(snapshot.scheduler.queuedForegroundCount, 1);
assert.equal(snapshot.scheduler.queuedPrefetchCount, 1);
assert.equal(snapshot.scheduler.promotedCount, 2);
assert.equal(snapshot.scheduler.coalescedCount, 3);
assert.equal(snapshot.scheduler.staleRemovedCount, 4);
assert.deepEqual(snapshot.sessionCache, { size: 12, limit: 50, protectedCount: 11, evictionCount: 5 });
assert.equal(snapshot.prefetch.forwardTargetCount, 10);
assert.equal(snapshot.prefetch.hasPreviousProtection, true);
assert.equal(snapshot.visibleAnalysis.elapsedMs, 1);

const serialized = JSON.stringify(snapshot);
for (const forbidden of [privateText, identity, 'private-hash', 'cacheIdentity', 'cacheKey', 'identities', 'result', 'text']) {
  assert.equal(serialized.includes(forbidden), false, `forbidden observability content: ${forbidden}`);
}
console.log('sanitized analyzer observability tests passed');
