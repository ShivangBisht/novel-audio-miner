/** Phase 5.1: pure, read-only learning projection from validated readerSpans. */
export function buildAnalyzerLearningModel(words, { isKnown = () => false, getFrequency = () => null } = {}) {
  const spans = Array.isArray(words) ? words : [];
  const comprehensionSpans = [];
  const newWords = [];
  const miningCandidates = [];
  const seenNewWords = new Set();
  const excludedByRole = {};
  let known = 0;

  for (const span of spans) {
    if (!span || span.analysisSource !== 'jp-analyzer-reader-spans') continue;
    if (span.countsForComprehension) {
      const key = requiredKey(span.knownLookupKey, span, 'countsForComprehension');
      const knownState = isKnown(key);
      if (knownState) known += 1;
      comprehensionSpans.push(copySpan(span, { key, known: knownState }));
    } else {
      const role = span.displayRole || 'missing';
      excludedByRole[role] = (excludedByRole[role] || 0) + 1;
    }

    if (span.showInNewWords) {
      const key = requiredKey(span.knownLookupKey, span, 'showInNewWords');
      if (!isKnown(key) && !seenNewWords.has(key)) {
        seenNewWords.add(key);
        const frequencyKey = optionalKey(span.frequencyLookupKey);
        newWords.push(copySpan(span, { key, frequencyKey, frequency: frequencyKey ? getFrequency(frequencyKey) : null }));
      }
    }

    if (span.eligibleForMining) {
      miningCandidates.push(copySpan(span));
    }
  }

  const total = comprehensionSpans.length;
  return {
    available: true,
    comprehension: { known, unknown: total - known, total, percent: total ? Math.round((known / total) * 100) : null, spans: comprehensionSpans, excludedByRole },
    newWords,
    miningCandidates
  };
}

function requiredKey(value, span, flag) {
  const key = optionalKey(value);
  if (!key) throw new Error(`${flag} span lacks analyzer knownLookupKey: ${span.surface || ''}`);
  return key;
}
function optionalKey(value) { return typeof value === 'string' && value.trim() ? value.trim() : ''; }
function copySpan(span, extra = {}) {
  return {
    start: span.start, end: span.end, surface: span.surface, displayRole: span.displayRole,
    headword: span.headword ?? null, knownLookupKey: span.knownLookupKey ?? null,
    frequencyLookupKey: span.frequencyLookupKey ?? null, grammarId: span.grammarId ?? null,
    hostLookupKey: span.hostLookupKey ?? null, correctionId: span.correctionId ?? null,
    correctionScope: span.correctionScope ?? null, correctionAction: span.correctionAction ?? null,
    grammarFocusRanges: Array.isArray(span.grammarFocusRanges) ? span.grammarFocusRanges.map(r => ({ ...r })) : [],
    ...extra
  };
}


/** Phase 5.2A: choose the production learning model without a hidden fallback. */
export function resolveLearningOwnership({
  requestedSource,
  analyzerValid,
  analyzerModel,
  legacyComprehension,
  legacyNewWords
}) {
  if (requestedSource === 'legacy-kuromoji') {
    return {
      source: 'legacy-kuromoji',
      available: true,
      comprehension: legacyComprehension,
      newWords: Array.isArray(legacyNewWords) ? legacyNewWords : []
    };
  }

  if (!analyzerValid || !analyzerModel?.available) {
    return {
      source: 'jp-analyzer',
      available: false,
      comprehension: null,
      newWords: []
    };
  }

  return {
    source: 'jp-analyzer',
    available: true,
    comprehension: analyzerModel.comprehension,
    newWords: analyzerModel.newWords.map(span => ({
      word: span.key,
      surface: span.surface,
      freq: span.frequency,
      analyzerSpan: span
    }))
  };
}
