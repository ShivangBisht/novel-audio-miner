import assert from 'node:assert/strict';
import { buildEpubShadowDiagnostics, sanitizeEpubShadowDiagnostics } from '../src/lib/epub/shadowParser.js';

class FakeFile { constructor(text){ this.text=text; } async async(){ return this.text; } }
class FakeZip { constructor(files){ this.files=files; } file(path){ return this.files[path] == null ? null : new FakeFile(this.files[path]); } }
class FakeNode {
  constructor(localName, attrs={}, text=''){ this.localName=localName; this.tagName=localName.toUpperCase(); this.attrs=attrs; this.textContent=text; this.children=[]; this.childNodes=[]; this.nodeType=1; this.hidden=false; this.parentElement=null; }
  getAttribute(name){ return this.attrs[name] ?? null; }
  getElementsByTagName(){ const out=[]; const walk=n=>{ for(const child of n.children){ out.push(child); walk(child); } }; walk(this); return out; }
  querySelector(){ return null; }
}
function add(parent, child){ parent.children.push(child); parent.childNodes.push(child); child.parentElement=parent; return child; }
const opf=new FakeNode('package');
const metadata=add(opf,new FakeNode('metadata')); add(metadata,new FakeNode('title',{},'Book'));
const manifest=add(opf,new FakeNode('manifest'));
add(manifest,new FakeNode('item',{id:'cover',href:'Images/cover.jpg','media-type':'image/jpeg',properties:'cover-image'}));
add(manifest,new FakeNode('item',{id:'c1',href:'Text/c1.xhtml','media-type':'application/xhtml+xml'}));
const spine=add(opf,new FakeNode('spine')); add(spine,new FakeNode('itemref',{idref:'c1'}));
const original=globalThis.DOMParser;
globalThis.DOMParser=class { parseFromString(){
  const body=new FakeNode('body'); const p=add(body,new FakeNode('p')); p.innerHTML='本文。'; add(p,{nodeType:3,nodeValue:'本文。',parentElement:p});
  return { body, documentElement:body, querySelector(){return null;}, getElementsByTagName(){return [];} };
}};
try {
 const result=await buildEpubShadowDiagnostics({zip:new FakeZip({'OPS/Text/c1.xhtml':'x'}),opf,opfPath:'OPS/package.opf'});
 assert.equal(result.status,'complete');
 assert.equal(result.package.spineCount,1);
 assert.equal(result.coverCandidates[0].documentHref,'OPS/Images/cover.jpg');
 assert.equal(result.documents.processedCount,1);
 assert.equal(result.documents.textBlockCount,1);
 const serialized=JSON.stringify(sanitizeEpubShadowDiagnostics(result));
 assert.equal(serialized.includes('本文。'),false);
 assert.equal(serialized.includes('htmlText'),false);
} finally { globalThis.DOMParser=original; }
const failed=await buildEpubShadowDiagnostics({zip:null,opf:null,opfPath:''});
assert.equal(failed.status,'failed');
console.log('Phase 13.2 EPUB shadow parser tests passed');
