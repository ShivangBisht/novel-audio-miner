const EXCLUDED_TAGS = new Set(['RT', 'RP', 'SCRIPT', 'STYLE']);

function integer(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function analyzerSpan(element, root) {
  const span = element?.closest?.('[data-analyzer-start][data-analyzer-end]');
  return span && root.contains(span) ? span : null;
}

function collectVisibleTextNodes(root) {
  const nodes = [];
  let text = '';
  function walk(node) {
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (!parent || EXCLUDED_TAGS.has(parent.tagName)) return;
      const start = text.length;
      text += node.textContent || '';
      const end = text.length;
      if (end > start) nodes.push({ node, start, end });
      return;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (EXCLUDED_TAGS.has(node.tagName)) return;
      for (const child of node.childNodes) walk(child);
    }
  }
  walk(root);
  return { text, nodes };
}

function locateSourceWindow(renderedText, source) {
  if (renderedText === source) return { valid: true, start: 0, end: source.length };
  const first = renderedText.indexOf(source);
  if (first < 0) return { valid: false, reason: 'rendered-source-mismatch' };
  if (renderedText.indexOf(source, first + 1) >= 0) {
    return { valid: false, reason: 'ambiguous-rendered-source' };
  }
  const prefix = renderedText.slice(0, first);
  const suffix = renderedText.slice(first + source.length);
  if (prefix.trim() || suffix.trim()) {
    return { valid: false, reason: 'rendered-source-mismatch' };
  }
  return { valid: true, start: first, end: first + source.length };
}

function renderedBoundaryOffset(container, offset, root, visibleMap) {
  if (!root.contains(container)) return null;
  if (container.nodeType === Node.TEXT_NODE) {
    const info = visibleMap.nodes.find(item => item.node === container);
    if (!info || offset < 0 || offset > (container.textContent || '').length) return null;
    return info.start + offset;
  }
  if (container.nodeType === Node.ELEMENT_NODE) {
    const range = document.createRange();
    range.selectNodeContents(root);
    try { range.setEnd(container, offset); } catch { return null; }
    const fragment = range.cloneContents();
    for (const element of fragment.querySelectorAll('rt,rp,script,style')) element.remove();
    return fragment.textContent?.length ?? 0;
  }
  return null;
}

function boundaryPoint(range, side, root, visibleMap, sourceWindow) {
  const container = side === 'start' ? range.startContainer : range.endContainer;
  const offset = side === 'start' ? range.startOffset : range.endOffset;
  const element = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
  const span = analyzerSpan(element, root);
  if (!span) return { valid: false, reason: 'selection-outside-analyzer-span' };
  const renderedOffset = renderedBoundaryOffset(container, offset, root, visibleMap);
  if (renderedOffset === null) return { valid: false, reason: 'unresolvable-dom-boundary' };
  const absolute = renderedOffset - sourceWindow.start;
  if (absolute < 0 || absolute > sourceWindow.end - sourceWindow.start) {
    return { valid: false, reason: 'selection-outside-source-window' };
  }
  return { valid: true, absolute, span };
}

function visibleRangeText(range) {
  const fragment = range.cloneContents();
  for (const element of fragment.querySelectorAll('rt,rp,script,style')) element.remove();
  return fragment.textContent || '';
}

function validateAnalyzerSpans(sentence, spans) {
  if (!Array.isArray(spans) || !spans.length) return 'analyzer-spans-unavailable';
  let cursor = 0;
  for (const span of spans) {
    if (!Number.isInteger(span?.start) || !Number.isInteger(span?.end)) return 'invalid-analyzer-offsets';
    if (span.start !== cursor || span.end <= span.start || span.end > sentence.length) return 'stale-analyzer-spans';
    if (sentence.slice(span.start, span.end) !== String(span.surface || '')) return 'stale-analyzer-surface';
    cursor = span.end;
  }
  return cursor === sentence.length ? null : 'incomplete-analyzer-coverage';
}

