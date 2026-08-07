import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = relative => readFileSync(resolve(root, relative), 'utf8');
const required = [
  'docs/PHASE12_B1_ROLLING_PREFETCH.md',
  'docs/PHASE12_B2_PRIORITY_SCHEDULER.md',
  'docs/PHASE12_B3_READER_INTEGRATION.md',
  'docs/PHASE12_B4_BOUNDED_SESSION_CACHE.md',
  'docs/PHASE12_B5_SANITIZED_OBSERVABILITY.md',
  'docs/PHASE12_B6_END_TO_END_QUALIFICATION.md',
  'docs/PHASE12_B_COMPLETE.md'
];
required.forEach(relative => assert.equal(existsSync(resolve(root, relative)), true, `missing ${relative}`));

const planner = read('src/lib/scenePrefetch.js');
assert.match(planner, /DEFAULT_FORWARD_LIMIT = 10/);
assert.match(planner, /HIGH_PRIORITY_FORWARD_COUNT = 5/);
assert.match(planner, /previous-protection/);

const scheduler = read('src/lib/analyzerPriorityScheduler.js');
assert.match(scheduler, /if \(this\.active \|\| !this\.queue\.length\) return/);
assert.match(scheduler, /promoted/);
assert.match(scheduler, /coalesced/);
assert.match(scheduler, /staleRemoved/);

const cache = read('src/lib/analyzerSessionCache.js');
assert.match(cache, /MAX_ANALYZER_SESSION_CACHE_ENTRIES = 50/);
assert.match(cache, /protectedIdentities/);
assert.match(cache, /evictionCount/);

const shadow = read('src/lib/useJpAnalyzerShadow.js');
for (const retired of ['MAX_PERSISTED_ENTRIES', 'readStored(', 'trimStorage(', 'persist(']) {
  assert.equal(shadow.includes(retired), false, `persistent analyzer cache remains: ${retired}`);
}
assert.match(shadow, /purgeLegacyAnalyzerStorage/);
assert.match(shadow, /cacheGeneration/);

const observability = read('src/lib/analyzerObservability.js');
for (const forbiddenOutput of ['cacheIdentity:', 'cacheKey:', 'identities:', 'readerSpans:', 'result:', 'text:']) {
  assert.equal(observability.includes(forbiddenOutput), false, `unsafe observability output: ${forbiddenOutput}`);
}
assert.match(observability, /queuedForegroundCount/);
assert.match(observability, /sessionCache/);
assert.match(observability, /forwardTargetCount/);

const packageJson = JSON.parse(read('package.json'));
for (const command of ['test:phase12b5', 'test:phase12b', 'validate:phase12b']) {
  assert.equal(typeof packageJson.scripts?.[command], 'string', `missing command ${command}`);
}
console.log('Phase 12B structural closeout validation passed');
