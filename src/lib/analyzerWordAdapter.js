/**
 * Convert JP Analyzer compact resolved spans into the existing
 * Novel Audio Miner reader-word shape.
 *
 * Phase 3:
 * - Used only for hidden comparison.
 * - Does not replace visible Kuromoji words.
 */

const NAME_ROLES = new Set([
  'proper-name',
  'person-reference'
]);

const NUMERIC_ROLES = new Set([
  'numeral',
  'counter'
]);

const GRAMMAR_ROLES = new Set([
  'grammar',
  'particle',
  'auxiliary',
  'discourse'
]);

const NEUTRAL_ROLES = new Set([
  'punctuation',
  'symbol'
]);

const LEARNING_ROLES = new Set([
  'term',
  'predicate'
]);

export function adaptCompactAnalysisToReaderWords(
  compact,
  expectedText
) {
  const sourceText = String(expectedText ?? '');
  const errors = [];

  if (!compact || typeof compact !== 'object') {
    return {
      valid: false,
      errors: ['Compact analysis is not an object.'],
      words: []
    };
  }

  if (compact.text !== sourceText) {
    errors.push(
      'Analyzer source text differs from reader source text.'
    );
  }

  const spans = Array.isArray(compact.resolvedSpans)
    ? compact.resolvedSpans
    : [];

  if (!Array.isArray(compact.resolvedSpans)) {
    errors.push('resolvedSpans is missing.');
  }

  const words = [];
  let previousEnd = 0;

  spans.forEach((span, index) => {
    const rangeErrors = validateSpan(
      span,
      index,
      sourceText,
      previousEnd
    );

    errors.push(...rangeErrors);

    if (rangeErrors.length > 0) {
      return;
    }

    previousEnd = span.end;

    words.push(
      adaptResolvedSpan(span, sourceText)
    );
  });

  return {
    valid: errors.length === 0,
    errors,
    words,
    summary: summarizeReaderWords(words)
  };
}

function validateSpan(
  span,
  index,
  sourceText,
  previousEnd
) {
  const errors = [];
  const label = `resolvedSpans[${index}]`;

  if (!Number.isInteger(span?.start)) {
    errors.push(`${label}.start is not an integer.`);
  }

  if (!Number.isInteger(span?.end)) {
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
    errors.push(`${label} has an invalid range.`);
    return errors;
  }

  if (span.start < previousEnd) {
    errors.push(`${label} overlaps a previous span.`);
  }

  const expectedSurface = sourceText.slice(
    span.start,
    span.end
  );

  if (span.surface !== expectedSurface) {
    errors.push(
      `${label}.surface does not match source offsets.`
    );
  }

  return errors;
}

function adaptResolvedSpan(span, sourceText) {
  const role = normalizeRole(span.role);
  const classification = classifyRole(role);
  const surface = sourceText.slice(
    span.start,
    span.end
  );

  const headword =
    normalizeHeadword(span.headword) || surface;

  return {
    start: span.start,
    end: span.end,
    surface,
    dictionaryForm: headword,

    tokenCategory: classification.tokenCategory,
    colorRole: classification.colorRole,
    countsForComprehension:
      classification.countsForComprehension,
    showInNewWords:
      classification.showInNewWords,

    analyzerRole: role,
    grammarId:
      span.grammar_id ??
      span.grammarId ??
      null,
    confidence:
      typeof span.confidence === 'number'
        ? span.confidence
        : null,
    selectedCandidateId:
      span.selected_candidate_id ??
      span.selectedCandidateId ??
      null,
    sourceLayer:
      span.source_layer ??
      span.sourceLayer ??
      null,

    analysisSource: 'jp-analyzer'
  };
}

function normalizeRole(role) {
  return String(role ?? '')
    .trim()
    .toLowerCase() || 'unknown';
}

function normalizeHeadword(headword) {
  if (typeof headword !== 'string') {
    return '';
  }

  const normalized = headword.trim();

  if (
    !normalized ||
    normalized === '*' ||
    normalized === 'null'
  ) {
    return '';
  }

  return normalized;
}

function classifyRole(role) {
  if (NAME_ROLES.has(role)) {
    return {
      tokenCategory: 'proper-noun',
      colorRole: 'name',
      countsForComprehension: false,
      showInNewWords: false
    };
  }

  if (NUMERIC_ROLES.has(role)) {
    return {
      tokenCategory: 'numeric',
      colorRole: 'numeric',
      countsForComprehension: false,
      showInNewWords: false
    };
  }

  if (GRAMMAR_ROLES.has(role)) {
    return {
      tokenCategory: 'grammar',
      colorRole: 'grammar',
      countsForComprehension: false,
      showInNewWords: false
    };
  }

  if (NEUTRAL_ROLES.has(role)) {
    return {
      tokenCategory: 'ignored',
      colorRole: 'neutral',
      countsForComprehension: false,
      showInNewWords: false
    };
  }

  if (LEARNING_ROLES.has(role)) {
    return {
      tokenCategory: 'learning',
      colorRole: 'learning',
      countsForComprehension: true,
      showInNewWords: true
    };
  }

  return {
    tokenCategory: 'unresolved',
    colorRole: 'unknown',
    countsForComprehension: false,
    showInNewWords: false
  };
}

function summarizeReaderWords(words) {
  const summary = {
    total: words.length,
    learning: 0,
    names: 0,
    grammar: 0,
    numeric: 0,
    neutral: 0,
    unresolved: 0,
    comprehension: 0,
    newWords: 0
  };

  for (const word of words) {
    if (word.tokenCategory === 'learning') {
      summary.learning += 1;
    } else if (
      word.tokenCategory === 'proper-noun'
    ) {
      summary.names += 1;
    } else if (
      word.tokenCategory === 'grammar'
    ) {
      summary.grammar += 1;
    } else if (
      word.tokenCategory === 'numeric'
    ) {
      summary.numeric += 1;
    } else if (
      word.tokenCategory === 'ignored'
    ) {
      summary.neutral += 1;
    } else {
      summary.unresolved += 1;
    }

    if (word.countsForComprehension) {
      summary.comprehension += 1;
    }

    if (word.showInNewWords) {
      summary.newWords += 1;
    }
  }

  return summary;
}