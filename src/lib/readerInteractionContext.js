/**
 * Alpha 2 canonical Reader interaction identity.
 *
 * The current validated readerSpans array is the only linguistic authority.
 * References from New Words or other views are resolved back to that array
 * before an interaction context is created. This module never searches by
 * surface text and never infers missing linguistic fields.
 */
export const READER_INTERACTION_SCHEMA = '1.0';

function cloneRanges(ranges) {
  return Array.isArray(ranges) ? ranges.map(range => ({ ...range })) : [];
}

function optionalString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function createReaderSpanReference(span) {
  if (!span || !Number.isInteger(span.start) || !Number.isInteger(span.end)) return null;
  return Object.freeze({
    start: span.start,
    end: span.end,
    surface: String(span.surface ?? ''),
    correctionId: optionalString(span.correctionId)
  });
}

export function createCanonicalReaderInteraction(
  span,
  { selectionStart = span?.start, selectionEnd = span?.end, rawSelectedText = '', entryPoint = 'programmatic', sceneIdentity = null, analyzerIdentity = null } = {}
) {
  if (!span || span.analysisSource !== 'jp-analyzer-reader-spans') return null;
  if (!Number.isInteger(span.start) || !Number.isInteger(span.end) || span.end <= span.start) return null;
  if (!Number.isInteger(selectionStart) || !Number.isInteger(selectionEnd)) return null;
  return Object.freeze({
    schemaVersion: READER_INTERACTION_SCHEMA,
    source: 'jp-analyzer',
    entryPoint,
    sceneIdentity,
    analyzerIdentity,
    rawSelectedText: String(rawSelectedText ?? ''),
    selectionStart,
    selectionEnd,
    spanStart: span.start,
    spanEnd: span.end,
    surface: String(span.surface ?? ''),
    displayRole: span.displayRole,
    headword: optionalString(span.headword),
    knownLookupKey: optionalString(span.knownLookupKey),
    frequencyLookupKey: optionalString(span.frequencyLookupKey),
    countsForComprehension: span.countsForComprehension === true,
    showInNewWords: span.showInNewWords === true,
    eligibleForMining: span.eligibleForMining === true,
    grammarId: optionalString(span.grammarId),
    hostLookupKey: optionalString(span.hostLookupKey),
    correctionId: optionalString(span.correctionId),
    correctionScope: optionalString(span.correctionScope),
    correctionAction: optionalString(span.correctionAction),
    correctionRevision: optionalString(span.correctionRevision),
    projectionStatus: optionalString(span.projectionStatus),
    sourceLayer: optionalString(span.sourceLayer),
    sourceSpanIds: Object.freeze(Array.isArray(span.sourceSpanIds) ? [...span.sourceSpanIds] : []),
    grammarFocusRanges: Object.freeze(cloneRanges(span.grammarFocusRanges).map(Object.freeze))
  });
}

export function resolveCanonicalReaderInteractionForOffsets(
  spans,
  selectionStart,
  selectionEnd,
  rawSelectedText = '',
  options = {}
) {
  if (!Number.isInteger(selectionStart) || !Number.isInteger(selectionEnd) || selectionStart < 0 || selectionEnd <= selectionStart) {
    return Object.freeze({ valid: false, context: null, reason: 'invalid-selection-offsets' });
  }
  const containing = (spans || []).filter(span =>
    span?.analysisSource === 'jp-analyzer-reader-spans' &&
    Number.isInteger(span.start) && Number.isInteger(span.end) &&
    span.start <= selectionStart && span.end >= selectionEnd
  );
  if (containing.length !== 1) {
    return Object.freeze({
      valid: false,
      context: null,
      reason: containing.length ? 'ambiguous-selection' : 'selection-crosses-analyzer-spans'
    });
  }
  const context = createCanonicalReaderInteraction(containing[0], {
    ...options,
    selectionStart,
    selectionEnd,
    rawSelectedText
  });
  return Object.freeze({ valid: Boolean(context), context, reason: context ? 'analyzer-span-selected' : 'invalid-authoritative-span' });
}

export function resolveCanonicalReaderInteractionFromReference(spans, reference, options = {}) {
  if (!reference || !Number.isInteger(reference.start) || !Number.isInteger(reference.end)) {
    return Object.freeze({ valid: false, context: null, reason: 'invalid-span-reference' });
  }
  const matches = (spans || []).filter(span =>
    span?.analysisSource === 'jp-analyzer-reader-spans' &&
    span.start === reference.start &&
    span.end === reference.end
  );
  if (matches.length !== 1) {
    return Object.freeze({ valid: false, context: null, reason: matches.length ? 'ambiguous-span-reference' : 'stale-span-reference' });
  }
  const span = matches[0];
  if (String(reference.surface ?? '') !== String(span.surface ?? '')) {
    return Object.freeze({ valid: false, context: null, reason: 'stale-span-reference' });
  }
  if (reference.correctionId && reference.correctionId !== span.correctionId) {
    return Object.freeze({ valid: false, context: null, reason: 'stale-correction-reference' });
  }
  const context = createCanonicalReaderInteraction(span, {
    ...options,
    selectionStart: span.start,
    selectionEnd: span.end,
    rawSelectedText: options.rawSelectedText ?? span.surface
  });
  return Object.freeze({ valid: Boolean(context), context, reason: context ? 'authoritative-span-reference-resolved' : 'invalid-authoritative-span' });
}

export function sameCanonicalReaderInteraction(left, right) {
  if (!left || !right) return false;
  const fields = [
    'schemaVersion', 'spanStart', 'spanEnd', 'surface', 'displayRole', 'headword',
    'knownLookupKey', 'frequencyLookupKey', 'countsForComprehension',
    'showInNewWords', 'eligibleForMining', 'grammarId', 'hostLookupKey',
    'correctionId', 'correctionScope', 'correctionAction', 'correctionRevision'
  ];
  return fields.every(field => left[field] === right[field]);
}
