const QUOTE_PAIRS = Object.freeze({
  '「': '」',
  '『': '』',
  '（': '）',
  '(': ')',
  '［': '］',
  '[': ']',
  '【': '】',
  '〈': '〉',
  '《': '》',
  '“': '”',
  '‘': '’'
});
const QUOTE_OPENERS = new Set(Object.keys(QUOTE_PAIRS));
const QUOTE_CLOSERS = new Set(Object.values(QUOTE_PAIRS));
const FALLBACK_ENDERS = new Set(['。', '！', '？', '!', '?']);
const TRAILING_CLOSERS = new Set([...QUOTE_CLOSERS, '"', "'"]);

function codePoints(value) {
  return Array.from(String(value ?? ''));
}

export function meaningfulCharacterCount(value) {
  let count = 0;
  const normalized = String(value ?? '').normalize('NFKC');

  for (const character of codePoints(normalized)) {
    if (/^[\p{L}\p{N}\p{M}]$/u.test(character)) {
      count += 1;
    }
  }

  return count;
}

function quoteStateFor(value, initialStack = []) {
  const stack = [...initialStack];
  for (const character of codePoints(value)) {
    if (QUOTE_OPENERS.has(character)) {
      stack.push(QUOTE_PAIRS[character]);
      continue;
    }
    if (!QUOTE_CLOSERS.has(character)) continue;
    if (stack[stack.length - 1] === character) stack.pop();
  }
  return stack;
}

function fallbackSentenceRanges(text) {
  const source = String(text ?? '');
  const ranges = [];

  /*
   * Each quote frame records its expected closer and whether sentence-ending
   * punctuation occurred inside it. This lets a complete dialogue group end
   * at its closing quote without splitting on punctuation inside the quote.
   */
  const quoteStack = [];
  let start = 0;

  function emit(end) {
    if (end <= start) return;

    ranges.push({
      start,
      end
    });

    start = end;
  }

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (QUOTE_OPENERS.has(character)) {
      quoteStack.push({
        closer: QUOTE_PAIRS[character],
        hasEnder: false
      });
      continue;
    }

    if (FALLBACK_ENDERS.has(character)) {
      if (quoteStack.length > 0) {
        quoteStack[quoteStack.length - 1].hasEnder = true;
        continue;
      }

      let end = index + 1;

      while (
        end < source.length &&
        (
          FALLBACK_ENDERS.has(source[end]) ||
          TRAILING_CLOSERS.has(source[end])
        )
      ) {
        end += 1;
      }

      emit(end);
      index = end - 1;
      continue;
    }

    if (
      QUOTE_CLOSERS.has(character) &&
      quoteStack.length > 0 &&
      quoteStack[quoteStack.length - 1].closer === character
    ) {
      const completedQuote = quoteStack.pop();

      /*
       * Sentence punctuation in a nested quote contributes to its enclosing
       * quote, but only the outermost closing quote creates an atomic range.
       */
      if (
        completedQuote.hasEnder &&
        quoteStack.length > 0
      ) {
        quoteStack[quoteStack.length - 1].hasEnder = true;
      }

      if (
        completedQuote.hasEnder &&
        quoteStack.length === 0
      ) {
        let end = index + 1;

        while (
          end < source.length &&
          TRAILING_CLOSERS.has(source[end])
        ) {
          end += 1;
        }

        emit(end);
        index = end - 1;
      }
    }
  }

  if (start < source.length) {
    emit(source.length);
  }

  return ranges;
}

function segmenterRanges(text, locale) {
  if (typeof Intl?.Segmenter !== 'function') return null;
  const segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' });
  const ranges = [];
  for (const part of segmenter.segment(text)) {
    const start = part.index;
    const end = start + part.segment.length;
    if (end > start) ranges.push({ start, end });
  }
  return ranges;
}

function normalizeRanges(text, ranges) {
  const source = String(text ?? '');
  const ordered = [...ranges].sort((left, right) => left.start - right.start || left.end - right.end);
  const result = [];
  let cursor = 0;
  for (const range of ordered) {
    const start = Math.max(cursor, Number(range.start) || 0);
    const end = Math.min(source.length, Number(range.end) || 0);
    if (start > cursor) result.push({ start: cursor, end: start });
    if (end > start) result.push({ start, end });
    cursor = Math.max(cursor, end);
  }
  if (cursor < source.length) result.push({ start: cursor, end: source.length });
  return result.filter(range => range.end > range.start);
}

function mergeOpenQuoteRanges(text, ranges) {
  const source = String(text ?? '');
  const merged = [];
  let active = null;
  let quoteStack = [];
  for (const range of ranges) {
    const textRange = source.slice(range.start, range.end);
    if (!active) active = { ...range };
    else active.end = range.end;
    quoteStack = quoteStateFor(textRange, quoteStack);
    if (quoteStack.length === 0) {
      merged.push(active);
      active = null;
    }
  }
  if (active) merged.push(active);
  return merged;
}

export function buildAtomicTextRanges(text, {
  locale = 'ja',
  forceFallback = false,
  sourceBlockId = null
} = {}) {
  const source = String(text ?? '');
  if (!source) return [];
  const raw = !forceFallback ? segmenterRanges(source, locale) : null;
  const normalized = normalizeRanges(source, raw?.length ? raw : fallbackSentenceRanges(source));
  const atomic = mergeOpenQuoteRanges(source, normalized);
  return atomic.map((range, index) => {
    const plainText = source.slice(range.start, range.end);
    const quoteStack = quoteStateFor(plainText);
    return Object.freeze({
      index,
      start: range.start,
      end: range.end,
      plainText,
      meaningfulLength: meaningfulCharacterCount(plainText),
      sourceBlockId,
      atomicReason: plainText.length === 1 && meaningfulCharacterCount(plainText) === 0
        ? 'symbol-only'
        : /[「『“‘]/u.test(plainText)
          ? 'quote-group'
          : 'sentence-candidate',
      hasOpenQuote: quoteStack.length > 0
    });
  });
}

export function validateAtomicTextRanges(text, ranges) {
  const source = String(text ?? '');
  let cursor = 0;
  const errors = [];
  for (const range of ranges ?? []) {
    if (range.start !== cursor) errors.push(`gap-or-overlap:${cursor}:${range.start}`);
    if (range.end <= range.start) errors.push(`empty-range:${range.start}:${range.end}`);
    if (source.slice(range.start, range.end) !== range.plainText) errors.push(`text-mismatch:${range.start}:${range.end}`);
    cursor = range.end;
  }
  if (cursor !== source.length) errors.push(`incomplete:${cursor}:${source.length}`);
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    reconstructedText: (ranges ?? []).map(range => range.plainText).join('')
  });
}
