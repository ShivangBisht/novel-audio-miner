import assert from 'node:assert/strict';
import { buildEpubBookSectionModel } from '../src/lib/epub/bookSectionModel.js';
import { buildEpubReaderModel } from '../src/lib/epub/readerModel.js';
const packageModel={manifest:new Map(),guideReferences:[],coverCandidates:[],spine:[{spineIndex:0,resource:{canonicalHref:'chapter.xhtml'}}],navigation:[{index:0,title:'Chapter',target:{documentHref:'chapter.xhtml',fragmentId:null}}]};
const documents=[{documentHref:'chapter.xhtml',spineIndex:0,events:[{type:'text-block',eventIndex:0,plainText:'Chapter'},{type:'text-block',eventIndex:1,plainText:'けれど。',htmlText:'<em>けれど。</em>'},{type:'text-block',eventIndex:2,plainText:'次の完全な文です。',htmlText:'<ruby>次<rt>つぎ</rt></ruby>の完全な文です。',hasRuby:true},{type:'image',eventIndex:3,imageHref:'image.jpg',alt:''},{type:'text-block',eventIndex:4,plainText:'と。',htmlText:'と。'},{type:'text-block',eventIndex:5,plainText:'最後の完全な文です。',htmlText:'最後の完全な文です。'}]}];
const bookModel=buildEpubBookSectionModel({packageModel,documents});const runtime={packageModel,documents,bookModel,imageModel:{occurrences:[{documentHref:'chapter.xhtml',eventIndex:3,candidateRole:'inline-illustration',confidence:'high'}]},diagnostics:{reconstructionFailureCount:0,documents:[]}};globalThis.URL={createObjectURL:()=> 'blob:image'};const zip={file:()=>({async:async()=>new Blob(['x'])})};
const model=await buildEpubReaderModel({runtime,zip});const text=model.flatItems.filter(item=>item.type==='sentence');const image=model.flatItems.find(item=>item.type==='image');
assert.deepEqual(
 text.map(item=>item.plainText),
 [
  'けれど。\n次の完全な文です。',
  'と。\n最後の完全な文です。'
 ]
);
assert.equal(
 model.diagnostics.contextualActivation.activated,
 true
);
assert.equal(
 model.diagnostics.contextualActivation
  .ownedTextEventCount,
  4
);assert.equal(text[0].parserDebug.readerModelSource,'contextual-authoritative');assert.equal(text[0].parserDebug.hasRuby,true);assert.match(text[0].htmlText,/<ruby>次<rt>つぎ<\/rt><\/ruby>/);assert.equal(model.flatItems.indexOf(image),1);assert.equal(image.sceneIndex,1);assert.equal(model.chapterImageLists[0][0],image);assert.equal(model.diagnostics.contextualActivation.activated,true);assert.equal(model.diagnostics.contextualActivation.ownedTextEventCount,4);

var contextualTextItems=
 model.flatItems.filter(
  item=>item.type==='sentence'
 );


assert.equal(
 contextualTextItems[0].plainText.includes('\n'),
 true
);

assert.equal(
 contextualTextItems[0].htmlText.includes('<br>'),
 true
);

assert.equal(
 contextualTextItems[0].parserDebug
  ?.scenePlanning
  ?.sourceBlockBoundaryCount>=1,
 true
);

var contextualImageIndex=
 model.flatItems.findIndex(
  item=>item.type==='image'
 );

assert.equal(
 contextualImageIndex>0,
 true
);

assert.equal(
 model.flatItems[contextualImageIndex-1].type,
 'sentence'
);

assert.equal(
 model.flatItems[contextualImageIndex+1].type,
 'sentence'
);


var contextualTextItems =
  model.flatItems.filter(
    item => item.type === 'sentence'
  );

assert.deepEqual(
  contextualTextItems.map(
    item => item.plainText
  ),
  [
    'けれど。\n次の完全な文です。',
    'と。\n最後の完全な文です。'
  ]
);

assert.equal(
  contextualTextItems[0].htmlText.includes('<br>'),
  true
);

assert.equal(
  contextualTextItems[1].htmlText.includes('<br>'),
  true
);

assert.equal(
  contextualTextItems[0].parserDebug
    ?.scenePlanning
    ?.sourceBlockBoundaryCount,
  1
);

assert.equal(
  contextualTextItems[1].parserDebug
    ?.scenePlanning
    ?.sourceBlockBoundaryCount,
  1
);

var contextualImageIndex =
  model.flatItems.findIndex(
    item => item.type === 'image'
  );

assert.equal(
  contextualImageIndex > 0,
  true
);

assert.equal(
  model.flatItems[
    contextualImageIndex - 1
  ].type,
  'sentence'
);

assert.equal(
  model.flatItems[
    contextualImageIndex + 1
  ].type,
  'sentence'
);

console.log('Phase 14.5 contextual Reader activation tests passed');
