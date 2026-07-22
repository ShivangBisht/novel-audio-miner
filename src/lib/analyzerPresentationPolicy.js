/**
 * Presentation-only policy for authoritative JP Analyzer reader spans.
 * Never changes analyzer boundaries, roles, lookup keys, or metadata.
 */
const LEXICAL_ROLES = new Set(['lexical', 'lexical-compound']);

export function resolveAnalyzerPresentationClass(span, {
  isKnown = () => false,
  getFrequencyCategory = () => null
} = {}) {
  if (!span || span.analysisSource !== 'jp-analyzer-reader-spans') return '';

  switch (span.displayRole) {
    case 'punctuation': return 'word-neutral';
    case 'unresolved': return 'word-unresolved';
    case 'name': return 'word-name';
    case 'function': return 'word-function';
    case 'learnable-grammar': return 'word-grammar';
    default: break;
  }

  if (!LEXICAL_ROLES.has(span.displayRole)) return 'word-neutral';

  const knownKey = optionalKey(span.knownLookupKey);
  const frequencyKey = optionalKey(span.frequencyLookupKey);
  if (knownKey && isKnown(knownKey)) return 'word-known';

  const category = frequencyKey
    ? normalizeFrequencyCategory(getFrequencyCategory(frequencyKey))
    : null;
  return category
    ? `word-unknown word-freq-${category}`
    : 'word-unknown word-freq-unlisted';
}

function optionalKey(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function normalizeFrequencyCategory(value) {
  const category = typeof value === 'string' ? value : value?.category;
  return ['very-common', 'common', 'uncommon', 'rare', 'unlisted'].includes(category)
    ? category
    : null;
}
