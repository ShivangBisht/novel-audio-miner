/**
 * Explicit visible-colour ownership for the reader.
 *
 * This module selects already-produced display ranges only. It does not
 * tokenize, merge, split, classify, repair, or otherwise infer language.
 */

export const COLOR_SOURCES = Object.freeze({
  JP_ANALYZER: 'jp-analyzer',
  LEGACY_KUROMOJI: 'legacy-kuromoji',
  PLAIN_TEXT: 'plain-text'
});

export const DEFAULT_COLOR_SOURCE = COLOR_SOURCES.JP_ANALYZER;

const VALID_COLOR_SOURCES = new Set(Object.values(COLOR_SOURCES));

export function normalizeColorSource(value) {
  return VALID_COLOR_SOURCES.has(value)
    ? value
    : DEFAULT_COLOR_SOURCE;
}

export function resolveVisibleColourSource({
  requestedSource,
  analyzerReady,
  analyzerWords,
  legacyWords
}) {
  const requested = normalizeColorSource(requestedSource);

  if (requested === COLOR_SOURCES.PLAIN_TEXT) {
    return {
      requestedSource: requested,
      activeSource: COLOR_SOURCES.PLAIN_TEXT,
      words: [],
      neutralFallback: false,
      reason: 'plain-text-selected'
    };
  }

  if (requested === COLOR_SOURCES.JP_ANALYZER) {
    if (analyzerReady && Array.isArray(analyzerWords) && analyzerWords.length > 0) {
      return {
        requestedSource: requested,
        activeSource: COLOR_SOURCES.JP_ANALYZER,
        words: analyzerWords,
        neutralFallback: false,
        reason: 'authoritative-reader-spans-ready'
      };
    }

    return {
      requestedSource: requested,
      activeSource: COLOR_SOURCES.PLAIN_TEXT,
      words: [],
      neutralFallback: true,
      reason: 'analyzer-unavailable-or-invalid'
    };
  }

  return {
    requestedSource: COLOR_SOURCES.LEGACY_KUROMOJI,
    activeSource: COLOR_SOURCES.LEGACY_KUROMOJI,
    words: Array.isArray(legacyWords) ? legacyWords : [],
    neutralFallback: false,
    reason: 'legacy-kuromoji-selected'
  };
}
