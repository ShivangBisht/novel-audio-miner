import JSZip from 'jszip';

const BANK_PATTERN = /^(term|term_meta|kanji|kanji_meta)_bank_(\d+)\.json$/i;
const UPDATE_KEYS = [
  'updateManifestUrl', 'indexUrl', 'updateUrl', 'downloadUrl', 'sourceUrl', 'source', 'url',
];

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function slug(value) {
  return text(value)
    .normalize('NFKC')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'dictionary';
}

function firstUrl(object) {
  for (const key of UPDATE_KEYS) {
    const value = text(object?.[key]);
    if (/^https?:\/\//i.test(value)) return value;
  }
  return null;
}

function findUrlDeep(value, depth = 0) {
  if (!value || depth > 3) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUrlDeep(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof value !== 'object') return null;
  const direct = firstUrl(value);
  if (direct) return direct;
  for (const child of Object.values(value)) {
    const found = findUrlDeep(child, depth + 1);
    if (found) return found;
  }
  return null;
}

function inferType(index, bankKinds) {
  const declared = text(index?.dictionaryType || index?.type).toLowerCase();
  if (['term', 'expression', 'name', 'grammar'].includes(declared)) return declared;
  const title = text(index?.title).toLowerCase();
  if (/name|proper|jmnedict/.test(title)) return 'name';
  if (/grammar|bunpro|文法|文型/.test(title)) return 'grammar';
  if (/expression|表現/.test(title)) return 'expression';
  if (bankKinds.has('term')) return 'term';
  throw new Error('Package has no supported term dictionary bank.');
}

function definitions(value) {
  if (!Array.isArray(value)) return value == null ? [] : [String(value)];
  return value;
}

function normalizeTermRow(row, metadata) {
  if (!Array.isArray(row) || row.length < 1) return null;
  const term = text(row[0]);
  if (!term) return null;
  const reading = text(row[1]);
  const definitionTags = text(row[2]).split(/\s+/).filter(Boolean);
  const rules = text(row[4]).split(/\s+/).filter(Boolean);
  const score = Number.isFinite(Number(row[5])) ? Number(row[5]) : 0;
  const glossary = definitions(row[6]);
  const sequence = row[7] == null ? null : String(row[7]);
  const termTags = text(row[8]).split(/\s+/).filter(Boolean);
  return {
    term,
    reading,
    tags: [...new Set([...definitionTags, ...termTags])],
    rules,
    score,
    sequence,
    definitions: glossary,
    nameType: metadata.dictionaryType === 'name' ? definitionTags.join(' ') : '',
    grammarType: metadata.dictionaryType === 'grammar' ? definitionTags.join(' ') : '',
    expressionType: metadata.dictionaryType === 'expression' ? definitionTags.join(' ') : '',
  };
}

async function sha256Hex(buffer) {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', buffer));
  return [...bytes].map(value => value.toString(16).padStart(2, '0')).join('');
}

export async function inspectDictionaryPackage(file, options = {}) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new TypeError('A ZIP File object is required.');
  }
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const indexFile = zip.file('index.json');
  if (!indexFile) throw new Error('Unsupported dictionary ZIP: index.json is missing.');
  const index = JSON.parse(await indexFile.async('string'));
  const banks = Object.values(zip.files)
    .filter(item => !item.dir && BANK_PATTERN.test(item.name))
    .map(item => ({ file: item, match: item.name.match(BANK_PATTERN) }))
    .sort((a, b) => Number(a.match[2]) - Number(b.match[2]));
  const bankKinds = new Set(banks.map(item => item.match[1].toLowerCase()));
  const title = text(index.title) || text(file.name).replace(/\.zip$/i, '');
  const stableIdentity = slug(options.stableIdentity || index.stableIdentity || title);
  const dictionaryType = options.dictionaryType || inferType(index, bankKinds);
  const revision = text(index.revision || index.version) || null;
  const sourceUrl = text(index.url || index.sourceUrl) || null;
  const updateManifestUrl = text(index.updateManifestUrl || index.indexUrl) || null;
  const downloadUrl = text(index.downloadUrl) || null;
  const termBanks = banks.filter(item => item.match[1].toLowerCase() === 'term');
  let entryCount = 0;
  for (const item of termBanks) {
    const rows = JSON.parse(await item.file.async('string'));
    if (!Array.isArray(rows)) throw new Error(`Invalid bank: ${item.file.name}`);
    entryCount += rows.filter(row => Array.isArray(row) && text(row[0])).length;
  }
  if (!entryCount) throw new Error('Dictionary contains no importable term entries.');
  return {
    file,
    zip,
    termBanks,
    index,
    metadata: {
      title,
      stableIdentity,
      dictionaryType,
      priority: Number.isFinite(Number(options.priority)) ? Number(options.priority) : 9999,
      revision,
      version: text(index.version) || null,
      sourceUrl,
      updateManifestUrl,
      downloadUrl,
      isUpdatable: index.isUpdatable === true,
      contentDigest: await sha256Hex(buffer),
      entryCount,
      format: 'yomitan-v3',
    },
  };
}

export async function* dictionaryEntryBatches(inspection, batchSize = 2000) {
  if (!Number.isInteger(batchSize) || batchSize < 1) throw new RangeError('batchSize must be positive.');
  let batch = [];
  for (const item of inspection.termBanks) {
    const rows = JSON.parse(await item.file.async('string'));
    for (const row of rows) {
      const entry = normalizeTermRow(row, inspection.metadata);
      if (!entry) continue;
      batch.push(entry);
      if (batch.length >= batchSize) {
        yield batch;
        batch = [];
      }
    }
  }
  if (batch.length) yield batch;
}

export function chooseDictionaryOperation(metadata, installedDictionaries = []) {
  const existing = installedDictionaries.find(item =>
    item.stableIdentity === metadata.stableIdentity,
  );
  if (!existing) {
    return {
      mode: 'install',
      dictionaryId: `${metadata.stableIdentity}-${Date.now()}`,
      existing: null,
    };
  }
  return { mode: 'update', dictionaryId: existing.dictionaryId, existing };
}
