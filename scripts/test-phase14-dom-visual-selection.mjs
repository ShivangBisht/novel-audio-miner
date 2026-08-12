import assert from 'node:assert/strict';
import {
  buildDomVisualTextMap,
  domVisualSelectionMessage,
  resolveDomVisualBoundary,
  resolveDomVisualSelection
} from '../src/lib/scenePlanning/domVisualSelection.js';
import { resolveLogicalSentenceSelection } from '../src/lib/scenePlanning/logicalSentenceSelection.js';

const TEXT=3;
const ELEMENT=1;
function text(value){return {nodeType:TEXT,textContent:value,parentElement:null,childNodes:[]};}
function element(name,...children){
 const node={nodeType:ELEMENT,tagName:name.toUpperCase(),nodeName:name.toUpperCase(),childNodes:children,parentElement:null};
 for(const child of children) child.parentElement=node;
 node.contains=target=>node===target||children.some(child=>child===target||(typeof child.contains==='function'&&child.contains(target)));
 return node;
}
function range(startContainer,startOffset,endContainer,endOffset,commonAncestorContainer){
 return {startContainer,startOffset,endContainer,endOffset,commonAncestorContainer};
}
function selection(value){return {isCollapsed:false,rangeCount:1,getRangeAt:()=>value};}

const symbol=text('♠');
const br=element('br');
const rubyBase=text('俺');
const rubyReading=text('おれ');
const ruby=element('ruby',rubyBase,element('rt',rubyReading));
const remainder=text('が綾子さんと初めて出会ったのは、悲劇の最中だった。');
const root=element('span',symbol,br,ruby,remainder);
const expected='♠\n俺が綾子さんと初めて出会ったのは、悲劇の最中だった。';

const map=buildDomVisualTextMap(root);
assert.equal(map.text,expected);
assert.equal(map.entries.filter(entry=>entry.kind==='break').length,1);
assert.equal(map.text.includes('おれ'),false);

assert.deepEqual(
 resolveDomVisualBoundary(root,rubyBase,0),
 {valid:true,offset:2,visualText:expected}
);
assert.equal(resolveDomVisualBoundary(root,remainder,0).offset,3);
assert.equal(resolveDomVisualBoundary(root,root,2).offset,2);
assert.equal(resolveDomVisualBoundary(root,root,3).offset,3);

const selected='初めて';
const local=remainder.textContent.indexOf(selected);
const mapped=resolveDomVisualSelection({
 root,
 selection:selection(range(remainder,local,remainder,local+selected.length,remainder)),
 expectedText:expected
});
assert.equal(mapped.valid,true,JSON.stringify(mapped));
assert.equal(mapped.visibleText,selected);
assert.equal(mapped.start,3+local);
assert.equal(mapped.end,3+local+selected.length);

const scene={
 plainText:expected,
 logicalSentences:[
  {index:0,plainText:'♠',visualStart:0,visualEnd:1,meaningfulLength:0,atomicReason:'symbol-only'},
  {index:1,plainText:expected.slice(2),visualStart:2,visualEnd:expected.length,meaningfulLength:24}
 ]
};
const logical=resolveLogicalSentenceSelection({
 scene,start:mapped.start,end:mapped.end,visibleText:mapped.visibleText
});
assert.equal(logical.valid,true,JSON.stringify(logical));
assert.equal(logical.surface,selected);
assert.equal(logical.sentence,expected.slice(2));

const fullPhrase='俺が綾子';
const crossNodes=resolveDomVisualSelection({
 root,
 selection:selection(range(rubyBase,0,remainder,fullPhrase.length-1,root)),
 expectedText:expected
});
assert.equal(crossNodes.valid,true,JSON.stringify(crossNodes));
assert.equal(crossNodes.visibleText,fullPhrase);

const gapOnly=resolveDomVisualSelection({
 root,
 selection:selection(range(root,1,root,2,root)),
 expectedText:expected
});
assert.equal(gapOnly.valid,true);
assert.equal(gapOnly.visibleText,'\n');
assert.equal(resolveLogicalSentenceSelection({scene,start:gapOnly.start,end:gapOnly.end,visibleText:'\n'}).reason,'selection-is-layout-only');

const mismatch=resolveDomVisualSelection({
 root,
 selection:selection(range(rubyBase,0,rubyBase,1,rubyBase)),
 expectedText:'different'
});
assert.equal(mismatch.valid,false);
assert.equal(mismatch.reason,'dom-visual-text-mismatch');
assert.match(domVisualSelectionMessage(mismatch),/does not match/);

const outside=text('outside');
assert.equal(resolveDomVisualBoundary(root,outside,0).reason,'boundary-outside-root');

const horizontal=buildDomVisualTextMap(root);
const vertical=buildDomVisualTextMap(root,{writingMode:'vertical-rl'});
assert.equal(horizontal.text,vertical.text);

const rpOpen=text('(');
const rpClose=text(')');
const rubyWithRp=element('ruby',text('次'),element('rp',rpOpen),element('rt',text('つぎ')),element('rp',rpClose));
const rubyRoot=element('span',rubyWithRp,text('の文。'));
assert.equal(buildDomVisualTextMap(rubyRoot).text,'次の文。');

console.log('Phase 14.5A step 3 DOM visual selection tests passed');
