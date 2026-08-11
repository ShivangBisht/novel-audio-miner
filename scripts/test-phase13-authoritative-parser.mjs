import assert from 'node:assert/strict';
import fs from 'node:fs';
import { extractOrderedContentEvents } from '../src/lib/epub/contentStream.js';
class T{constructor(v){this.nodeType=3;this.nodeValue=v;this.parentElement=null;}}
class E{constructor(n,a={}){this.nodeType=1;this.localName=n;this.tagName=n;this.attributes=Object.entries(a).map(([name,value])=>({name,value}));this.a=a;this.childNodes=[];this.children=[];this.parentElement=null;this.previousElementSibling=null;this.hidden=false;}getAttribute(n){return this.a[n]??null;}}
function add(p,c){const prev=p.children[p.children.length-1]||null;p.childNodes.push(c);c.parentElement=p;if(c.nodeType===1){c.previousElementSibling=prev;p.children.push(c);}return c;}function text(p,v){return add(p,new T(v));}
const body=new E('body'),p=add(body,new E('p'));text(p,'彼は');const ruby=add(p,new E('ruby'));text(ruby,'漢字');const rt=add(ruby,new E('rt'));text(rt,'かんじ');text(p,'を読んだ。');
const events=extractOrderedContentEvents({body},{documentHref:'Text/a.xhtml',spineIndex:1});
assert.equal(events.length,1);assert.equal(events[0].plainText,'彼は漢字を読んだ。');assert.equal(events[0].hasRuby,true);assert.match(events[0].htmlText,/<ruby>漢字<rt>かんじ<\/rt><\/ruby>/);assert.equal(events[0].htmlText.includes('<script'),false);
const parser=fs.readFileSync(new URL('../src/lib/epubParser.js',import.meta.url),'utf8');const active=parser.slice(parser.indexOf('export async function parseEpubFile'),parser.indexOf('// ─── Rest of the file unchanged'));
assert.match(active,/buildEpubAuthoritativeRuntime/);assert.match(active,/buildQualifiedReaderModel/);assert.doesNotMatch(active,/rawPages|extractPageWithOrdering|fillImageDataUris|buildSectionsFromToc|activateReaderModel/);assert.match(active,/legacyParserExecuted:false/);
console.log('Phase 13.6B authoritative parser and ruby preservation tests passed');
