import { canonicalizeEpubPath, resolveEpubReference } from './pathResolver.js';

export const EPUB_RESOURCE_ROLES = Object.freeze({
  CONTENT: 'content', NAVIGATION: 'navigation', COVER_IMAGE: 'cover-image',
  IMAGE: 'image', STYLESHEET: 'stylesheet', AUXILIARY: 'auxiliary', UNKNOWN: 'unknown'
});

function tokens(value) {
  return new Set(String(value ?? '').trim().split(/\s+/).filter(Boolean));
}

function classifyResource(item) {
  const properties = tokens(item.properties);
  const mediaType = String(item.mediaType ?? '').toLowerCase();
  if (properties.has('nav')) return EPUB_RESOURCE_ROLES.NAVIGATION;
  if (properties.has('cover-image')) return EPUB_RESOURCE_ROLES.COVER_IMAGE;
  if (mediaType.startsWith('image/')) return EPUB_RESOURCE_ROLES.IMAGE;
  if (/xhtml|html/.test(mediaType)) return EPUB_RESOURCE_ROLES.CONTENT;
  if (mediaType === 'text/css') return EPUB_RESOURCE_ROLES.STYLESHEET;
  if (mediaType) return EPUB_RESOURCE_ROLES.AUXILIARY;
  return EPUB_RESOURCE_ROLES.UNKNOWN;
}

export function buildEpubPackageModel({
  opfPath, manifestItems = [], spineItems = [], navigationEntries = [],
  metadata = {}, guideReferences = []
} = {}) {
  const canonicalOpfPath = canonicalizeEpubPath(opfPath);
  if (!canonicalOpfPath) throw new Error('EPUB package model requires an OPF path.');
  const manifest = new Map();
  for (const item of manifestItems) {
    const id = String(item?.id ?? '').trim();
    if (!id || manifest.has(id)) throw new Error(`Invalid or duplicate manifest id: ${id || '(empty)'}`);
    const resolved = resolveEpubReference(canonicalOpfPath, item.href);
    manifest.set(id, Object.freeze({
      id, href: String(item.href ?? ''), canonicalHref: resolved.documentHref,
      mediaType: String(item.mediaType ?? ''), properties: [...tokens(item.properties)],
      role: classifyResource(item)
    }));
  }
  const spine = spineItems.map((entry, spineIndex) => {
    const idref = String(entry?.idref ?? '').trim();
    const resource = manifest.get(idref);
    if (!resource) throw new Error(`Spine item does not resolve to manifest resource: ${idref}`);
    return Object.freeze({
      spineIndex, idref, resource, linear: String(entry?.linear ?? 'yes').toLowerCase() !== 'no',
      properties: [...tokens(entry?.properties)]
    });
  });
  const navigation = navigationEntries.map((entry, index) => {
    const baseDocument = entry?.sourceHref || canonicalOpfPath;
    const target = resolveEpubReference(baseDocument, entry?.href);
    return Object.freeze({
      index, title: String(entry?.title ?? '').trim(), depth: Number(entry?.depth ?? 0),
      sourceType: String(entry?.sourceType ?? 'unknown'), sourceHref: canonicalizeEpubPath(baseDocument),
      target
    });
  });
  const coverCandidates = [...manifest.values()].filter(item => item.role === EPUB_RESOURCE_ROLES.COVER_IMAGE);
  return Object.freeze({
    schemaVersion: '13.1', opfPath: canonicalOpfPath, metadata: Object.freeze({ ...metadata }),
    manifest, spine: Object.freeze(spine), navigation: Object.freeze(navigation),
    guideReferences: Object.freeze(guideReferences.map(item => ({ ...item }))),
    coverCandidates: Object.freeze(coverCandidates),
    diagnostics: Object.freeze({
      manifestCount: manifest.size, spineCount: spine.length, navigationCount: navigation.length,
      unresolvedNavigationCount: navigation.filter(item => !item.target.documentHref).length,
      nonLinearSpineCount: spine.filter(item => !item.linear).length,
      coverCandidateCount: coverCandidates.length
    })
  });
}
