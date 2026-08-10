import assert from 'node:assert/strict';
import { buildEpubParserDiagnostics, assertLosslessEpubExtraction } from '../src/lib/epub/parserDiagnostics.js';
const report=buildEpubParserDiagnostics({packageModel:{diagnostics:{spineCount:1}},documents:[{
 documentHref:'OPS/Text/a.xhtml',spineIndex:0,visibleText:'第一段落。 第二段落。',events:[
  {type:'text-block',plainText:'第一段落。'},
  {type:'image',imageHref:'OPS/Images/a.jpg'},
  {type:'text-block',plainText:'第二段落。'}
 ]
}]});
assert.equal(report.reconstructionFailureCount,0);
assert.equal(report.documents[0].imageCount,1);
assert.equal(assertLosslessEpubExtraction(report),true);
const bad=buildEpubParserDiagnostics({documents:[{documentHref:'bad.xhtml',visibleText:'abc',events:[{type:'text-block',plainText:'ab'}]}]});
assert.throws(()=>assertLosslessEpubExtraction(bad),/bad.xhtml/);
console.log('Phase 13.1 EPUB reconstruction diagnostics tests passed');
