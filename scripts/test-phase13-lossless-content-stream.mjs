import assert from 'node:assert/strict';
import { extractOrderedContentEvents, contentStreamText } from '../src/lib/epub/contentStream.js';
class T { constructor(v){this.nodeType=3;this.nodeValue=v;this.parentElement=null;} }
class E { constructor(n,a={}){this.nodeType=1;this.localName=n;this.tagName=n;this.a=a;this.childNodes=[];this.children=[];this.parentElement=null;this.previousElementSibling=null;this.hidden=false;} getAttribute(n){return this.a[n]??null;} }
function add(p,c){const prev=p.children[p.children.length-1]||null;p.childNodes.push(c);c.parentElement=p;if(c.nodeType===1){c.previousElementSibling=prev;p.children.push(c);}return c;}
function text(p,v){return add(p,new T(v));}
const body=new E('body');
const wrapper=add(body,new E('div')); text(wrapper,'Before ');
const p=add(wrapper,new E('p')); text(p,'Paragraph '); const ruby=add(p,new E('ruby')); text(ruby,'漢字'); const rt=add(ruby,new E('rt')); text(rt,'かんじ'); text(p,' after ruby');
text(wrapper,' between '); const img=add(wrapper,new E('img',{src:'../i/a.jpg'})); text(wrapper,' after image ');
const table=add(wrapper,new E('table')); const tr=add(table,new E('tr')); const td=add(tr,new E('td')); text(td,'Cell');
text(wrapper,' tail'); const br=add(wrapper,new E('br')); text(wrapper,'last');
const events=extractOrderedContentEvents({body},{documentHref:'OPS/Text/a.xhtml',spineIndex:2,resolveReference:()=>({documentHref:'OPS/i/a.jpg'})});
assert.equal(contentStreamText(events).replace(/\s+/g,' ').trim(),'Before Paragraph 漢字 after ruby between after image Cell tail last');
assert.deepEqual(events.map(e=>e.type),['text-block','text-block','text-block','image','text-block','text-block','text-block','soft-break','text-block']);
assert.equal(events.filter(e=>e.type==='image')[0].imageHref,'OPS/i/a.jpg');
assert.equal(events.extractionStats.unownedTextNodeCount,0);
assert.equal(events.extractionStats.duplicateTextNodeCount,0);
assert.equal(events.filter(e=>e.type==='text-block').some(e=>e.plainText==='between'),true);
assert.equal(events.filter(e=>e.type==='text-block').some(e=>e.plainText==='tail'),true);
const headingBody=new E('body'); const h=add(headingBody,new E('h2')); text(h,'Chapter');
const headingEvents=extractOrderedContentEvents({body:headingBody}); assert.equal(headingEvents[0].type,'heading'); assert.equal(headingEvents[0].headingLevel,2);
console.log('Phase 13.3 lossless content stream tests passed');
