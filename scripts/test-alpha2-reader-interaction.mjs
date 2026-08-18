import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createCanonicalReaderInteraction,
  createReaderSpanReference,
  resolveCanonicalReaderInteractionForOffsets,
  resolveCanonicalReaderInteractionFromReference,
  sameCanonicalReaderInteraction
} from '../src/lib/readerInteractionContext.js';
import { buildAnalyzerLearningModel, resolveLearningOwnership } from '../src/lib/analyzerLearningModel.js';

const span = {
  analysisSource: 'jp-analyzer-reader-spans', start: 2, end: 5, surface: '走った',
  displayRole: 'lexical', headword: '走る', knownLookupKey: '走る', frequencyLookupKey: '走る',
  countsForComprehension: true, showInNewWords: true, eligibleForMining: true,
  grammarId: null, hostLookupKey: null, correctionId: 'correction-1', correctionScope: 'occurrence',
  correctionAction: 'show-as-one-unit', projectionStatus: 'user-corrected', sourceLayer: 'reader-correction',
  sourceSpanIds: ['source-1'], grammarFocusRanges: []
};
const direct = resolveCanonicalReaderInteractionForOffsets([span], 3, 4, 'っ', { entryPoint: 'dom-selection' });
assert.equal(direct.valid, true);
assert.equal(direct.context.surface, '走った');
assert.equal(direct.context.eligibleForMining, true);
assert.equal(direct.context.knownLookupKey, '走る');
assert.equal(direct.context.schemaVersion, '1.0');
assert.ok(Object.isFrozen(direct.context));

const model = buildAnalyzerLearningModel([span], { isKnown: () => false, getFrequency: () => ({ category: 'common' }) });
const ownership = resolveLearningOwnership({ analyzerValid: true, analyzerModel: model });
assert.equal(ownership.newWords.length, 1);
assert.equal('analyzerSpan' in ownership.newWords[0], false);
assert.deepEqual(ownership.newWords[0].spanReference, createReaderSpanReference(span));
const fromNewWords = resolveCanonicalReaderInteractionFromReference([span], ownership.newWords[0].spanReference, { entryPoint: 'new-words' });
assert.equal(fromNewWords.valid, true);
assert.equal(sameCanonicalReaderInteraction(direct.context, fromNewWords.context), true);
assert.equal(fromNewWords.context.eligibleForMining, true);
assert.equal(fromNewWords.context.correctionId, 'correction-1');

const stale = resolveCanonicalReaderInteractionFromReference([{ ...span, surface: '走る' }], ownership.newWords[0].spanReference);
assert.equal(stale.valid, false);
assert.equal(stale.reason, 'stale-span-reference');
assert.equal(createCanonicalReaderInteraction({ ...span, analysisSource: 'other' }), null);

const reader = fs.readFileSync('src/components/Reader.jsx', 'utf8');
for (const token of [
  'resolveCanonicalReaderInteractionFromReference(',
  'function resolveNewWordInteraction(newWord)',
  'function handleMarkKnown(word, interaction = selectedReaderContext)',
  'function handleUndoKnown(word, interaction = selectedReaderContext)',
  'handleMarkKnownForNewWord(unknownWord)',
  'readerInteraction: selectedReaderContext'
]) assert.ok(reader.includes(token), `missing Reader Alpha 2 ownership: ${token}`);
assert.equal(reader.includes('const span = newWord.analyzerSpan;'), false);
assert.equal(reader.includes('handleMarkKnown(unknownWord.word)'), false);


const contextualText = '葬式の後、だった。\nうちの隣に住んでいる夫婦が──交通事故で亡くなった。';
const contextualSpans = [
  { ...span, start: 0, end: 2, surface: '葬式', headword: '葬式', knownLookupKey: '葬式', frequencyLookupKey: '葬式', correctionId: null },
  { ...span, start: 2, end: 3, surface: 'の', displayRole: 'function', headword: null, knownLookupKey: null, frequencyLookupKey: null, countsForComprehension: false, showInNewWords: false, eligibleForMining: false, correctionId: null },
  { ...span, start: 3, end: 4, surface: '後', headword: '後', knownLookupKey: '後', frequencyLookupKey: '後', correctionId: null },
  { ...span, start: 4, end: 9, surface: '、だった。', displayRole: 'function', headword: null, knownLookupKey: null, frequencyLookupKey: null, countsForComprehension: false, showInNewWords: false, eligibleForMining: false, correctionId: null },
  { ...span, start: 9, end: 10, surface: '\n', displayRole: 'punctuation', headword: null, knownLookupKey: null, frequencyLookupKey: null, countsForComprehension: false, showInNewWords: false, eligibleForMining: false, correctionId: null },
  { ...span, start: 10, end: 12, surface: 'うち', headword: 'うち', knownLookupKey: 'うち', frequencyLookupKey: 'うち', correctionId: null },
  { ...span, start: 12, end: contextualText.length, surface: contextualText.slice(12), displayRole: 'function', headword: null, knownLookupKey: null, frequencyLookupKey: null, countsForComprehension: false, showInNewWords: false, eligibleForMining: false, correctionId: null }
];
const contextualModel = buildAnalyzerLearningModel(contextualSpans, { isKnown: () => false, getFrequency: () => null });
assert.deepEqual(contextualModel.newWords.map(item => item.surface), ['葬式', '後', 'うち']);
const afterBreak = resolveCanonicalReaderInteractionForOffsets(contextualSpans, 10, 12, 'うち');
assert.equal(afterBreak.valid, true);
assert.equal(afterBreak.context.surface, 'うち');
assert.equal(contextualSpans.map(item => item.surface).join(''), contextualText);
assert.ok(reader.includes("if (node.tagName === 'BR')"));
assert.ok(reader.includes("text += '\\\\n';") || reader.includes("text += '\\n';"));
assert.ok(reader.includes("if (token.analysisSource === 'jp-analyzer-reader-spans') continue;"));
assert.ok(reader.includes('data-analyzer-start={range.analyzerStart}'));

console.log('Alpha 2 canonical Reader interaction tests passed');
