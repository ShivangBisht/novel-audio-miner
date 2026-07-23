/** Phase 5.2B: exact analyzer-span mining selection policy. */
export function resolveAnalyzerMiningCandidateForOffsets(candidates, selectionStart, selectionEnd) {
  if (!Number.isInteger(selectionStart) || !Number.isInteger(selectionEnd) || selectionStart < 0 || selectionEnd <= selectionStart) {
    return { valid: false, candidate: null, reason: 'invalid-selection-offsets' };
  }
  const containing = (candidates || []).filter(candidate =>
    candidate?.eligibleForMining === true &&
    Number.isInteger(candidate.start) && Number.isInteger(candidate.end) &&
    candidate.start <= selectionStart && candidate.end >= selectionEnd
  );
  if (containing.length !== 1) {
    return { valid: false, candidate: null, reason: containing.length ? 'ambiguous-selection' : 'selection-not-minable' };
  }
  return { valid: true, candidate: containing[0], reason: 'analyzer-span-selected' };
}

export function getAnalyzerMiningLookupKey(candidate) {
  if (!candidate) return '';
  const role = candidate.displayRole;
  const ordered = role === 'learnable-grammar'
    ? [candidate.hostLookupKey, candidate.surface]
    : [candidate.knownLookupKey, candidate.headword, candidate.surface];
  return ordered.map(value => String(value ?? '').trim()).find(Boolean) ?? '';
}

export function createAnalyzerMiningContext(candidate, selectionStart, selectionEnd) {
  if (!candidate) return null;
  return {
    selectionStart, selectionEnd,
    spanStart: candidate.start, spanEnd: candidate.end,
    surface: candidate.surface, displayRole: candidate.displayRole,
    headword: candidate.headword ?? null,
    knownLookupKey: candidate.knownLookupKey ?? null,
    frequencyLookupKey: candidate.frequencyLookupKey ?? null,
    grammarId: candidate.grammarId ?? null,
    hostLookupKey: candidate.hostLookupKey ?? null,
    correctionId: candidate.correctionId ?? null,
    correctionScope: candidate.correctionScope ?? null,
    correctionAction: candidate.correctionAction ?? null,
    grammarFocusRanges: Array.isArray(candidate.grammarFocusRanges) ? candidate.grammarFocusRanges.map(range => ({ ...range })) : []
  };
}
