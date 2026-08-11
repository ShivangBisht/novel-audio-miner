import assert from 'node:assert/strict';
import { buildEpubPackageModel, EPUB_RESOURCE_ROLES } from '../src/lib/epub/packageModel.js';
const model=buildEpubPackageModel({
 opfPath:'OPS/package.opf',
 manifestItems:[
  {id:'nav',href:'nav.xhtml',mediaType:'application/xhtml+xml',properties:'nav'},
  {id:'cover',href:'Images/cover.jpg',mediaType:'image/jpeg',properties:'cover-image'},
  {id:'c1',href:'Text/book.xhtml',mediaType:'application/xhtml+xml'}
 ],
 spineItems:[{idref:'c1',linear:'yes'}],
 navigationEntries:[
  {title:'Chapter 1',href:'Text/book.xhtml#chapter-1',sourceHref:'OPS/nav.xhtml',sourceType:'epub3-nav'},
  {title:'Chapter 2',href:'Text/book.xhtml#chapter-2',sourceHref:'OPS/nav.xhtml',sourceType:'epub3-nav'}
 ]
});
assert.equal(model.manifest.get('nav').role,EPUB_RESOURCE_ROLES.NAVIGATION);
assert.equal(model.coverCandidates[0].canonicalHref,'OPS/Images/cover.jpg');
assert.equal(model.spine[0].resource.canonicalHref,'OPS/Text/book.xhtml');
assert.equal(model.navigation[0].target.fragmentId,'chapter-1');
assert.equal(model.navigation[1].target.documentHref,'OPS/Text/book.xhtml');
assert.equal(model.diagnostics.coverCandidateCount,1);
assert.throws(()=>buildEpubPackageModel({opfPath:'OPS/p.opf',manifestItems:[],spineItems:[{idref:'missing'}]}));
console.log('Phase 13.1 EPUB package model tests passed');
