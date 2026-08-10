const EXCLUDED_TAGS = new Set(['SCRIPT','STYLE','NOSCRIPT','IFRAME','TEMPLATE']);
const BLOCK_TAGS = new Set(['P','DIV','SECTION','ARTICLE','ASIDE','HEADER','FOOTER','MAIN','NAV','LI','UL','OL','BLOCKQUOTE','PRE','FIGURE','FIGCAPTION','TABLE','THEAD','TBODY','TFOOT','TR','TH','TD','DL','DT','DD','ADDRESS','H1','H2','H3','H4','H5','H6']);
const HEADING_TAGS = new Set(['H1','H2','H3','H4','H5','H6']);

function elementName(node) { return String(node?.localName || node?.tagName || '').toUpperCase(); }
function isExcluded(node) { return node?.nodeType === 1 && (EXCLUDED_TAGS.has(elementName(node)) || node.hidden); }
function imageReference(node) {
  if (elementName(node) === 'IMG') return node.getAttribute('src') || '';
  if (elementName(node) === 'IMAGE') return node.getAttribute('href') || node.getAttribute('xlink:href') || '';
  return '';
}
function normalizeFragment(value) {
  return String(value ?? '').replace(/\u00a0/g,' ').replace(/[\t\r\f]+/g,' ').replace(/ {2,}/g,' ');
}
function hasVisibleText(value) { return normalizeFragment(value).trim().length > 0; }
function domPath(node) {
  const parts=[]; let current=node;
  while (current?.nodeType === 1) {
    let index=1; let sibling=current.previousElementSibling;
    while (sibling) { if (elementName(sibling) === elementName(current)) index += 1; sibling=sibling.previousElementSibling; }
    parts.unshift(`${elementName(current).toLowerCase()}:nth-of-type(${index})`); current=current.parentElement;
  }
  return parts.join(' > ');
}
function nearestElement(node) {
  let current=node;
  while (current && current.nodeType !== 1) current=current.parentElement || current.parentNode;
  return current || null;
}

export function extractOrderedContentEvents(document, { documentHref='', spineIndex=-1, resolveReference=value=>value }={}) {
  const root=document?.body || document?.documentElement;
  if (!root) throw new Error('Content stream requires a parsed XHTML/HTML document.');
  const events=[]; let eventIndex=0; let textNodeCount=0; const ownedTextNodes=new Set();
  const emit=(type,node,data={})=>events.push(Object.freeze({
    type,eventIndex:eventIndex++,documentHref,spineIndex,domPath:domPath(nearestElement(node)),
    elementName:elementName(nearestElement(node)).toLowerCase(),elementId:nearestElement(node)?.getAttribute?.('id')||null,
    epubType:nearestElement(node)?.getAttribute?.('epub:type')||null,...data
  }));
  function processContainer(container, inheritedType='text-block') {
    let buffer=''; let bufferNode=null; let bufferTextNodeCount=0;
    const type=HEADING_TAGS.has(elementName(container))?'heading':inheritedType;
    const flush=()=>{
      if (hasVisibleText(buffer)) emit(type,bufferNode||container,{plainText:normalizeFragment(buffer).trim(),htmlText:'',headingLevel:type==='heading'?Number(elementName(container).slice(1)):null,sourceTextNodeCount:bufferTextNodeCount});
      buffer=''; bufferNode=null; bufferTextNodeCount=0;
    };
    function visit(node) {
      if (!node || isExcluded(node)) return;
      if (node.nodeType === 3) {
        textNodeCount += 1; ownedTextNodes.add(node); buffer += node.nodeValue || ''; bufferNode ||= node.parentElement || container; bufferTextNodeCount += 1; return;
      }
      if (node.nodeType !== 1) return;
      const name=elementName(node);
      if (name === 'RT' || name === 'RP') return;
      const ref=imageReference(node);
      if (ref) {
        flush(); const resolved=resolveReference(ref);
        emit('image',node,{sourceReference:ref,imageHref:resolved?.documentHref||resolved,fragmentId:resolved?.fragmentId||null,alt:node.getAttribute('alt')||node.getAttribute('title')||''}); return;
      }
      if (name === 'BR') { flush(); emit('soft-break',node); return; }
      if (name === 'HR') { flush(); emit('thematic-break',node); return; }
      if (BLOCK_TAGS.has(name) && node !== container) { flush(); processContainer(node,HEADING_TAGS.has(name)?'heading':'text-block'); flush(); return; }
      for (const child of [...(node.childNodes||[])]) visit(child);
    }
    for (const child of [...(container.childNodes||[])]) visit(child);
    flush();
  }
  processContainer(root);
  Object.defineProperty(events,'extractionStats',{value:Object.freeze({textNodeCount,ownedTextNodeCount:ownedTextNodes.size,unownedTextNodeCount:Math.max(0,textNodeCount-ownedTextNodes.size),duplicateTextNodeCount:0}),enumerable:false});
  return Object.freeze(events);
}

export function contentStreamText(events) {
  const fragments = [];
  for (const event of events || []) {
    if (event.type === 'text-block' || event.type === 'heading') {
      if (event.plainText) fragments.push(event.plainText);
    } else if (event.type === 'soft-break') {
      fragments.push('');
    }
  }
  return fragments.join('\n');
}
