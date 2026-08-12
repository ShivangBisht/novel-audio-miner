const VOID_TAGS = new Set(['br', 'wbr']);
const READING_TAGS = new Set(['rt', 'rp']);
const ENTITY_MAP = Object.freeze({
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: '\u00a0'
});

function decodeEntities(value) {
  return String(value ?? '').replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, name) => {
    const lower = name.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(ENTITY_MAP, lower)) return ENTITY_MAP[lower];
    if (lower.startsWith('#x')) {
      const code = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (lower.startsWith('#')) {
      const code = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return match;
  });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function parseFragment(html) {
  const root = { type: 'element', name: 'root', open: '', close: '', children: [], parent: null };
  const stack = [root];
  const tokens = String(html ?? '').match(/<[^>]+>|[^<]+/g) || [];
  for (const token of tokens) {
    if (!token.startsWith('<')) {
      stack.at(-1).children.push({ type: 'text', value: decodeEntities(token), parent: stack.at(-1) });
      continue;
    }
    if (/^<\s*\//.test(token)) {
      const name = token.match(/^<\s*\/\s*([a-z0-9:-]+)/i)?.[1]?.toLowerCase();
      if (!name) continue;
      for (let index = stack.length - 1; index > 0; index -= 1) {
        if (stack[index].name === name) {
          stack.length = index;
          break;
        }
      }
      continue;
    }
    const name = token.match(/^<\s*([a-z0-9:-]+)/i)?.[1]?.toLowerCase();
    if (!name) continue;
    const selfClosing = /\/\s*>$/.test(token) || VOID_TAGS.has(name);
    const node = {
      type: 'element', name, open: token, close: selfClosing ? '' : `</${name}>`,
      children: [], parent: stack.at(-1), selfClosing
    };
    stack.at(-1).children.push(node);
    if (!selfClosing) stack.push(node);
  }
  return root;
}

function assignVisibleOffsets(node, state = { offset: 0, text: '' }, reading = false) {
  if (node.type === 'text') {
    node.start = state.offset;
    if (!reading) {
      state.text += node.value;
      state.offset += node.value.length;
    }
    node.end = state.offset;
    return state;
  }
  const readingHere = reading || READING_TAGS.has(node.name);
  node.start = state.offset;
  if (node.name === 'br' && !readingHere) {
    state.text += '\n';
    state.offset += 1;
  }
  for (const child of node.children) assignVisibleOffsets(child, state, readingHere);
  node.end = state.offset;
  return state;
}

function intersects(node, start, end) {
  return node.end > start && node.start < end;
}

function renderSlice(node, start, end, reading = false) {
  if (node.type === 'text') {
    if (reading) return escapeHtml(node.value);
    const localStart = Math.max(0, start - node.start);
    const localEnd = Math.min(node.value.length, end - node.start);
    return localEnd > localStart ? escapeHtml(node.value.slice(localStart, localEnd)) : '';
  }
  const readingHere = reading || READING_TAGS.has(node.name);
  if (readingHere) return `${node.open}${node.children.map(child => renderSlice(child, start, end, true)).join('')}${node.close}`;
  if (node.name === 'br') return node.start >= start && node.start < end ? node.open : '';
  const selectedChildren = node.children.filter(child => intersects(child, start, end));
  if (!selectedChildren.length) return '';
  const inner = selectedChildren.map(child => renderSlice(child, start, end, false)).join('');
  if (node.name === 'root') return inner;
  return `${node.open}${inner}${node.close}`;
}

export function visibleTextFromInlineHtml(html) {
  const root = parseFragment(html);
  return assignVisibleOffsets(root).text;
}

export function sliceInlineHtmlByVisibleRange(html, start, end) {
  const root = parseFragment(html);
  const state = assignVisibleOffsets(root);
  const safeStart = Math.max(0, Math.min(state.text.length, Number(start) || 0));
  const safeEnd = Math.max(safeStart, Math.min(state.text.length, Number(end) || 0));
  return Object.freeze({
    start: safeStart,
    end: safeEnd,
    plainText: state.text.slice(safeStart, safeEnd),
    htmlText: renderSlice(root, safeStart, safeEnd),
    sourceVisibleText: state.text
  });
}

export function buildMarkupSlices(html, ranges) {
  const sourceVisibleText = visibleTextFromInlineHtml(html);
  const slices = (ranges ?? []).map(range => {
    const sliced = sliceInlineHtmlByVisibleRange(html, range.start, range.end);
    return Object.freeze({ ...range, htmlText: sliced.htmlText, plainText: sliced.plainText });
  });
  const reconstructedPlainText = slices.map(slice => slice.plainText).join('');
  return Object.freeze({
    sourceVisibleText,
    slices: Object.freeze(slices),
    diagnostics: Object.freeze({
      valid: reconstructedPlainText === sourceVisibleText,
      reconstructedPlainText,
      sliceCount: slices.length
    })
  });
}

export function combineMarkupSlices(slices, { separator = '' } = {}) {
  const source = Array.isArray(slices) ? slices : [];
  return Object.freeze({
    plainText: source.map(slice => String(slice?.plainText ?? '')).join(separator),
    htmlText: source.map(slice => String(slice?.htmlText ?? '')).join(separator),
    sourceSliceCount: source.length
  });
}
