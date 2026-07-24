/**
 * Authoritative JP Analyzer selection and action ownership.
 *
 * This module never searches by surface text and never consults Kuromoji.
 * Browser selections are resolved only through exact analyzer source offsets.
 */

function cloneRanges(ranges) {
  return Array.isArray(ranges) ? ranges.map(range => ({ ...range })) : [];
}

export function createAnalyzerReaderContext(span, selectionStart, selectionEnd, rawSelectedText = '') {
  if (!span) return null;
  return {
    source: 'jp-analyzer',
    rawSelectedText: String(rawSelectedText ?? ''),
    selectionStart,
    selectionEnd,
    spanStart: span.start,
    spanEnd: span.end,
    surface: span.surface,
    displayRole: span.displayRole,
    headword: span.headword ?? null,
    knownLookupKey: span.knownLookupKey ?? null,
    frequencyLookupKey: span.frequencyLookupKey ?? null,
    countsForComprehension: span.countsForComprehension === true,
    showInNewWords: span.showInNewWords === true,
    eligibleForMining: span.eligibleForMining === true,
    grammarId: span.grammarId ?? null,
    hostLookupKey: span.hostLookupKey ?? null,
    correctionId: span.correctionId ?? null,
    correctionScope: span.correctionScope ?? null,
    correctionAction: span.correctionAction ?? null,
    grammarFocusRanges: cloneRanges(span.grammarFocusRanges)
  };
}

export function resolveAnalyzerReaderContextForOffsets(spans, selectionStart, selectionEnd, rawSelectedText = '') {
  if (!Number.isInteger(selectionStart) || !Number.isInteger(selectionEnd) || selectionStart < 0 || selectionEnd <= selectionStart) {
    return { valid: false, context: null, reason: 'invalid-selection-offsets' };
  }
  const containing = (spans || []).filter(span =>
    Number.isInteger(span?.start) && Number.isInteger(span?.end) &&
    span.start <= selectionStart && span.end >= selectionEnd
  );
  if (containing.length !== 1) {
    return {
      valid: false,
      context: null,
      reason: containing.length ? 'ambiguous-selection' : 'selection-crosses-analyzer-spans'
    };
  }
  return {
    valid: true,
    context: createAnalyzerReaderContext(containing[0], selectionStart, selectionEnd, rawSelectedText),
    reason: 'analyzer-span-selected'
  };
}

export function getAnalyzerSelectionActionState(context, { isKnown = () => false, isManualKnown = () => false } = {}) {
  if (!context) {
    return {
      canMarkKnown: false,
      canUndoKnown: false,
      knownFromAnki: false,
      canMine: false,
      knownKey: '',
      miningMessage: 'Analyzer structure is unavailable for this selection.',
      knownMessage: 'Select within one analyzer span.'
    };
  }
  const knownKey = String(context.knownLookupKey ?? '').trim();
  const manualKnown = Boolean(knownKey && isManualKnown(knownKey));
  const known = Boolean(knownKey && isKnown(knownKey));
  const canMine = context.eligibleForMining === true;
  return {
    canMarkKnown: Boolean(knownKey && !known),
    canUndoKnown: manualKnown,
    knownFromAnki: Boolean(known && !manualKnown),
    canMine,
    knownKey,
    miningMessage: canMine ? '' : 'This analyzer span is not eligible for mining.',
    knownMessage: knownKey
      ? ''
      : context.displayRole === 'learnable-grammar'
        ? 'This grammar span can be mined but cannot be marked as known vocabulary.'
        : 'This analyzer span has no vocabulary known-word identity.'
  };
}

/** Backwards-compatible Phase 5.2B exports. */
export function resolveAnalyzerMiningCandidateForOffsets(candidates, selectionStart, selectionEnd) {
  const result = resolveAnalyzerReaderContextForOffsets(candidates, selectionStart, selectionEnd);
  if (!result.valid || result.context?.eligibleForMining !== true) {
    const legacyReason = result.reason === 'ambiguous-selection'
      ? 'ambiguous-selection'
      : 'selection-not-minable';
    return { valid: false, candidate: null, reason: legacyReason };
  }
  const candidate = (candidates || []).find(item =>
    item.start === result.context.spanStart && item.end === result.context.spanEnd
  ) ?? null;
  return { valid: Boolean(candidate), candidate, reason: candidate ? 'analyzer-span-selected' : 'selection-not-minable' };
}

export function getAnalyzerMiningLookupKey(candidateOrContext) {
  if (!candidateOrContext) return '';
  const ordered = candidateOrContext.displayRole === 'learnable-grammar'
    ? [candidateOrContext.hostLookupKey, candidateOrContext.surface]
    : [candidateOrContext.knownLookupKey, candidateOrContext.headword, candidateOrContext.surface];
  return ordered.map(value => String(value ?? '').trim()).find(Boolean) ?? '';
}

export function createAnalyzerMiningContext(candidate, selectionStart, selectionEnd) {
  return createAnalyzerReaderContext(candidate, selectionStart, selectionEnd, candidate?.surface ?? '');
}
