/**
 * Compare Kuromoji-derived reader words with adapted
 * JP Analyzer words.
 *
 * This is diagnostic only and does not modify rendering.
 */

export function compareReaderWordModels({
  text,
  kuromojiWords,
  analyzerWords
}) {
  const sourceText = String(text ?? '');

  const legacyRanges = createKuromojiRanges(
    sourceText,
    kuromojiWords ?? []
  );

  const analyzerRanges = normalizeAnalyzerRanges(
    sourceText,
    analyzerWords ?? []
  );

  const legacyByRange = indexByRange(legacyRanges);
  const analyzerByRange = indexByRange(analyzerRanges);

  const exactRangeMatches = [];
  const categoryDifferences = [];
  const headwordDifferences = [];
  const kuromojiOnly = [];
  const analyzerOnly = [];

  for (const [key, legacy] of legacyByRange) {
    const analyzer = analyzerByRange.get(key);

    if (!analyzer) {
      kuromojiOnly.push(toSafeComparisonRow(legacy));
      continue;
    }

    exactRangeMatches.push(key);

    if (
      normalizeCategory(legacy) !==
      normalizeCategory(analyzer)
    ) {
      categoryDifferences.push({
        start: legacy.start,
        end: legacy.end,
        surface: legacy.surface,
        kuromojiCategory:
          normalizeCategory(legacy),
        analyzerCategory:
          normalizeCategory(analyzer),
        analyzerRole:
          analyzer.analyzerRole ?? null
      });
    }

    if (
      normalizeLookupKey(legacy) !==
      normalizeLookupKey(analyzer)
    ) {
      headwordDifferences.push({
        start: legacy.start,
        end: legacy.end,
        surface: legacy.surface,
        kuromojiKey:
          normalizeLookupKey(legacy),
        analyzerKey:
          normalizeLookupKey(analyzer)
      });
    }
  }

  for (const [key, analyzer] of analyzerByRange) {
    if (!legacyByRange.has(key)) {
      analyzerOnly.push(toSafeComparisonRow(analyzer));
    }
  }

  const kuromojiSummary =
    summarizeModel(legacyRanges);
  const analyzerSummary =
    summarizeModel(analyzerRanges);

  const exactMatchCount = exactRangeMatches.length;
  const unionRangeCount = new Set([
    ...legacyByRange.keys(),
    ...analyzerByRange.keys()
  ]).size;

  return {
    sourceTextLength: sourceText.length,

    kuromoji: kuromojiSummary,
    analyzer: analyzerSummary,

    exactRangeMatchCount: exactMatchCount,
    rangeUnionCount: unionRangeCount,
    exactRangeAgreement:
      unionRangeCount > 0
        ? exactMatchCount / unionRangeCount
        : 1,

    categoryDifferenceCount:
      categoryDifferences.length,
    headwordDifferenceCount:
      headwordDifferences.length,
    kuromojiOnlyCount: kuromojiOnly.length,
    analyzerOnlyCount: analyzerOnly.length,

    categoryDifferences,
    headwordDifferences,
    kuromojiOnly,
    analyzerOnly,

    kuromojiRangeErrors:
      legacyRanges.filter(
        (range) => range.rangeError
      ).length,

    analyzerRangeErrors:
      analyzerRanges.filter(
        (range) => range.rangeError
      ).length
  };
}

function createKuromojiRanges(text, words) {
  const ranges = [];
  const occupied = new Array(text.length).fill(false);

  for (const word of words) {
    const surface = String(word?.surface ?? '');

    if (!surface) {
      continue;
    }

    const preferredStart =
      Number.isInteger(word?.start)
        ? word.start
        : null;

    if (
      preferredStart != null &&
      text.slice(
        preferredStart,
        preferredStart + surface.length
      ) === surface &&
      !hasOccupiedRange(
        occupied,
        preferredStart,
        preferredStart + surface.length
      )
    ) {
      const end = preferredStart + surface.length;

      occupyRange(occupied, preferredStart, end);

      ranges.push({
        ...word,
        start: preferredStart,
        end,
        surface,
        analysisSource: 'kuromoji'
      });

      continue;
    }

    let searchFrom = 0;
    let matchedStart = -1;

    while (searchFrom < text.length) {
      const candidate = text.indexOf(
        surface,
        searchFrom
      );

      if (candidate < 0) {
        break;
      }

      const candidateEnd =
        candidate + surface.length;

      if (
        !hasOccupiedRange(
          occupied,
          candidate,
          candidateEnd
        )
      ) {
        matchedStart = candidate;
        break;
      }

      searchFrom = candidate + 1;
    }

    if (matchedStart < 0) {
      ranges.push({
        ...word,
        start: null,
        end: null,
        surface,
        analysisSource: 'kuromoji',
        rangeError: 'surface-not-found'
      });

      continue;
    }

    const end = matchedStart + surface.length;

    occupyRange(occupied, matchedStart, end);

    ranges.push({
      ...word,
      start: matchedStart,
      end,
      surface,
      analysisSource: 'kuromoji'
    });
  }

  return ranges.sort(compareRanges);
}

