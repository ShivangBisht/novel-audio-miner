/**
 * Action policy over the Alpha 2 canonical Reader interaction identity.
 * Canonical identity creation and reference resolution live in
 * readerInteractionContext.js; this module retains compatibility exports.
 */
import {
  createCanonicalReaderInteraction,
  resolveCanonicalReaderInteractionForOffsets
} from './readerInteractionContext.js';

function cloneRanges(ranges) {
  return Array.isArray(ranges) ? ranges.map(range => ({ ...range })) : [];
}

function createLegacyAnalyzerReaderContext(span, selectionStart, selectionEnd, rawSelectedText = '') {
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

export function createAnalyzerReaderContext(span, selectionStart, selectionEnd, rawSelectedText = '') {
  if (span?.analysisSource === 'jp-analyzer-reader-spans') {
    return createCanonicalReaderInteraction(span, {
      selectionStart,
      selectionEnd,
      rawSelectedText,
      entryPoint: 'compatibility'
    });
  }
  return createLegacyAnalyzerReaderContext(span, selectionStart, selectionEnd, rawSelectedText);
}

function resolveLegacyAnalyzerReaderContextForOffsets(spans, selectionStart, selectionEnd, rawSelectedText = '') {
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
    context: createLegacyAnalyzerReaderContext(
      containing[0],
      selectionStart,
      selectionEnd,
      rawSelectedText
    ),
    reason: 'analyzer-span-selected'
  };
}

export function resolveAnalyzerReaderContextForOffsets(spans, selectionStart, selectionEnd, rawSelectedText = '') {
  const values = Array.isArray(spans) ? spans : [];
  const authoritative = values.length > 0 && values.every(
    span => span?.analysisSource === 'jp-analyzer-reader-spans'
  );
  if (authoritative) {
    return resolveCanonicalReaderInteractionForOffsets(
      values,
      selectionStart,
      selectionEnd,
      rawSelectedText,
      { entryPoint: 'dom-selection' }
    );
  }
  return resolveLegacyAnalyzerReaderContextForOffsets(
    values,
    selectionStart,
    selectionEnd,
    rawSelectedText
  );
}

export function getAnalyzerSelectionActionState(context, { isKnown = () => false, isManualKnown = () => false } = {}) {
  if (!context) {
    return {
      canMarkKnown: false, canUndoKnown: false, knownFromAnki: false, canMine: false,
      knownKey: '', miningMessage: 'Analyzer structure is unavailable for this selection.',
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
    knownMessage: knownKey ? '' : context.displayRole === 'learnable-grammar'
      ? 'This grammar span can be mined but cannot be marked as known vocabulary.'
      : 'This analyzer span has no vocabulary known-word identity.'
  };
}

/** Backwards-compatible Phase 5.2B exports. */
export function resolveAnalyzerMiningCandidateForOffsets(candidates, selectionStart, selectionEnd) {
  if (!Number.isInteger(selectionStart) || !Number.isInteger(selectionEnd) || selectionStart < 0 || selectionEnd <= selectionStart) {
    return { valid: false, candidate: null, reason: 'selection-not-minable' };
  }
  const containing = (candidates || []).filter(candidate =>
    Number.isInteger(candidate?.start) && Number.isInteger(candidate?.end) &&
    candidate.start <= selectionStart && candidate.end >= selectionEnd &&
    candidate.eligibleForMining === true
  );
  if (containing.length !== 1) {
    return {
      valid: false,
      candidate: null,
      reason: containing.length > 1 ? 'ambiguous-selection' : 'selection-not-minable'
    };
  }
  return { valid: true, candidate: containing[0], reason: 'analyzer-span-selected' };
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
