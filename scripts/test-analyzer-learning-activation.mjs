import assert from 'node:assert/strict';
import { resolveLearningOwnership } from '../src/lib/analyzerLearningModel.js';
const model={available:true,comprehension:{known:1,total:2,percent:50},newWords:[{key:'走る',surface:'走った'}]};
const active=resolveLearningOwnership({analyzerValid:true,analyzerModel:model});
assert.equal(active.source,'jp-analyzer'); assert.equal(active.comprehension.percent,50); assert.equal(active.newWords[0].word,'走る');
const unavailable=resolveLearningOwnership({analyzerValid:false,analyzerModel:null});
assert.equal(unavailable.available,false); assert.equal(unavailable.comprehension,null);
console.log('analyzer-only learning ownership tests passed');
