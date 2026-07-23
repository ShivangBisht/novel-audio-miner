import assert from 'node:assert/strict';
import { buildAnalyzerLearningModel } from '../src/lib/analyzerLearningModel.js';
const span=(surface,role,overrides={})=>({analysisSource:'jp-analyzer-reader-spans',start:0,end:surface.length,surface,displayRole:role,countsForComprehension:false,showInNewWords:false,eligibleForMining:false,knownLookupKey:null,frequencyLookupKey:null,...overrides});
const words=[
 span('少年','lexical',{countsForComprehension:true,showInNewWords:true,eligibleForMining:true,knownLookupKey:'少年',frequencyLookupKey:'少年'}),
 span('が','function'),
 span('走る','lexical',{countsForComprehension:true,showInNewWords:true,eligibleForMining:true,knownLookupKey:'走る',frequencyLookupKey:'走る'}),
 span('てきた','learnable-grammar',{eligibleForMining:true,grammarId:'TE_KURU'}),
 span('走った','lexical',{showInNewWords:true,knownLookupKey:'走る',frequencyLookupKey:'走る'}),
 span('。','punctuation')
];
const model=buildAnalyzerLearningModel(words,{isKnown:key=>key==='少年',getFrequency:key=>({key,category:'common'})});
assert.deepEqual(model.comprehension,{known:1,unknown:1,total:2,percent:50,spans:model.comprehension.spans,excludedByRole:{function:1,'learnable-grammar':1,lexical:1,punctuation:1}});
assert.equal(model.newWords.length,1); assert.equal(model.newWords[0].key,'走る');
assert.equal(model.miningCandidates.length,3); assert.equal(model.miningCandidates[2].grammarId,'TE_KURU');
assert.throws(()=>buildAnalyzerLearningModel([span('語','lexical',{countsForComprehension:true})]),/knownLookupKey/);
console.log('analyzer learning shadow model tests passed');
