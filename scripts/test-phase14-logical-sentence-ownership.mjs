import assert from 'node:assert/strict';
import { buildEpubBookSectionModel } from '../src/lib/epub/bookSectionModel.js';
import { buildEpubReaderModel } from '../src/lib/epub/readerModel.js';

const packageModel={
 manifest:new Map(),guideReferences:[],coverCandidates:[],
 spine:[{spineIndex:0,resource:{canonicalHref:'chapter.xhtml'}}],
 navigation:[{index:0,title:'Chapter',target:{documentHref:'chapter.xhtml',fragmentId:null}}]
};
const prose='俺が綾子さんと初めて出会ったのは、悲劇の最中だった。';
const documents=[{
 documentHref:'chapter.xhtml',spineIndex:0,
 events:[
  {type:'text-block',eventIndex:0,plainText:'Chapter'},
  {type:'text-block',eventIndex:1,plainText:'♠',htmlText:'♠'},
  {type:'text-block',eventIndex:2,plainText:prose,htmlText:prose},
  {type:'image',eventIndex:3,imageHref:'image.jpg',alt:''},
  {type:'text-block',eventIndex:4,plainText:'「一つ目？」',htmlText:'「一つ目？」'},
  {type:'text-block',eventIndex:5,plainText:'「二つ目を話そう」',htmlText:'「二つ目を話そう」'}
 ]
}];
const bookModel=buildEpubBookSectionModel({packageModel,documents});
const runtime={
 packageModel,documents,bookModel,
 imageModel:{occurrences:[{documentHref:'chapter.xhtml',eventIndex:3,candidateRole:'inline-illustration',confidence:'high'}]},
 diagnostics:{reconstructionFailureCount:0,documents:[]}
};
globalThis.URL={createObjectURL:()=> 'blob:image'};
const zip={file:()=>({async:async()=>new Blob(['x'])})};
const model=await buildEpubReaderModel({runtime,zip});
const textItems=model.flatItems.filter(item=>item.type==='sentence');
assert.equal(textItems.length,2);

const decorative=textItems[0];
assert.equal(decorative.plainText,`♠\n${prose}`);
assert.equal(decorative.htmlText,`♠<br>${prose}`);
assert.equal(decorative.logicalSentences.length,2);
assert.deepEqual(
 decorative.logicalSentences.map(unit=>unit.plainText),
 ['♠',prose]
);
assert.deepEqual(
 decorative.logicalSentences.map(unit=>[unit.visualStart,unit.visualEnd]),
 [[0,1],[2,2+prose.length]]
);
assert.equal(decorative.logicalSentences[0].meaningfulLength,0);
assert.equal(decorative.logicalSentences[0].atomicReason,'symbol-only');
assert.equal(decorative.logicalSentences[1].sourceEventIndex,2);
assert.equal(
 decorative.parserDebug.scenePlanning.logicalSentenceCount,
 2
);

const dialogue=textItems[1];
assert.equal(dialogue.logicalSentences.length,2);
assert.deepEqual(
 dialogue.logicalSentences.map(unit=>unit.plainText),
 ['「一つ目？」','「二つ目を話そう」']
);
assert.equal(dialogue.logicalSentences[1].visualStart,'「一つ目？」'.length+1);

const imageIndex=model.flatItems.findIndex(item=>item.type==='image');
assert.equal(imageIndex,1);
assert.equal(model.flatItems[imageIndex-1],decorative);
assert.equal(model.flatItems[imageIndex+1],dialogue);

for(const item of textItems){
 for(let index=1;index<item.logicalSentences.length;index+=1){
  assert.equal(
   item.logicalSentences[index-1].visualEnd < item.logicalSentences[index].visualStart,
   true
  );
 }
}

console.log('Phase 14.5A step 1 logical sentence ownership tests passed');
