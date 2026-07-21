/**
 * Thin adapter for JP Analyzer's authoritative readerSpans contract.
 *
 * This module performs validation and mechanical field preservation only.
 * It must not infer boundaries, repair offsets, derive headwords, or
 * reclassify linguistic roles.
 */

export const SUPPORTED_READER_SPAN_SCHEMAS = new Set(['1.1']);

export const SUPPORTED_DISPLAY_ROLES = new Set([
  'lexical',
  'lexical-compound',
  'learnable-grammar',
  'function',
  'name',
  'punctuation',
  'unresolved'
]);

export function adaptReaderSpansForRendering(compact, expectedText) {
  const sourceText = String(expectedText ?? '');
  const errors = [];

  if (!compact || typeof compact !== 'object') {
    return invalidResult(['Compact analysis is not an object.']);
  }

  if (compact.text !== sourceText) {
    errors.push('Analyzer source text differs from reader source text.');
  }

  const schemaVersion = String(
    compact.readerSpanSchemaVersion ?? ''
  ).trim();

  if (!SUPPORTED_READER_SPAN_SCHEMAS.has(schemaVersion)) {
    errors.push(
      `Unsupported reader span schema: ${schemaVersion || 'missing'}.`
    );
  }

  if (!Array.isArray(compact.readerSpans)) {
    errors.push('readerSpans is missing or is not an array.');
    return invalidResult(errors, schemaVersion);
  }

  if (sourceText.length > 0 && compact.readerSpans.length === 0) {
    errors.push('readerSpans is empty for non-empty source text.');
  }

  const words = [];
  let previousEnd = 0;

  compact.readerSpans.forEach((span, index) => {
    const spanErrors = validateReaderSpan(
      span,
      index,
      sourceText,
      previousEnd
    );

    errors.push(...spanErrors);

    if (spanErrors.length === 0) {
      words.push(preserveReaderSpan(span));
      previousEnd = span.end;
    }
  });

  if (compact.readerSpans.length > 0) {
    const first = compact.readerSpans[0];
    const last = compact.readerSpans[compact.readerSpans.length - 1];

    if (first?.start !== 0) {
      errors.push('readerSpans does not start at source offset 0.');
    }

    if (last?.end !== sourceText.length) {
      errors.push('readerSpans does not end at the source text length.');
    }
  }

  const reconstructed = compact.readerSpans
    .map((span) => String(span?.surface ?? ''))
    .join('');

  if (reconstructed !== sourceText) {
    errors.push('readerSpans surfaces do not reconstruct the source text.');
  }

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    words: valid ? words : [],
    schemaVersion,
    summary: summarizeReaderSpans(valid ? words : []),
    correctionAware: valid && words.some(
      (word) => word.projectionStatus === 'user-corrected'
    )
  };
}

function invalidResult(errors, schemaVersion = '') {
  return {
    valid: false,
    errors,
    words: [],
    schemaVersion,
    summary: summarizeReaderSpans([]),
    correctionAware: false
  };
}

function validateReaderSpan(span, index, sourceText, previousEnd) {
  const errors = [];
  const label = `readerSpans[${index}]`;

  if (!span || typeof span !== 'object') {
    return [`${label} is not an object.`];
  }

  if (!Number.isInteger(span.start)) {
    errors.push(`${label}.start is not an integer.`);
  }

  if (!Number.isInteger(span.end)) {
    errors.push(`${label}.end is not an integer.`);
  }

  if (errors.length > 0) {
    return errors;
  }

  if (
    span.start < 0 ||
    span.end <= span.start ||
    span.end > sourceText.length
  ) {
    errors.push(`${label} has an invalid source range.`);
    return errors;
  }

  if (span.start !== previousEnd) {
    errors.push(
      span.start < previousEnd
        ? `${label} overlaps the previous reader span.`
        : `${label} leaves a gap after the previous reader span.`
    );
  }

  const expectedSurface = sourceText.slice(span.start, span.end);

  if (span.surface !== expectedSurface) {
    errors.push(`${label}.surface does not match its source offsets.`);
  }

  if (!SUPPORTED_DISPLAY_ROLES.has(span.displayRole)) {
    errors.push(
      `${label}.displayRole is unsupported: ${String(span.displayRole)}.`
    );
  }

  for (const field of [
    'countsForComprehension',
    'showInNewWords',
    'eligibleForMining'
  ]) {
    if (typeof span[field] !== 'boolean') {
      errors.push(`${label}.${field} is not a boolean.`);
    }
  }

  if (
    ['lexical', 'lexical-compound'].includes(span.displayRole) &&
    (!isOptionalString(span.knownLookupKey) ||
      !isOptionalString(span.frequencyLookupKey))
  ) {
    errors.push(`${label} has invalid analyzer lookup-key fields.`);
  }

  return errors;
}

function isOptionalString(value) {
  return value == null || typeof value === 'string';
}

function preserveReaderSpan(span) {
  return {
    ...span,
    start: span.start,
    end: span.end,
    surface: span.surface,
    displayRole: span.displayRole,
    lexicalType: span.lexicalType ?? null,
    colorPolicy: span.colorPolicy ?? null,
    unknownColorPolicy: span.unknownColorPolicy ?? null,
    knownLookupKey: span.knownLookupKey ?? null,
    frequencyLookupKey: span.frequencyLookupKey ?? null,
    headword: span.headword ?? null,
    grammarId: span.grammarId ?? null,
    confidence:
      typeof span.confidence === 'number' ? span.confidence : null,
    countsForComprehension: span.countsForComprehension,
    showInNewWords: span.showInNewWords,
    eligibleForMining: span.eligibleForMining,
    sourceSpanIds: Array.isArray(span.sourceSpanIds)
      ? [...span.sourceSpanIds]
      : [],
    sourceLayer: span.sourceLayer ?? null,
    projectionStatus: span.projectionStatus ?? null,
    correctionId: span.correctionId ?? null,
    correctionScope: span.correctionScope ?? null,
    correctionAction: span.correctionAction ?? null,
    hostLookupKey: span.hostLookupKey ?? null,
    grammarFocusRanges: Array.isArray(span.grammarFocusRanges)
      ? span.grammarFocusRanges.map((range) => ({ ...range }))
      : [],

    // Mechanical compatibility aliases only. No missing key is derived.
    dictionaryForm: span.knownLookupKey ?? '',
    analysisSource: 'jp-analyzer-reader-spans',
    authoritativeRange: true
  };
}

function summarizeReaderSpans(words) {
  const summary = {
    total: words.length,
    lexical: 0,
    compounds: 0,
    grammar: 0,
    functions: 0,
    names: 0,
    punctuation: 0,
    unresolved: 0,
    corrected: 0,
    comprehension: 0,
    newWords: 0,
    miningEligible: 0
  };

  for (const word of words) {
    if (word.displayRole === 'lexical') summary.lexical += 1;
    else if (word.displayRole === 'lexical-compound') summary.compounds += 1;
    else if (word.displayRole === 'learnable-grammar') summary.grammar += 1;
    else if (word.displayRole === 'function') summary.functions += 1;
    else if (word.displayRole === 'name') summary.names += 1;
    else if (word.displayRole === 'punctuation') summary.punctuation += 1;
    else if (word.displayRole === 'unresolved') summary.unresolved += 1;

    if (word.projectionStatus === 'user-corrected') summary.corrected += 1;
    if (word.countsForComprehension) summary.comprehension += 1;
    if (word.showInNewWords) summary.newWords += 1;
    if (word.eligibleForMining) summary.miningEligible += 1;
  }

  return summary;
}
