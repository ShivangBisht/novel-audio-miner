import assert from 'node:assert/strict';
import {
  logicalSentenceSelectionMessage,
  resolveLogicalSentenceSelection,
  validateLogicalSentenceOwnership
} from '../src/lib/scenePlanning/logicalSentenceSelection.js';

const prose='俺が綾子さんと初めて出会ったのは、悲劇の最中だった。';
const decorativeScene={
 plainText:`♠\n${prose}`,
 logicalSentences:[
  {index:0,plainText:'♠',visualStart:0,visualEnd:1,meaningfulLength:0,atomicReason:'symbol-only'},
  {index:1,plainText:prose,visualStart:2,visualEnd:2+prose.length,meaningfulLength:24,atomicReason:'terminal-punctuation'}
 ]
};
assert.equal(validateLogicalSentenceOwnership(decorativeScene).valid,true);

for(const selected of ['俺','俺が綾子','綾子さん','初めて','出会った','のは','悲劇','最中']){
 const localStart=prose.indexOf(selected);
 const visualStart=2+localStart;
 const result=resolveLogicalSentenceSelection({
  scene:decorativeScene,
  start:visualStart,
  end:visualStart+selected.length,
  visibleText:selected
 });
 assert.equal(result.valid,true,JSON.stringify(result));
 assert.equal(result.sentence,prose);
 assert.equal(result.start,localStart);
 assert.equal(result.end,localStart+selected.length);
 assert.equal(result.surface,selected);
 assert.equal(result.visualStart,visualStart);
 assert.equal(result.logicalSentenceIndex,1);
}

const symbol=resolveLogicalSentenceSelection({scene:decorativeScene,start:0,end:1,visibleText:'♠'});
assert.equal(symbol.valid,false);
assert.equal(symbol.reason,'logical-sentence-not-teachable');

const layout=resolveLogicalSentenceSelection({scene:decorativeScene,start:1,end:2,visibleText:'\n'});
assert.equal(layout.valid,false);
assert.equal(layout.reason,'selection-is-layout-only');

const crossing=resolveLogicalSentenceSelection({scene:decorativeScene,start:0,end:3,visibleText:'♠\n俺'});
assert.equal(crossing.valid,false);
assert.equal(crossing.reason,'selection-crosses-logical-sentence-boundary');
assert.match(logicalSentenceSelectionMessage(crossing),/one logical sentence/);

const first='「綾子おばさん、と……？」';
const second='「そう、おばさんと一緒に暮らそう」';
const dialogueScene={
 plainText:`${first}\n${second}`,
 logicalSentences:[
  {index:0,plainText:first,visualStart:0,visualEnd:first.length,meaningfulLength:7},
  {index:1,plainText:second,visualStart:first.length+1,visualEnd:first.length+1+second.length,meaningfulLength:15}
 ]
};
for(const [sentence,index,selected] of [[first,0,'綾子おばさん'],[second,1,'一緒に']]){
 const unit=dialogueScene.logicalSentences[index];
 const localStart=sentence.indexOf(selected);
 const result=resolveLogicalSentenceSelection({
  scene:dialogueScene,
  start:unit.visualStart+localStart,
  end:unit.visualStart+localStart+selected.length,
  visibleText:selected
 });
 assert.equal(result.valid,true,JSON.stringify(result));
 assert.equal(result.sentence,sentence);
 assert.equal(result.logicalSentenceIndex,index);
}

const dialogueCrossing=resolveLogicalSentenceSelection({
 scene:dialogueScene,
 start:first.length-2,
 end:first.length+3,
 visibleText:dialogueScene.plainText.slice(first.length-2,first.length+3)
});
assert.equal(dialogueCrossing.valid,false);
assert.equal(dialogueCrossing.reason,'selection-crosses-logical-sentence-boundary');

const mismatched=resolveLogicalSentenceSelection({
 scene:dialogueScene,start:0,end:2,visibleText:'wrong'
});
assert.equal(mismatched.valid,false);
assert.equal(mismatched.reason,'visual-selection-does-not-match-logical-sentence');

const invalidOwnership={
 plainText:'abc',
 logicalSentences:[{plainText:'abd',visualStart:0,visualEnd:3}]
};
assert.equal(validateLogicalSentenceOwnership(invalidOwnership).valid,false);
assert.equal(
 resolveLogicalSentenceSelection({scene:invalidOwnership,start:0,end:1}).reason,
 'logical-sentence-ownership-invalid'
);

console.log('Phase 14.5A step 2 logical sentence selection tests passed');
