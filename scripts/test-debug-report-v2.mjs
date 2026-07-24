import assert from 'node:assert/strict';
import { buildDebugReportV2, buildDiagnosticSummaryV2, DEBUG_REPORT_SCHEMA_VERSION } from '../src/lib/debugReportV2.js';

const span = { start: 0, end: 2, surface: '返事', displayRole: 'lexical', knownLookupKey: '返事', frequencyLookupKey: '返事', countsForComprehension: true, showInNewWords: true, eligibleForMining: true };
const report = buildDebugReportV2({
  application: { name: 'Novel Audio Miner', version: '4.1.0' },
  book: { id: 'b', title: 'Book', chapters: [{}], toc: [{}], debug: { totalItems: 5, sentenceCount: 4, imageCount: 1, pageList: [{ href: 'a' }] } },
  reader: { sceneIndex: 0, sceneNumber: 1, totalScenes: 5 },
  scene: { plainText: '返事。', htmlText: '返事。', parserDebug: { pageHref: 'a' } },
  analyzerShadow: { status: 'ready', source: 'memory-cache', elapsedMs: 0, cacheIdentity: 'id', cacheReason: 'hit', analyzerVersion: '11.9.0', readerSpanSchemaVersion: '1.1', correctionRevision: 'rev', prefetchStatus: 'complete', prefetchTargetCount: 2, prefetchCompletedCount: 2, prefetchFailedCount: 0 },
  analyzerReader: { valid: true, errors: [], words: [span], schemaVersion: '1.1', summary: { lexical: 1 } },
  analyzerResult: { analyzerVersion: '11.9.0', readerSpanSchemaVersion: '1.1', correctionRevision: 'rev', readerSpans: [span, { start: 2, end: 3, surface: '。', displayRole: 'punctuation' }], readerSelection: { decisions: [] } },
  presentationSpans: [{ ...span, className: 'word-known' }],
  learning: { available: true, source: 'jp-analyzer', comprehension: { known: 1, total: 1, percent: 100 }, newWords: [] },
  selection: { raw: '返', readerContext: span, actionState: { canMine: true } },
  mining: { candidate: span, lookupIdentity: '返事', debug: { status: 'ready' } },
  prefetchTargets: [{ index: 1, text: '次。' }],
  includeFullParserInventory: false,
  now: new Date('2026-07-24T08:00:00Z')
});
assert.equal(report.report.schemaVersion, DEBUG_REPORT_SCHEMA_VERSION);
assert.ok(report.report.diagnosticId);
assert.equal(report.analyzer.readerSpans.length, 2);
assert.equal(report.analyzer.contract.valid, true);
assert.equal(report.cache.resultSource, 'memory-cache');
assert.equal(report.prefetch.completedCount, 2);
assert.equal(report.selection.readerContext.knownLookupKey, '返事');
assert.equal(report.mining.lookupIdentity, '返事');
assert.equal(report.epub.fullInventory, null);
assert.equal('debugPanels' in report, false);
assert.equal('tokens' in report, false);
const full = buildDebugReportV2({ book: { debug: { pageList: [1] } }, includeFullParserInventory: true });
assert.deepEqual(full.epub.fullInventory.pageList, [1]);
const summary = buildDiagnosticSummaryV2(report);
assert.match(summary, /contract=valid/);
assert.match(summary, /source=memory-cache/);
console.log('Debug Report v2 tests passed');
