/**
 * Alpha 3 presentation-only interaction helpers.
 * DOM metadata identifies an exact authoritative range; linguistic fields are
 * still resolved exclusively from the current validated readerSpans array.
 */
export function readAnalyzerElementIdentity(element) {
  const start = Number(element?.dataset?.analyzerStart);
  const end = Number(element?.dataset?.analyzerEnd);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start) return null;
  return Object.freeze({
    start,
    end,
    surface: String(element?.dataset?.token ?? element?.textContent ?? '')
  });
}

export function interactionMatchesAnalyzerElement(interaction, element) {
  const identity = readAnalyzerElementIdentity(element);
  return Boolean(
    identity && interaction &&
    interaction.spanStart === identity.start &&
    interaction.spanEnd === identity.end
  );
}

export function isReaderSpanActivationKey(key) {
  return key === 'Enter' || key === ' ';
}