function normalizeAnalyzerRanges(text, words) {
  return words
    .map((word) => {
      const start = word?.start;
      const end = word?.end;
      const surface = String(word?.surface ?? '');

      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < 0 ||
        end <= start ||
        end > text.length ||
        text.slice(start, end) !== surface
      ) {
        return {
          ...word,
          rangeError: 'invalid-analyzer-range'
        };
      }

      return {
        ...word,
        analysisSource: 'jp-analyzer'
      };
    })
    .sort(compareRanges);
}

function hasOccupiedRange(occupied, start, end) {
  for (let index = start; index < end; index += 1) {
    if (occupied[index]) {
      return true;
    }
  }

  return false;
}

function occupyRange(occupied, start, end) {
  for (let index = start; index < end; index += 1) {
    occupied[index] = true;
  }
}

function indexByRange(ranges) {
  const index = new Map();

  for (const range of ranges) {
    if (
      range.rangeError ||
      !Number.isInteger(range.start) ||
      !Number.isInteger(range.end)
    ) {
      continue;
    }

    index.set(
      `${range.start}:${range.end}`,
      range
    );
  }

  return index;
}

function normalizeCategory(word) {
  if (
    word?.tokenCategory === 'proper-noun' ||
    word?.colorRole === 'name'
  ) {
    return 'name';
  }

  if (
    word?.tokenCategory === 'numeric' ||
    word?.colorRole === 'numeric'
  ) {
    return 'numeric';
  }

  if (
    word?.tokenCategory === 'grammar' ||
    word?.tokenCategory === 'ignored' ||
    word?.colorRole === 'grammar'
  ) {
    return 'grammar';
  }

  if (
    word?.tokenCategory === 'learning' ||
    word?.colorRole === 'learning'
  ) {
    return 'learning';
  }

  if (
    word?.colorRole === 'neutral'
  ) {
    return 'neutral';
  }

  return 'unresolved';
}

function normalizeLookupKey(word) {
  return String(
    word?.dictionaryForm ??
      word?.headword ??
      word?.surface ??
      ''
  ).trim();
}

function summarizeModel(ranges) {
  const summary = {
    spans: ranges.length,
    learning: 0,
    names: 0,
    grammar: 0,
    numeric: 0,
    neutral: 0,
    unresolved: 0,
    comprehension: 0,
    newWords: 0,
    rangeErrors: 0
  };

  for (const range of ranges) {
    if (range.rangeError) {
      summary.rangeErrors += 1;
    }

    const category = normalizeCategory(range);

    if (category in summary) {
      summary[category] += 1;
    }

    if (range.countsForComprehension) {
      summary.comprehension += 1;
    }

    if (range.showInNewWords) {
      summary.newWords += 1;
    }
  }

  return summary;
}

function toSafeComparisonRow(word) {
  return {
    start: word?.start ?? null,
    end: word?.end ?? null,
    surface: word?.surface ?? '',
    dictionaryForm:
      normalizeLookupKey(word),
    category: normalizeCategory(word),
    analyzerRole:
      word?.analyzerRole ?? null,
    confidence:
      word?.confidence ?? null,
    rangeError:
      word?.rangeError ?? null
  };
}

function compareRanges(left, right) {
  const leftStart =
    Number.isInteger(left?.start)
      ? left.start
      : Number.MAX_SAFE_INTEGER;

  const rightStart =
    Number.isInteger(right?.start)
      ? right.start
      : Number.MAX_SAFE_INTEGER;

  if (leftStart !== rightStart) {
    return leftStart - rightStart;
  }

  return (
    (right?.end ?? 0) -
    (left?.end ?? 0)
  );
}