function safeDecode(value) {
  try { return decodeURIComponent(value); }
  catch { return value; }
}

function splitReference(reference) {
  const raw = String(reference ?? '').trim();
  const hashIndex = raw.indexOf('#');
  const withoutFragment = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
  const fragment = hashIndex >= 0 ? safeDecode(raw.slice(hashIndex + 1)) : '';
  const queryIndex = withoutFragment.indexOf('?');
  return {
    path: queryIndex >= 0 ? withoutFragment.slice(0, queryIndex) : withoutFragment,
    query: queryIndex >= 0 ? withoutFragment.slice(queryIndex + 1) : '',
    fragment
  };
}

export function canonicalizeEpubPath(value) {
  const input = safeDecode(String(value ?? '').replace(/\\/g, '/'));
  const parts = [];
  for (const part of input.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') { parts.pop(); continue; }
    parts.push(part);
  }
  return parts.join('/');
}

export function epubDirname(value) {
  const path = canonicalizeEpubPath(value);
  const index = path.lastIndexOf('/');
  return index >= 0 ? path.slice(0, index) : '';
}

export function resolveEpubReference(baseDocument, reference) {
  const parsed = splitReference(reference);
  const baseDirectory = epubDirname(baseDocument);
  const documentHref = canonicalizeEpubPath(
    parsed.path ? `${baseDirectory}/${parsed.path}` : baseDocument
  );
  return {
    source: String(reference ?? ''),
    documentHref,
    fragmentId: parsed.fragment || null,
    query: parsed.query || null,
    canonicalReference: `${documentHref}${parsed.fragment ? `#${parsed.fragment}` : ''}`
  };
}

export function sameEpubDocument(left, right) {
  return canonicalizeEpubPath(splitReference(left).path) ===
    canonicalizeEpubPath(splitReference(right).path);
}
