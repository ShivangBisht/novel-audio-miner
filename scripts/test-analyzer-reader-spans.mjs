import assert from 'node:assert/strict';
import {
  adaptReaderSpansForRendering
} from '../src/lib/analyzerReaderSpanAdapter.js';

function lexical(start, end, surface, key) {
  return {
    start,
    end,
    surface,
    displayRole: 'lexical',
    lexicalType: 'term',
    colorPolicy: 'known-or-frequency',
    unknownColorPolicy: 'frequency',
    knownLookupKey: key,
    frequencyLookupKey: key,
    countsForComprehension: true,
    showInNewWords: true,
    eligibleForMining: true,
    sourceSpanIds: [],
    sourceLayer: 'lexical',
    projectionStatus: 'selected'
  };
}

const text = '少年が走ってきた。';
const compact = {
  text,
  readerSpanSchemaVersion: '1.1',
  readerSpans: [
    lexical(0, 2, '少年', '少年'),
    {
      start: 2,
      end: 3,
      surface: 'が',
      displayRole: 'function',
      lexicalType: null,
      colorPolicy: 'muted',
      unknownColorPolicy: null,
      knownLookupKey: null,
      frequencyLookupKey: null,
      countsForComprehension: false,
      showInNewWords: false,
      eligibleForMining: false,
      sourceSpanIds: [],
      sourceLayer: 'morphology-fallback',
      projectionStatus: 'compatibility'
    },
    {
      start: 3,
      end: 8,
      surface: '走ってきた',
      displayRole: 'learnable-grammar',
      lexicalType: null,
      colorPolicy: 'grammar',
      unknownColorPolicy: null,
      knownLookupKey: null,
      frequencyLookupKey: null,
      countsForComprehension: false,
      showInNewWords: false,
      eligibleForMining: true,
      sourceSpanIds: [],
      sourceLayer: 'reader-correction',
      projectionStatus: 'user-corrected',
      correctionId: 'correction-1',
      correctionScope: 'occurrence',
      correctionAction: 'show-as-one-unit',
      hostLookupKey: '走る',
      grammarId: 'TE_KURU',
      grammarFocusRanges: [
        { start: 5, end: 8, surface: 'てきた' }
      ]
    },
    {
      start: 8,
      end: 9,
      surface: '。',
      displayRole: 'punctuation',
      lexicalType: null,
      colorPolicy: 'neutral',
      unknownColorPolicy: null,
      knownLookupKey: null,
      frequencyLookupKey: null,
      countsForComprehension: false,
      showInNewWords: false,
      eligibleForMining: false,
      sourceSpanIds: [],
      sourceLayer: 'orthography',
      projectionStatus: 'compatibility'
    }
  ]
};

const result = adaptReaderSpansForRendering(compact, text);
assert.equal(result.valid, true);
assert.deepEqual(result.errors, []);
assert.equal(result.words.map((word) => word.surface).join(''), text);
assert.equal(result.words[2].surface, '走ってきた');
assert.equal(result.words[2].grammarId, 'TE_KURU');
assert.equal(result.words[2].hostLookupKey, '走る');
assert.equal(result.words[2].projectionStatus, 'user-corrected');
assert.equal(result.correctionAware, true);
assert.equal(result.summary.corrected, 1);
assert.equal(result.words[0].dictionaryForm, '少年');

const gap = structuredClone(compact);
gap.readerSpans[1].start = 3;
const gapResult = adaptReaderSpansForRendering(gap, text);
assert.equal(gapResult.valid, false);
assert.equal(gapResult.words.length, 0);
assert.ok(gapResult.errors.some((error) => error.includes('gap')));

const wrongSurface = structuredClone(compact);
wrongSurface.readerSpans[2].surface = '走って来た';
const wrongSurfaceResult = adaptReaderSpansForRendering(wrongSurface, text);
assert.equal(wrongSurfaceResult.valid, false);
assert.equal(wrongSurfaceResult.words.length, 0);

const unsupportedSchema = structuredClone(compact);
unsupportedSchema.readerSpanSchemaVersion = '9.9';
assert.equal(
  adaptReaderSpansForRendering(unsupportedSchema, text).valid,
  false
);

const unsupportedRole = structuredClone(compact);
unsupportedRole.readerSpans[1].displayRole = 'numeric-lexical';
assert.equal(
  adaptReaderSpansForRendering(unsupportedRole, text).valid,
  false
);

console.log('authoritative readerSpans adapter tests passed');
