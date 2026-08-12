import assert from 'node:assert/strict';
import fs from 'node:fs';

const hook=fs.readFileSync('src/lib/useJpAnalyzerShadow.js','utf8');
const cache=fs.readFileSync('src/lib/analyzerCacheIdentity.js','utf8');
const scheduler=fs.readFileSync('src/lib/analyzerPriorityScheduler.js','utf8');
const reader=fs.readFileSync('src/components/Reader.jsx','utf8');
const teaching=fs.readFileSync('src/components/TeachingPanel.jsx','utf8');
const decision=fs.readFileSync('src/components/TeachingDecisionPanel.jsx','utf8');

for(const token of [
 'export async function analyzeJpAnalyzerSentenceOnDemand(',
 'const sourceText = String(text ?? \'\').trim();',
 'metadata = getAnalyzerMetadataLease();',
 'const health = await getAnalyzerHealth();',
 'metadata = normalizeAnalyzerMetadata(health);',
 'setAnalyzerMetadataLease(metadata);',
 'const resolved = await resolveSentence(sourceText, metadata, {',
 "kind: 'foreground'",
 'return resolved.record;'
]){
 assert.equal(hook.includes(token),true,`Missing sentence-local analysis contract: ${token}`);
}

const exported=hook.slice(hook.indexOf('export async function analyzeJpAnalyzerSentenceOnDemand('));
const end=exported.indexOf('export async function prefetchJpAnalyzerSentences(');
const body=exported.slice(0,end);
assert.equal(body.includes('prefetchJpAnalyzerSentences('),false);
assert.equal(body.includes('createAnalyzerCacheRecord('),false);
assert.equal(body.includes('adaptReaderSpansForRendering('),false);
assert.equal(body.includes('readerSpans:'),false);
assert.equal(body.includes('readerCandidates:'),false);
assert.equal(body.includes('readerSelection:'),false);

assert.match(cache,/createAnalyzerCacheIdentity\(sentenceHash, metadata\)/);
assert.match(cache,/createAnalyzerCacheRecord\(result, sentenceHash, metadata/);
assert.match(cache,/validateAnalyzerCacheRecord\(record, expectedText, sentenceHash, metadata\)/);
assert.match(scheduler,/kind = 'foreground'/);

// Step 4 must not alter or bypass the formalized consumers.
assert.match(reader,/useJpAnalyzerShadow\(/);
assert.match(reader,/resolveTeachingSelection\(/);
assert.match(teaching,/previewReaderCorrection/);
assert.match(teaching,/saveReaderCorrection/);
assert.match(decision,/Save Teaching evidence/);

console.log('Phase 14.5A step 4 sentence-local analyzer ownership tests passed');
