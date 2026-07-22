export const ANALYZER_METADATA_LEASE_MS = 5000;

let activeLease = null;

export function setAnalyzerMetadataLease(metadata, now = Date.now()) {
  if (!metadata?.valid) {
    activeLease = null;
    return null;
  }
  activeLease = {
    analyzerVersion: metadata.analyzerVersion,
    readerSpanSchemaVersion: metadata.readerSpanSchemaVersion,
    correctionRevision: metadata.correctionRevision,
    valid: true,
    verifiedAt: now
  };
  return { ...activeLease };
}

export function getAnalyzerMetadataLease(now = Date.now()) {
  if (!activeLease) return null;
  if (now - activeLease.verifiedAt > ANALYZER_METADATA_LEASE_MS) {
    activeLease = null;
    return null;
  }
  return { ...activeLease };
}

export function clearAnalyzerMetadataLease() {
  activeLease = null;
}
