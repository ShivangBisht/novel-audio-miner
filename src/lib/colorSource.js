/** Visible presentation ownership. JP Analyzer is the only linguistic source. */
export const COLOR_SOURCES = Object.freeze({
  JP_ANALYZER: 'jp-analyzer',
  PLAIN_TEXT: 'plain-text'
});
export const DEFAULT_COLOR_SOURCE = COLOR_SOURCES.JP_ANALYZER;
const VALID_COLOR_SOURCES = new Set(Object.values(COLOR_SOURCES));
export function normalizeColorSource(value) {
  return VALID_COLOR_SOURCES.has(value) ? value : DEFAULT_COLOR_SOURCE;
}
export function resolveVisibleColourSource({ requestedSource, analyzerReady, analyzerWords }) {
  const requested = normalizeColorSource(requestedSource);
  if (requested === COLOR_SOURCES.PLAIN_TEXT) return { requestedSource: requested, activeSource: COLOR_SOURCES.PLAIN_TEXT, words: [], neutralFallback: false, reason: 'plain-text-selected' };
  if (analyzerReady && Array.isArray(analyzerWords) && analyzerWords.length > 0) return { requestedSource: requested, activeSource: COLOR_SOURCES.JP_ANALYZER, words: analyzerWords, neutralFallback: false, reason: 'authoritative-reader-spans-ready' };
  return { requestedSource: requested, activeSource: COLOR_SOURCES.PLAIN_TEXT, words: [], neutralFallback: true, reason: 'analyzer-unavailable-or-invalid' };
}
