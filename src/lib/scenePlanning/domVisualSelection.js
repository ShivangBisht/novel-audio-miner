const DEFAULT_EXCLUDED_TAGS = Object.freeze([
  'RT',
  'RP',
  'SCRIPT',
  'STYLE'
]);

function nodeType(node) {
  return Number(node?.nodeType) || 0;
}

function tagName(node) {
  return String(node?.tagName || node?.nodeName || '').toUpperCase();
}

function childNodes(node) {
  return Array.from(node?.childNodes || []);
}

function textContent(node) {
  return String(node?.textContent || '');
}

function excludedTags(options) {
  return new Set(
    (options?.excludedTags || DEFAULT_EXCLUDED_TAGS)
      .map(value => String(value).toUpperCase())
  );
}

function containsNode(root, target) {
  if (!root || !target) return false;
  if (root === target) return true;
  if (typeof root.contains === 'function') return root.contains(target);
  return childNodes(root).some(child => containsNode(child, target));
}

export function buildDomVisualTextMap(root, options = {}) {
  const excluded = excludedTags(options);
  const entries = [];
  let text = '';

  function walk(node) {
    if (!node) return;
    if (nodeType(node) === 3) {
      const value = textContent(node);
      const start = text.length;
      text += value;
      entries.push(Object.freeze({
        kind: 'text',
        node,
        start,
        end: text.length,
        text: value
      }));
      return;
    }
    if (nodeType(node) !== 1 && nodeType(node) !== 11) return;
    const tag = tagName(node);
    if (excluded.has(tag)) return;
    if (tag === 'BR') {
      const start = text.length;
      text += '\n';
      entries.push(Object.freeze({
        kind: 'break',
        node,
        start,
        end: text.length,
        text: '\n'
      }));
      return;
    }
    for (const child of childNodes(node)) walk(child);
  }

  walk(root);
  return Object.freeze({
    text,
    length: text.length,
    entries: Object.freeze(entries)
  });
}

function textBoundaryOffset(map, container, offset) {
  const entry = map.entries.find(
    candidate => candidate.kind === 'text' && candidate.node === container
  );
  if (!entry) return null;
  const length = textContent(container).length;
  if (!Number.isInteger(offset) || offset < 0 || offset > length) return null;
  return entry.start + offset;
}

function accumulatedLength(node, stopContainer, stopOffset, excluded) {
  let total = 0;
  let resolved = null;

  function walk(current) {
    if (resolved !== null || !current) return;
    if (current === stopContainer) {
      if (nodeType(current) === 3) {
        const length = textContent(current).length;
        if (!Number.isInteger(stopOffset) || stopOffset < 0 || stopOffset > length) {
          resolved = -1;
          return;
        }
        resolved = total + stopOffset;
        return;
      }
      const children = childNodes(current);
      if (!Number.isInteger(stopOffset) || stopOffset < 0 || stopOffset > children.length) {
        resolved = -1;
        return;
      }
      for (let index = 0; index < stopOffset; index += 1) {
        total += visibleLength(children[index], excluded);
      }
      resolved = total;
      return;
    }
    if (nodeType(current) === 3) {
      total += textContent(current).length;
      return;
    }
    if (nodeType(current) !== 1 && nodeType(current) !== 11) return;
    const tag = tagName(current);
    if (excluded.has(tag)) return;
    if (tag === 'BR') {
      total += 1;
      return;
    }
    for (const child of childNodes(current)) walk(child);
  }

  walk(node);
  return resolved === -1 ? null : resolved;
}

function visibleLength(node, excluded) {
  if (!node) return 0;
  if (nodeType(node) === 3) return textContent(node).length;
  if (nodeType(node) !== 1 && nodeType(node) !== 11) return 0;
  const tag = tagName(node);
  if (excluded.has(tag)) return 0;
  if (tag === 'BR') return 1;
  return childNodes(node).reduce(
    (sum, child) => sum + visibleLength(child, excluded),
    0
  );
}

export function resolveDomVisualBoundary(root, container, offset, options = {}) {
  if (!containsNode(root, container)) {
    return Object.freeze({ valid: false, reason: 'boundary-outside-root' });
  }
  const map = buildDomVisualTextMap(root, options);
  const direct = nodeType(container) === 3
    ? textBoundaryOffset(map, container, offset)
    : accumulatedLength(root, container, offset, excludedTags(options));
  if (!Number.isInteger(direct) || direct < 0 || direct > map.length) {
    return Object.freeze({ valid: false, reason: 'unresolvable-dom-boundary' });
  }
  return Object.freeze({ valid: true, offset: direct, visualText: map.text });
}

export function resolveDomVisualSelection({ root, selection, expectedText = null, options = {} } = {}) {
  if (!root || !selection || selection.isCollapsed || selection.rangeCount !== 1) {
    return Object.freeze({ valid: false, reason: 'no-exact-dom-selection' });
  }
  const range = selection.getRangeAt(0);
  if (!range || !containsNode(root, range.commonAncestorContainer)) {
    return Object.freeze({ valid: false, reason: 'selection-outside-root' });
  }

  const map = buildDomVisualTextMap(root, options);
  if (expectedText !== null && map.text !== String(expectedText)) {
    return Object.freeze({
      valid: false,
      reason: 'dom-visual-text-mismatch',
      expected: String(expectedText),
      rendered: map.text
    });
  }

  const start = resolveDomVisualBoundary(
    root,
    range.startContainer,
    range.startOffset,
    options
  );
  const end = resolveDomVisualBoundary(
    root,
    range.endContainer,
    range.endOffset,
    options
  );
  if (!start.valid) return start;
  if (!end.valid) return end;
  if (start.offset >= end.offset) {
    return Object.freeze({ valid: false, reason: 'invalid-dom-selection-range' });
  }

  return Object.freeze({
    valid: true,
    start: start.offset,
    end: end.offset,
    visibleText: map.text.slice(start.offset, end.offset),
    visualText: map.text
  });
}

export function domVisualSelectionMessage(result) {
  const messages = {
    'no-exact-dom-selection': 'Select a non-empty visible range.',
    'selection-outside-root': 'The selection is outside the visible scene.',
    'boundary-outside-root': 'The selection boundary is outside the visible scene.',
    'unresolvable-dom-boundary': 'The selection boundary could not be mapped.',
    'dom-visual-text-mismatch': 'The rendered scene does not match its visual text.',
    'invalid-dom-selection-range': 'The visible selection range is invalid.'
  };
  return messages[result?.reason] || 'The visible selection could not be mapped.';
}
