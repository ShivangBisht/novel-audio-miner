/**
 * Japanese sentence splitter.
 *
 * Responsibility:
 * - Normalize extracted Japanese text.
 * - Split paragraph/block text into sentence-like reader units.
 *
 * This module does not group short dialogue or merge reading units.
 * Any future grouping should be rebuilt after Debug Mode / parser diagnostics.
 */

const CLOSERS = `」』）)】〕〉》"'`;
const ENDERS = '。！？!?';
const QUOTE_OPEN = '「『';
const QUOTE_CLOSE = '」』';

export function normalizeJapaneseText(text) {
  return (text || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\t\r\f]+/g, ' ')
    .replace(/\s*\n\s*/g, '')
    .replace(/ {2,}/g, ' ')
    .trim();
}

function consumeEndingCluster(input, index, buffer) {
  while (index + 1 < input.length && ENDERS.includes(input[index + 1])) {
    index += 1;
    buffer += input[index];
  }
  while (index + 1 < input.length && CLOSERS.includes(input[index + 1])) {
    index += 1;
    buffer += input[index];
  }
  return { index, buffer };
}

export function splitJapaneseSentences(text) {
  const input = normalizeJapaneseText(text);
  if (!input) return [];
  const out = [];
  let buffer = '';
  let quoteDepth = 0;
  let quoteHasEnder = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    buffer += ch;
    if (QUOTE_OPEN.includes(ch)) { quoteDepth += 1; quoteHasEnder = false; continue; }
    if (quoteDepth > 0 && ENDERS.includes(ch)) {
      quoteHasEnder = true;
      const consumed = consumeEndingCluster(input, i, buffer);
      i = consumed.index;
      buffer = consumed.buffer;
      continue;
    }
    if (QUOTE_CLOSE.includes(ch) && quoteDepth > 0) {
      quoteDepth -= 1;
      if (quoteDepth === 0 && quoteHasEnder) {
        const consumed = consumeEndingCluster(input, i, buffer);
        i = consumed.index;
        buffer = consumed.buffer;
        const sentence = buffer.trim();
        if (sentence) out.push(sentence);
        buffer = '';
        quoteHasEnder = false;
      }
      continue;
    }
    if (quoteDepth === 0 && ENDERS.includes(ch)) {
      const consumed = consumeEndingCluster(input, i, buffer);
      i = consumed.index;
      buffer = consumed.buffer;
      const sentence = buffer.trim();
      if (sentence) out.push(sentence);
      buffer = '';
      quoteHasEnder = false;
    }
  }

  const tail = buffer.trim();
  if (tail) out.push(tail);
  return out;
}
