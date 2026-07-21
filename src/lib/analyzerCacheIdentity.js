import { adaptReaderSpansForRendering } from './analyzerReaderSpanAdapter.js';

export const ANALYZER_CACHE_SCHEMA_VERSION = '3.1';
export const ANALYZER_CACHE_PREFIX = 'jp-analyzer-reader-cache-v3:';

export function normalizeAnalyzerMetadata(value) {
  const metadata = {
    analyzerVersion: String(value?.analyzerVersion ?? value?.version ?? '').trim(),
    readerSpanSchemaVersion: String(value?.readerSpanSchemaVersion ?? '').trim(),
    correctionRevision: String(value?.correctionRevision ?? '').trim()
  };
  return { ...metadata, valid: Object.values(metadata).every(Boolean) };
}

export function createAnalyzerCacheIdentity(sentenceHash, metadata) {
  const normalized = normalizeAnalyzerMetadata(metadata);
  if (!sentenceHash || !normalized.valid) return null;
  return [ANALYZER_CACHE_SCHEMA_VERSION, sentenceHash, normalized.analyzerVersion,
    normalized.readerSpanSchemaVersion, normalized.correctionRevision].join(':');
}

export function createAnalyzerCacheRecord(result, sentenceHash, metadata, now = new Date()) {
  const identity = createAnalyzerCacheIdentity(sentenceHash, metadata);
  if (!identity) throw new Error('Cannot cache without complete analyzer metadata.');
  return { ...result, cacheSchemaVersion: ANALYZER_CACHE_SCHEMA_VERSION,
    sentenceHash, analyzerVersion: metadata.analyzerVersion,
    readerSpanSchemaVersion: metadata.readerSpanSchemaVersion,
    correctionRevision: metadata.correctionRevision,
    cacheIdentity: identity, savedAt: now.toISOString(), lastAccessedAt: now.toISOString() };
}

export function validateAnalyzerCacheRecord(record, expectedText, sentenceHash, metadata) {
  const expectedIdentity = createAnalyzerCacheIdentity(sentenceHash, metadata);
  if (!record || !expectedIdentity) return { valid: false, reason: 'metadata-unavailable' };
  if (record.cacheSchemaVersion !== ANALYZER_CACHE_SCHEMA_VERSION) return { valid: false, reason: 'cache-schema-mismatch' };
  if (record.cacheIdentity !== expectedIdentity) return { valid: false, reason: 'cache-identity-mismatch' };
  if (record.text !== expectedText || record.sentenceHash !== sentenceHash) return { valid: false, reason: 'sentence-mismatch' };
  const validation = adaptReaderSpansForRendering(record, expectedText);
  if (!validation.valid) return { valid: false, reason: 'reader-spans-invalid', errors: validation.errors };
  return { valid: true, reason: 'valid' };
}
