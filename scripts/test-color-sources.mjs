import assert from 'node:assert/strict';
import {
  COLOR_SOURCES,
  DEFAULT_COLOR_SOURCE,
  normalizeColorSource,
  resolveVisibleColourSource
} from '../src/lib/colorSource.js';

const analyzerWords = [{ surface: '走ってきた', start: 3, end: 8 }];
const legacyWords = [{ surface: '走っ' }, { surface: 'てきた' }];

assert.equal(DEFAULT_COLOR_SOURCE, COLOR_SOURCES.LEGACY_KUROMOJI);
assert.equal(normalizeColorSource('bad-value'), COLOR_SOURCES.LEGACY_KUROMOJI);

const analyzer = resolveVisibleColourSource({
  requestedSource: COLOR_SOURCES.JP_ANALYZER,
  analyzerReady: true,
  analyzerWords,
  legacyWords
});
assert.equal(analyzer.activeSource, COLOR_SOURCES.JP_ANALYZER);
assert.equal(analyzer.words, analyzerWords);
assert.equal(analyzer.neutralFallback, false);

const analyzerFailure = resolveVisibleColourSource({
  requestedSource: COLOR_SOURCES.JP_ANALYZER,
  analyzerReady: false,
  analyzerWords: [],
  legacyWords
});
assert.equal(analyzerFailure.activeSource, COLOR_SOURCES.PLAIN_TEXT);
assert.deepEqual(analyzerFailure.words, []);
assert.equal(analyzerFailure.neutralFallback, true);
assert.notEqual(analyzerFailure.words, legacyWords);

const legacy = resolveVisibleColourSource({
  requestedSource: COLOR_SOURCES.LEGACY_KUROMOJI,
  analyzerReady: false,
  analyzerWords: [],
  legacyWords
});
assert.equal(legacy.activeSource, COLOR_SOURCES.LEGACY_KUROMOJI);
assert.equal(legacy.words, legacyWords);

const plain = resolveVisibleColourSource({
  requestedSource: COLOR_SOURCES.PLAIN_TEXT,
  analyzerReady: true,
  analyzerWords,
  legacyWords
});
assert.equal(plain.activeSource, COLOR_SOURCES.PLAIN_TEXT);
assert.deepEqual(plain.words, []);
assert.equal(plain.neutralFallback, false);

console.log('explicit colour-source policy tests passed');
