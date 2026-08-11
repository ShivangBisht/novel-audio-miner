import assert from 'node:assert/strict';
import { canonicalizeEpubPath, epubDirname, resolveEpubReference, sameEpubDocument } from '../src/lib/epub/pathResolver.js';
assert.equal(canonicalizeEpubPath('OPS/Text/../Images/%E8%A1%A8%E7%B4%99.jpg'),'OPS/Images/表紙.jpg');
assert.equal(epubDirname('OPS/Text/chapter.xhtml'),'OPS/Text');
assert.deepEqual(resolveEpubReference('OPS/Text/chapter.xhtml','../Images/a.jpg#panel'),{
  source:'../Images/a.jpg#panel',documentHref:'OPS/Images/a.jpg',fragmentId:'panel',query:null,canonicalReference:'OPS/Images/a.jpg#panel'
});
assert.equal(resolveEpubReference('OPS/Text/chapter.xhtml','#part-2').documentHref,'OPS/Text/chapter.xhtml');
assert.equal(sameEpubDocument('OPS/Text/a.xhtml#x','OPS/Text/a.xhtml#y'),true);
console.log('Phase 13.1 EPUB path resolver tests passed');
