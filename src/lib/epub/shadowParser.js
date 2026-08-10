import { buildEpubPackageModel } from './packageModel.js';
import { extractOrderedContentEvents } from './contentStream.js';
import { buildEpubParserDiagnostics } from './parserDiagnostics.js';
import { canonicalizeEpubPath, epubDirname, resolveEpubReference } from './pathResolver.js';
import { buildEpubBookSectionModel, sanitizeEpubBookSectionModel } from './bookSectionModel.js';

function localElements(root, name) {
  return [...(root?.getElementsByTagName('*') || [])].filter(node =>
    String(node.localName || node.tagName || '').toLowerCase() === name
  );
}
function firstLocal(root, name) { return localElements(root, name)[0] || null; }
function clean(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
function parseDocument(text, mediaType = 'application/xhtml+xml') {
  const xml = new DOMParser().parseFromString(text, mediaType);
  if (!xml.querySelector('parsererror')) return xml;
  return new DOMParser().parseFromString(text, 'text/html');
}
function manifestInput(opf) {
  return localElements(firstLocal(opf, 'manifest'), 'item').map(item => ({
    id: item.getAttribute('id') || '', href: item.getAttribute('href') || '',
    mediaType: item.getAttribute('media-type') || '', properties: item.getAttribute('properties') || ''
  }));
}
function spineInput(opf) {
  return localElements(firstLocal(opf, 'spine'), 'itemref').map(item => ({
    idref: item.getAttribute('idref') || '', linear: item.getAttribute('linear') || 'yes',
    properties: item.getAttribute('properties') || ''
  }));
}
function guideInput(opf) {
  return localElements(firstLocal(opf, 'guide'), 'reference').map(item => ({
    type: item.getAttribute('type') || '', title: item.getAttribute('title') || '', href: item.getAttribute('href') || ''
  }));
}
function metadataInput(opf) {
  const metadata = firstLocal(opf, 'metadata');
  const coverMeta = localElements(metadata, 'meta').find(item => String(item.getAttribute('name') || '').toLowerCase() === 'cover');
  return {
    coverManifestId: coverMeta?.getAttribute('content') || '',
    title: clean(firstLocal(metadata, 'title')?.textContent),
    creator: clean(firstLocal(metadata, 'creator')?.textContent),
    language: clean(firstLocal(metadata, 'language')?.textContent),
    identifier: clean(firstLocal(metadata, 'identifier')?.textContent)
  };
}
function navDepth(anchor) {
  let depth = 0; let current = anchor?.parentElement;
  while (current) { if (String(current.localName || '').toLowerCase() === 'ol') depth += 1; current = current.parentElement; }
  return Math.max(0, depth - 1);
}
async function navigationInput(zip, opf, opfPath, manifestItems) {
  const byId = new Map(manifestItems.map(item => [item.id, item]));
  const entries = [];
  const navItem = manifestItems.find(item => String(item.properties).split(/\s+/).includes('nav'));
  if (navItem) {
    const navHref = resolveEpubReference(opfPath, navItem.href).documentHref;
    const file = zip.file(navHref);
    if (file) {
      const doc = parseDocument(await file.async('text'));
      const navs = localElements(doc, 'nav');
      const toc = navs.find(node => /(^|\s)toc(\s|$)/i.test(node.getAttribute('epub:type') || node.getAttribute('type') || '')) || navs[0];
      for (const anchor of localElements(toc, 'a')) {
        const href = anchor.getAttribute('href');
        if (href) entries.push({ title: clean(anchor.textContent), href, depth: navDepth(anchor), sourceType: 'epub3-nav', sourceHref: navHref });
      }
    }
  }
  if (!entries.length) {
    const spine = firstLocal(opf, 'spine');
    const ncxId = spine?.getAttribute('toc') || '';
    const ncxItem = byId.get(ncxId) || manifestItems.find(item => /ncx/i.test(item.mediaType) || /\.ncx$/i.test(item.href));
    if (ncxItem) {
      const ncxHref = resolveEpubReference(opfPath, ncxItem.href).documentHref;
      const file = zip.file(ncxHref);
      if (file) {
        const doc = parseDocument(await file.async('text'), 'application/xml');
        for (const point of localElements(doc, 'navpoint')) {
          const content = firstLocal(point, 'content');
          const href = content?.getAttribute('src');
          if (href) entries.push({ title: clean(firstLocal(point, 'text')?.textContent), href, depth: 0, sourceType: 'epub2-ncx', sourceHref: ncxHref });
        }
      }
    }
  }
  return entries;
}
function visibleDocumentText(document) {
  const excluded = new Set([
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'IFRAME',
    'TEMPLATE',
    'RT',
    'RP'
  ]);

  function normalizedName(node) {
    return String(
      node?.localName ||
      node?.tagName ||
      ''
    ).toUpperCase();
  }

  function walk(node) {
    if (!node) return '';

    if (node.nodeType === 3) {
      return node.nodeValue || '';
    }

    if (
      node.nodeType !== 1 ||
      excluded.has(normalizedName(node)) ||
      node.hidden
    ) {
      return '';
    }

    if (normalizedName(node) === 'BR') {
      return '\n';
    }

    return [...node.childNodes]
      .map(walk)
      .join('');
  }

  return walk(document.body || document.documentElement);
}
function errorCode(error) {
  const name = String(error?.name || 'Error').replace(/[^A-Za-z0-9]+/g, '_').toUpperCase();
  return `EPUB_SHADOW_${name || 'ERROR'}`;
}
function diagnosticView(packageModel, diagnostics, bookModel) {
  const documents = diagnostics.documents || [];
  return Object.freeze({
    schemaVersion: '13.4A', status: 'complete', package: packageModel.diagnostics,
    bookModel: sanitizeEpubBookSectionModel(bookModel),
    navigationTargets: Object.freeze(packageModel.navigation.slice(0, 500).map(entry => ({
      index: entry.index, sourceType: entry.sourceType, sourceHref: entry.sourceHref,
      documentHref: entry.target.documentHref, fragmentId: entry.target.fragmentId,
      depth: entry.depth, titleLength: entry.title.length
    }))),
    coverCandidates: Object.freeze(packageModel.coverCandidates.map(item => ({
      manifestId: item.id, documentHref: item.canonicalHref, mediaType: item.mediaType, role: item.role
    }))),
    documents: Object.freeze({
      processedCount: documents.length,
      reconstructionFailureCount: diagnostics.reconstructionFailureCount,
      eventCount: documents.reduce((sum,item)=>sum+item.eventCount,0),
      textBlockCount: documents.reduce((sum,item)=>sum+item.textBlockCount,0),
      headingCount: documents.reduce((sum,item)=>sum+item.headingCount,0),
      imageCount: documents.reduce((sum,item)=>sum+item.imageCount,0)
    }),
    documentSummaries: Object.freeze(documents.slice(0, 1000)),
    reconstructionFailures: Object.freeze(documents.filter(item=>!item.reconstructed).slice(0, 200))
  });
}

export async function buildEpubShadowDiagnostics({ zip, opf, opfPath }) {
  try {
    const manifestItems = manifestInput(opf);
    const navigationEntries = await navigationInput(zip, opf, opfPath, manifestItems);
    const packageModel = buildEpubPackageModel({
      opfPath, manifestItems, spineItems: spineInput(opf), navigationEntries,
      metadata: metadataInput(opf), guideReferences: guideInput(opf)
    });
    const documents = [];
    for (const spineItem of packageModel.spine) {
      const resource = spineItem.resource;
      if (resource.role !== 'content' || !spineItem.linear) continue;
      const file = zip.file(resource.canonicalHref);
      if (!file) continue;
      const document = parseDocument(await file.async('text'));
      const events = extractOrderedContentEvents(document, {
        documentHref: resource.canonicalHref, spineIndex: spineItem.spineIndex,
        resolveReference: reference => resolveEpubReference(resource.canonicalHref, reference)
      });
      documents.push({
        documentHref: resource.canonicalHref, spineIndex: spineItem.spineIndex,
        visibleText: visibleDocumentText(document), events
      });
    }
    const bookModel = buildEpubBookSectionModel({ packageModel, documents });
    return diagnosticView(packageModel, buildEpubParserDiagnostics({ packageModel, documents }), bookModel);
  } catch (error) {
    return Object.freeze({
      schemaVersion: '13.4A', status: 'failed', errorCode: errorCode(error),
      errorMessage: String(error?.message || error), package: null, navigationTargets: [],
      coverCandidates: [], documents: null, documentSummaries: [], reconstructionFailures: []
    });
  }
}

export function sanitizeEpubShadowDiagnostics(value) {
  if (!value || typeof value !== 'object') return null;
  return JSON.parse(JSON.stringify(value));
}
