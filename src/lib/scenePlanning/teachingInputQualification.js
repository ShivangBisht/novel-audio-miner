import { adaptReaderSpansForRendering } from '../analyzerReaderSpanAdapter.js';
import { resolveTeachingSelectionFromOffsets } from '../teachingSelectionResolver.js';

function invalid(reason, details = {}) {
  return Object.freeze({ valid: false, reason, ...details });
}

export function qualifyLogicalTeachingInput({
  logicalSelection,
  analyzerRecord
} = {}) {
  if (!logicalSelection?.valid) {
    return invalid('logical-selection-invalid', {
      logicalSelectionReason: logicalSelection?.reason || null
    });
  }

  const sentence = String(logicalSelection.sentence ?? '');
  if (!sentence) return invalid('logical-sentence-empty');
  if (!analyzerRecord || typeof analyzerRecord !== 'object') {
    return invalid('sentence-local-analysis-unavailable');
  }
  if (String(analyzerRecord.text ?? '') !== sentence) {
    return invalid('sentence-local-analysis-text-mismatch', {
      expected: sentence,
      received: String(analyzerRecord.text ?? '')
    });
  }

  const adapted = adaptReaderSpansForRendering(analyzerRecord, sentence);
  if (!adapted.valid) {
    return invalid('sentence-local-reader-spans-invalid', {
      errors: Object.freeze([...(adapted.errors || [])])
    });
  }

  const selection = resolveTeachingSelectionFromOffsets({
    sentence,
    analyzerSpans: adapted.words,
    start: logicalSelection.start,
    end: logicalSelection.end,
    visibleText: logicalSelection.surface
  });
  if (!selection.valid) {
    return invalid('formal-teaching-selection-invalid', {
      teachingReason: selection.reason,
      teachingSelection: selection
    });
  }

  const analysis = Object.freeze({
    words: adapted.words,
    candidates: Array.isArray(analyzerRecord.readerCandidates)
      ? analyzerRecord.readerCandidates
      : [],
    selection: analyzerRecord.readerSelection &&
      typeof analyzerRecord.readerSelection === 'object'
      ? analyzerRecord.readerSelection
      : {}
  });

  return Object.freeze({
    valid: true,
    selection,
    analysis,
    analyzerRecord
  });
}

export function logicalTeachingQualificationMessage(result) {
  const messages = {
    'logical-selection-invalid': 'The visible selection does not resolve to one logical sentence.',
    'logical-sentence-empty': 'The logical sentence is empty.',
    'sentence-local-analysis-unavailable': 'Sentence-local analyzer evidence is unavailable.',
    'sentence-local-analysis-text-mismatch': 'Sentence-local analyzer evidence belongs to different text.',
    'sentence-local-reader-spans-invalid': 'Sentence-local analyzer spans are invalid.',
    'formal-teaching-selection-invalid': 'The existing Teaching selection contract rejected this range.'
  };
  return messages[result?.reason] || 'The logical sentence cannot be prepared for Teaching.';
}
