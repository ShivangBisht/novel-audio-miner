import assert from 'node:assert/strict';
import {
  ANALYZER_METADATA_LEASE_MS,
  clearAnalyzerMetadataLease,
  getAnalyzerMetadataLease,
  setAnalyzerMetadataLease
} from '../src/lib/analyzerMetadataLease.js';

const metadata = {
  analyzerVersion: '11.9.0-correction-aware-cache-contract',
  readerSpanSchemaVersion: '1.1',
  correctionRevision: 'rev-a',
  valid: true
};

clearAnalyzerMetadataLease();
assert.equal(getAnalyzerMetadataLease(1000), null);
setAnalyzerMetadataLease(metadata, 1000);
assert.equal(getAnalyzerMetadataLease(1001).correctionRevision, 'rev-a');
assert.equal(
  getAnalyzerMetadataLease(1000 + ANALYZER_METADATA_LEASE_MS).analyzerVersion,
  metadata.analyzerVersion
);
assert.equal(getAnalyzerMetadataLease(1001 + ANALYZER_METADATA_LEASE_MS), null);
setAnalyzerMetadataLease({ ...metadata, valid: false }, 2000);
assert.equal(getAnalyzerMetadataLease(2000), null);
console.log('analyzer metadata lease tests passed');
