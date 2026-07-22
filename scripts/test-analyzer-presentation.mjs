import assert from 'node:assert/strict';
import { resolveAnalyzerPresentationClass } from '../src/lib/analyzerPresentationPolicy.js';

const base = { analysisSource: 'jp-analyzer-reader-spans', start: 0, end: 1, surface: '語' };
const classify = (span, known = new Set(), frequencies = {}) =>
  resolveAnalyzerPresentationClass({ ...base, ...span }, {
    isKnown: key => known.has(key),
    getFrequencyCategory: key => frequencies[key] ?? null
  });

assert.equal(classify({ displayRole: 'function' }), 'word-function');
assert.equal(classify({ displayRole: 'learnable-grammar' }), 'word-grammar');
assert.notEqual(classify({ displayRole: 'function' }), classify({ displayRole: 'learnable-grammar' }));
assert.equal(classify({ displayRole: 'name' }), 'word-name');
assert.equal(classify({ displayRole: 'punctuation' }), 'word-neutral');
assert.equal(classify({ displayRole: 'unresolved' }), 'word-unresolved');
assert.equal(classify({ displayRole: 'lexical', knownLookupKey: '語', frequencyLookupKey: '語' }, new Set(['語'])), 'word-known');
assert.equal(classify({ displayRole: 'lexical-compound', knownLookupKey: '複合語', frequencyLookupKey: '複合語' }, new Set(), { 複合語: 'rare' }), 'word-unknown word-freq-rare');
assert.equal(classify({ displayRole: 'lexical', knownLookupKey: null, frequencyLookupKey: null }), 'word-unknown word-freq-unlisted');
assert.equal(resolveAnalyzerPresentationClass({ ...base, analysisSource: 'legacy', displayRole: 'function' }), '');
const original = { ...base, displayRole: 'learnable-grammar', grammarId: 'TE_KURU', sourceSpanIds: ['reader-generated-1'] };
const snapshot = JSON.stringify(original);
resolveAnalyzerPresentationClass(original);
assert.equal(JSON.stringify(original), snapshot);
console.log('analyzer presentation policy tests passed');
