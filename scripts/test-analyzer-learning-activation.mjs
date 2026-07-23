import assert from 'node:assert/strict';
import { resolveLearningOwnership } from '../src/lib/analyzerLearningModel.js';

const analyzerModel = {
  available: true,
  comprehension: { known: 1, unknown: 1, total: 2, percent: 50 },
  newWords: [
    { key: '走る', surface: '走った', frequency: { category: 'common' } }
  ]
};

const analyzer = resolveLearningOwnership({
  requestedSource: 'jp-analyzer',
  analyzerValid: true,
  analyzerModel,
  legacyComprehension: { known: 9, total: 10, percent: 90 },
  legacyNewWords: [{ word: 'legacy' }]
});
assert.equal(analyzer.source, 'jp-analyzer');
assert.equal(analyzer.available, true);
assert.equal(analyzer.comprehension.percent, 50);
assert.equal(analyzer.newWords[0].word, '走る');
assert.equal(analyzer.newWords[0].surface, '走った');

const plainText = resolveLearningOwnership({
  requestedSource: 'plain-text', analyzerValid: true, analyzerModel
});
assert.equal(plainText.source, 'jp-analyzer');
assert.equal(plainText.comprehension.percent, 50);

const unavailable = resolveLearningOwnership({
  requestedSource: 'jp-analyzer', analyzerValid: false, analyzerModel: null,
  legacyComprehension: { percent: 90 }, legacyNewWords: [{ word: 'legacy' }]
});
assert.equal(unavailable.available, false);
assert.equal(unavailable.comprehension, null);
assert.deepEqual(unavailable.newWords, []);

const legacy = resolveLearningOwnership({
  requestedSource: 'legacy-kuromoji', analyzerValid: false, analyzerModel: null,
  legacyComprehension: { known: 9, total: 10, percent: 90 },
  legacyNewWords: [{ word: 'legacy', surface: 'legacy' }]
});
assert.equal(legacy.source, 'legacy-kuromoji');
assert.equal(legacy.comprehension.percent, 90);
assert.equal(legacy.newWords[0].word, 'legacy');

console.log('analyzer learning activation tests passed');
