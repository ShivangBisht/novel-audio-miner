import assert from 'node:assert/strict';
import fs from 'node:fs';
import { qualifyLogicalTeachingInput } from '../src/lib/scenePlanning/teachingInputQualification.js';
import { resolveTeachingSelectionFromOffsets } from '../src/lib/teachingSelectionResolver.js';
import { adaptReaderSpansForRendering } from '../src/lib/analyzerReaderSpanAdapter.js';

const sentence='俺が綾子さんと初めて出会ったのは、悲劇の最中だった。';
const boundaries=[
 [0,1,'俺','lexical'],[1,2,'が','function'],[2,6,'綾子さん','name'],[6,7,'と','function'],
 [7,10,'初めて','lexical'],[10,14,'出会った','lexical'],[14,15,'の','function'],
 [15,16,'は','function'],[16,17,'、','punctuation'],[17,19,'悲劇','lexical'],
 [19,20,'の','function'],[20,22,'最中','lexical'],[22,24,'だっ','function'],
 [24,25,'た','function'],[25,26,'。','punctuation']
];
function span([start,end,surface,role],index){
 const lexical=role==='lexical';
 return {
  start,end,surface,displayRole:role,
  lexicalType:lexical?'term':null,
  colorPolicy:lexical?'known-or-frequency':role==='punctuation'?'neutral':'muted',
  unknownColorPolicy:lexical?'frequency':null,
  knownLookupKey:lexical?surface:null,
  frequencyLookupKey:lexical?surface:null,
  countsForComprehension:lexical,
  showInNewWords:lexical,
  eligibleForMining:lexical,
  headword:lexical?surface:null,
  grammarId:null,
  confidence:1,
  sourceSpanIds:[`s${index}`],
  sourceLayer:role==='punctuation'?'orthography':'test',
  projectionStatus:'compatibility'
 };
}
const readerSpans=boundaries.map(span);
assert.equal(readerSpans.map(item=>item.surface).join(''),sentence);
const candidates=[{candidateId:'candidate-1',start:7,end:10,surface:'初めて'}];
const readerSelection={policyVersion:'1.0',selectedGeneratedCandidateIds:['candidate-1']};
const analyzerRecord={
 text:sentence,
 readerSpanSchemaVersion:'1.1',
 readerSpans,
 readerCandidates:candidates,
 readerSelection,
 analyzerVersion:'unchanged-test-version',
 correctionRevision:'unchanged-test-revision'
};

const localStart=sentence.indexOf('初めて');
const logicalSelection={
 valid:true,sentence,start:localStart,end:localStart+3,surface:'初めて',
 logicalSentenceIndex:1,visualStart:localStart+2,visualEnd:localStart+5
};
const result=qualifyLogicalTeachingInput({logicalSelection,analyzerRecord});
assert.equal(result.valid,true,JSON.stringify(result));

// The bridge output must exactly equal the existing formal Teaching resolver output.
const adapted=adaptReaderSpansForRendering(analyzerRecord,sentence);
assert.equal(adapted.valid,true,JSON.stringify(adapted));
const existing=resolveTeachingSelectionFromOffsets({
 sentence,analyzerSpans:adapted.words,start:logicalSelection.start,
 end:logicalSelection.end,visibleText:logicalSelection.surface
});
assert.deepEqual(result.selection,existing);
assert.deepEqual(Object.keys(result.selection).sort(),[
 'alignedToSpanEnd','alignedToSpanStart','coveredSpanIndexes','end','exact',
 'sentence','spans','start','surface','valid'
]);
assert.deepEqual(Object.keys(result.analysis).sort(),['candidates','selection','words']);
assert.deepEqual(result.analysis.words,adapted.words);
assert.equal(result.analysis.candidates,analyzerRecord.readerCandidates);
assert.equal(result.analysis.selection,analyzerRecord.readerSelection);
assert.equal(result.analyzerRecord,analyzerRecord);

const mismatch=qualifyLogicalTeachingInput({
 logicalSelection,
 analyzerRecord:{...analyzerRecord,text:'different'}
});
assert.equal(mismatch.valid,false);
assert.equal(mismatch.reason,'sentence-local-analysis-text-mismatch');

const invalidSpans=qualifyLogicalTeachingInput({
 logicalSelection,
 analyzerRecord:{...analyzerRecord,readerSpans:[...readerSpans.slice(1)]}
});
assert.equal(invalidSpans.valid,false);
assert.equal(invalidSpans.reason,'sentence-local-reader-spans-invalid');

const invalidLogical=qualifyLogicalTeachingInput({
 logicalSelection:{valid:false,reason:'selection-is-layout-only'},
 analyzerRecord
});
assert.equal(invalidLogical.valid,false);
assert.equal(invalidLogical.reason,'logical-selection-invalid');

// Source-level isolation checks.
const bridgeSource=fs.readFileSync('src/lib/scenePlanning/teachingInputQualification.js','utf8');
assert.match(bridgeSource,/resolveTeachingSelectionFromOffsets/);
assert.match(bridgeSource,/adaptReaderSpansForRendering/);
assert.doesNotMatch(bridgeSource,/fetch\(/);
assert.doesNotMatch(bridgeSource,/readerSpans\s*:/);

console.log('Phase 14.5A step 5 Teaching input qualification tests passed');