export function resolveTeachingSelectionFromOffsets({ sentence, analyzerSpans, start, end, visibleText = null }) {
  const source = String(sentence || '');
  const contractError = validateAnalyzerSpans(source, analyzerSpans);
  if (contractError) return { valid: false, reason: contractError };
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= end || end > source.length) {
    return { valid: false, reason: 'invalid-source-range' };
  }
  const surface = source.slice(start, end);
  if (visibleText !== null && String(visibleText) !== surface) {
    return { valid: false, reason: 'selection-does-not-match-source', expected: surface, selected: String(visibleText) };
  }
  const coveredSpanIndexes = [];
  analyzerSpans.forEach((span, index) => {
    if (span.start < end && start < span.end) coveredSpanIndexes.push(index);
  });
  if (!coveredSpanIndexes.length) return { valid: false, reason: 'selection-covers-no-analyzer-spans' };
  return {
    valid: true, exact: true, sentence: source, start, end, surface, coveredSpanIndexes,
    alignedToSpanStart: analyzerSpans[coveredSpanIndexes[0]].start === start,
    alignedToSpanEnd: analyzerSpans[coveredSpanIndexes.at(-1)].end === end,
    spans: coveredSpanIndexes.map(index => analyzerSpans[index]),
  };
}

export function resolveTeachingSelection({ root, selection, sentence, analyzerSpans }) {
  const source = String(sentence || '');
  if (!root || !selection || selection.isCollapsed || selection.rangeCount !== 1) {
    return { valid: false, reason: 'no-exact-selection' };
  }
  const contractError = validateAnalyzerSpans(source, analyzerSpans);
  if (contractError) return { valid: false, reason: contractError };
  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) {
    return { valid: false, reason: 'selection-outside-reader' };
  }
  const visibleMap = collectVisibleTextNodes(root);
  const sourceWindow = locateSourceWindow(visibleMap.text, source);
  if (!sourceWindow.valid) return {
    valid: false,
    reason: sourceWindow.reason,
    expected: source,
    rendered: visibleMap.text,
  };
  const startPoint = boundaryPoint(range, 'start', root, visibleMap, sourceWindow);
  const endPoint = boundaryPoint(range, 'end', root, visibleMap, sourceWindow);
  if (!startPoint.valid) return startPoint;
  if (!endPoint.valid) return endPoint;
  const start = startPoint.absolute;
  const end = endPoint.absolute;
  if (start >= end || start < 0 || end > source.length) {
    return { valid: false, reason: 'invalid-source-range' };
  }
  return resolveTeachingSelectionFromOffsets({
    sentence: source, analyzerSpans, start, end, visibleText: visibleRangeText(range),
  });
}

export function teachingSelectionMessage(result) {
  const messages = {
    'no-exact-selection': 'Select a non-empty range inside the sentence.',
    'selection-outside-reader': 'The selection must stay inside the current sentence.',
    'selection-outside-analyzer-span': 'The selection is not mapped to analyzer source offsets.',
    'invalid-analyzer-offsets': 'Analyzer offsets are invalid.',
    'stale-analyzer-spans': 'The analyzer result is stale for this sentence.',
    'stale-analyzer-surface': 'Analyzer surfaces no longer match the sentence.',
    'incomplete-analyzer-coverage': 'Analyzer spans do not cover the complete sentence.',
    'selection-does-not-match-source': 'The visible selection does not exactly match source text.',
    'rendered-source-mismatch': 'The rendered sentence differs from the analyzer source. Export a Debug Report for this scene.',
    'ambiguous-rendered-source': 'The analyzer source occurs more than once in the rendered sentence.',
    'selection-outside-source-window': 'The selection includes EPUB layout text outside the sentence.',
    'invalid-source-range': 'The selected source range is invalid.',
  };
  return result?.valid ? `${result.surface} (${result.start}-${result.end})` : messages[result?.reason] || 'This selection cannot be taught.';
}
