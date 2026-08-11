const EXCLUDED_TAGS=new Set(['SCRIPT','STYLE','NOSCRIPT','IFRAME','TEMPLATE']);
const BLOCK_TAGS=new Set(['P','DIV','SECTION','ARTICLE','ASIDE','HEADER','FOOTER','MAIN','NAV','LI','UL','OL','BLOCKQUOTE','PRE','FIGURE','FIGCAPTION','TABLE','THEAD','TBODY','TFOOT','TR','TH','TD','DL','DT','DD','ADDRESS','H1','H2','H3','H4','H5','H6']);
const HEADING_TAGS=new Set(['H1','H2','H3','H4','H5','H6']);
const SAFE_INLINE_TAGS=new Set(['A','ABBR','B','BDI','BDO','CITE','CODE','DFN','EM','I','KBD','MARK','Q','RUBY','RT','RP','S','SAMP','SMALL','SPAN','STRONG','SUB','SUP','TIME','U','VAR','WBR']);
const SAFE_ATTRIBUTES=new Set(['class','dir','lang','title','xml:lang']);
function elementName(node){return String(node?.localName||node?.tagName||'').toUpperCase();}
function isExcluded(node){return node?.nodeType===1&&(EXCLUDED_TAGS.has(elementName(node))||node.hidden);}
function imageReference(node){if(elementName(node)==='IMG')return node.getAttribute('src')||'';if(elementName(node)==='IMAGE')return node.getAttribute('href')||node.getAttribute('xlink:href')||'';return'';}
function normalizeFragment(value){return String(value??'').replace(/\u00a0/g,' ').replace(/[\t\r\f]+/g,' ').replace(/ {2,}/g,' ');}
function hasVisibleText(value){return normalizeFragment(value).trim().length>0;}
function escapeHtml(value){return String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
function safeAttributes(node){
 const source=node?.attributes;
 let attributes=[];
 if(source&&typeof source[Symbol.iterator]==='function'){
  attributes=[...source].map(attribute=>({
   name:attribute?.name,
   value:attribute?.value
  }));
 }else if(source&&typeof source==='object'){
  attributes=Object.entries(source).map(([name,value])=>({
   name,
   value
  }));
 }
 const values=[];
 for(const attribute of attributes){
  const name=String(attribute.name||'').toLowerCase();
  if(SAFE_ATTRIBUTES.has(name)||name.startsWith('data-')){
   values.push(`${name}="${escapeHtml(attribute.value)}"`);
  }
 }
 return values.length?' '+values.join(' '):'';
}
function domPath(node){const parts=[];let current=node;while(current?.nodeType===1){let index=1,sibling=current.previousElementSibling;while(sibling){if(elementName(sibling)===elementName(current))index+=1;sibling=sibling.previousElementSibling;}parts.unshift(`${elementName(current).toLowerCase()}:nth-of-type(${index})`);current=current.parentElement;}return parts.join(' > ');}
function nearestElement(node){let current=node;while(current&&current.nodeType!==1)current=current.parentElement||current.parentNode;return current||null;}
function structuralIds(node){const ids=[];let current=nearestElement(node);while(current?.nodeType===1){const id=current.getAttribute?.('id');if(id&&!ids.includes(id))ids.push(id);current=current.parentElement;}return ids;}
export function sanitizeInlineReaderHtml(value){return String(value||'').replace(/<\/?(?:script|style|iframe|object|embed|form|input|button|textarea|select)\b[^>]*>/gi,'').replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'').replace(/\s+style\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi,'').trim();}
export function extractOrderedContentEvents(document,{documentHref='',spineIndex=-1,resolveReference=value=>value}={}){
 const root=document?.body||document?.documentElement;if(!root)throw new Error('Content stream requires a parsed XHTML/HTML document.');
 const events=[];let eventIndex=0,textNodeCount=0;const ownedTextNodes=new Set();let pendingAnchorIds=[];
 const emit=(type,node,data={})=>{const ancestorIds=[...pendingAnchorIds,...structuralIds(node)].filter((id,index,array)=>array.indexOf(id)===index);pendingAnchorIds=[];events.push(Object.freeze({type,eventIndex:eventIndex++,documentHref,spineIndex,domPath:domPath(nearestElement(node)),elementName:elementName(nearestElement(node)).toLowerCase(),elementId:nearestElement(node)?.getAttribute?.('id')||null,ancestorIds,epubType:nearestElement(node)?.getAttribute?.('epub:type')||null,...data}));};
 function processContainer(container,inheritedType='text-block'){
  let plain='',html='',bufferNode=null,bufferTextNodeCount=0,hasRuby=false;const type=HEADING_TAGS.has(elementName(container))?'heading':inheritedType;
  const flush=()=>{const normalized=normalizeFragment(plain).trim();if(hasVisibleText(normalized))emit(type,bufferNode||container,{plainText:normalized,htmlText:sanitizeInlineReaderHtml(html)||escapeHtml(normalized),hasRuby,headingLevel:type==='heading'?Number(elementName(container).slice(1)):null,sourceTextNodeCount:bufferTextNodeCount});plain='';html='';bufferNode=null;bufferTextNodeCount=0;hasRuby=false;};
  function visit(node){
   if(!node||isExcluded(node))return;
   if(node.nodeType===3){textNodeCount+=1;ownedTextNodes.add(node);bufferNode||=node.parentElement||container;bufferTextNodeCount+=1;const value=node.nodeValue||'';if(!['RT','RP'].includes(elementName(node.parentElement)))plain+=value;html+=escapeHtml(value);return;}
   if(node.nodeType!==1)return;const name=elementName(node);const nodeId=node.getAttribute?.('id');if(nodeId&&!(node.childNodes||[]).length&&!imageReference(node))pendingAnchorIds.push(nodeId);
   const ref=imageReference(node);if(ref){flush();const resolved=resolveReference(ref);emit('image',node,{sourceReference:ref,imageHref:resolved?.documentHref||resolved,fragmentId:resolved?.fragmentId||null,alt:node.getAttribute('alt')||node.getAttribute('title')||''});return;}
   if(name==='BR'){flush();emit('soft-break',node);return;}if(name==='HR'){flush();emit('thematic-break',node);return;}
   if(BLOCK_TAGS.has(name)&&node!==container){flush();processContainer(node,HEADING_TAGS.has(name)?'heading':'text-block');flush();return;}
   const safe=SAFE_INLINE_TAGS.has(name);if(name==='RUBY'||name==='RT'||name==='RP')hasRuby=true;if(safe)html+=`<${name.toLowerCase()}${safeAttributes(node)}>`;for(const child of [...(node.childNodes||[])])visit(child);if(safe&&!['WBR'].includes(name))html+=`</${name.toLowerCase()}>`;
  }
  for(const child of [...(container.childNodes||[])])visit(child);flush();
 }
 processContainer(root);Object.defineProperty(events,'extractionStats',{value:Object.freeze({textNodeCount,ownedTextNodeCount:ownedTextNodes.size,unownedTextNodeCount:Math.max(0,textNodeCount-ownedTextNodes.size),duplicateTextNodeCount:0,rubyEventCount:events.filter(x=>x.hasRuby).length}),enumerable:false});return Object.freeze(events);
}
export function contentStreamText(events){const fragments=[];for(const event of events||[]){if(event.type==='text-block'||event.type==='heading'){if(event.plainText)fragments.push(event.plainText);}else if(event.type==='soft-break')fragments.push('');}return fragments.join('\n');}
