const EXCLUDED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'TEMPLATE']);
const BLOCK_TAGS = new Set(['P','DIV','SECTION','ARTICLE','ASIDE','HEADER','FOOTER','LI','BLOCKQUOTE','PRE','FIGCAPTION','DT','DD','H1','H2','H3','H4','H5','H6']);
const HEADING_TAGS = new Set(['H1','H2','H3','H4','H5','H6']);

function cleanText(value) {
  return String(value ?? '').replace(/\u00a0/g, ' ').replace(/[\t\r\f]+/g, ' ').replace(/ {2,}/g, ' ').trim();
}
function visibleText(node) {
  if (!node) return '';
  if (node.nodeType === 3) return node.nodeValue ?? '';
  if (node.nodeType !== 1 || EXCLUDED_TAGS.has(node.tagName) || node.hidden) return '';
  if (node.tagName === 'RT' || node.tagName === 'RP') return '';
  if (node.tagName === 'BR') return '\n';
  return [...node.childNodes].map(visibleText).join('');
}
function domPath(node) {
  const parts=[]; let current=node;
  while (current?.nodeType === 1) {
    let index=1; let sibling=current.previousElementSibling;
    while (sibling) { if (sibling.tagName === current.tagName) index += 1; sibling=sibling.previousElementSibling; }
    parts.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${index})`); current=current.parentElement;
  }
  return parts.join(' > ');
}
function imageReference(node) {
  if (node.tagName === 'IMG') return node.getAttribute('src') || '';
  if (node.tagName === 'IMAGE') return node.getAttribute('href') || node.getAttribute('xlink:href') || '';
  return '';
}

export function extractOrderedContentEvents(document, { documentHref = '', spineIndex = -1, resolveReference = value => value } = {}) {
  const root=document?.body || document?.documentElement;
  if (!root) throw new Error('Content stream requires a parsed XHTML/HTML document.');
  const events=[]; let eventIndex=0;
  const emit=(type,node,data={})=>events.push(Object.freeze({
    type, eventIndex:eventIndex++, documentHref, spineIndex, domPath:domPath(node),
    elementName:String(node?.tagName ?? '').toLowerCase(), elementId:node?.getAttribute?.('id') || null,
    epubType:node?.getAttribute?.('epub:type') || null, ...data
  }));
  function walk(node, blockOwner=null) {
    if (!node || (node.nodeType === 1 && (EXCLUDED_TAGS.has(node.tagName) || node.hidden))) return;
    if (node.nodeType === 1) {
      const ref=imageReference(node);
      if (ref) {
        const resolved=resolveReference(ref);
        emit('image',node,{ sourceReference:ref, imageHref:resolved?.documentHref || resolved, fragmentId:resolved?.fragmentId || null,
          alt:node.getAttribute('alt') || node.getAttribute('title') || '' });
        return;
      }
      if (node.tagName === 'BR') { emit('soft-break',node); return; }
      if (node.tagName === 'HR') { emit('thematic-break',node); return; }
      if (BLOCK_TAGS.has(node.tagName)) {
        const nestedBlocks=[...node.children].filter(child => BLOCK_TAGS.has(child.tagName));
        if (!nestedBlocks.length) {
          const plainText=cleanText(visibleText(node));
          if (plainText) emit(HEADING_TAGS.has(node.tagName)?'heading':'text-block',node,{ plainText, htmlText:node.innerHTML || '', headingLevel:HEADING_TAGS.has(node.tagName)?Number(node.tagName.slice(1)):null });
          for (const child of node.children) if (imageReference(child)) walk(child,node);
          return;
        }
      }
    }
    for (const child of [...(node.childNodes || [])]) walk(child,blockOwner);
  }
  walk(root);
  return Object.freeze(events);
}

export function contentStreamText(events) {
  return events.filter(event => event.type === 'text-block' || event.type === 'heading').map(event => event.plainText).join('\n');
}
