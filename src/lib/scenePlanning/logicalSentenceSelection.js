function integer(value) {
  return Number.isInteger(value) ? value : null;
}

function normalizedUnit(unit, index) {
  const visualStart = integer(unit?.visualStart);
  const visualEnd = integer(unit?.visualEnd);
  const plainText = String(unit?.plainText ?? '');
  if (
    visualStart === null ||
    visualEnd === null ||
    visualStart < 0 ||
    visualEnd < visualStart ||
    visualEnd - visualStart !== plainText.length
  ) {
    return null;
  }
  return Object.freeze({
    ...unit,
    index: Number.isInteger(unit?.index) ? unit.index : index,
    plainText,
    visualStart,
    visualEnd
  });
}

export function validateLogicalSentenceOwnership(scene) {
  const visualText = String(scene?.plainText ?? '');
  const source = Array.isArray(scene?.logicalSentences)
    ? scene.logicalSentences
    : [];
  const units = source.map(normalizedUnit);
  const errors = [];

  if (!source.length) errors.push('logical-sentences-unavailable');
  if (units.some(unit => unit === null)) errors.push('invalid-logical-sentence-range');

  const validUnits = units.filter(Boolean);
  for (let index = 0; index < validUnits.length; index += 1) {
    const unit = validUnits[index];
    if (visualText.slice(unit.visualStart, unit.visualEnd) !== unit.plainText) {
      errors.push(`logical-sentence-text-mismatch:${index}`);
    }
    if (index > 0 && validUnits[index - 1].visualEnd > unit.visualStart) {
      errors.push(`logical-sentence-overlap:${index - 1}:${index}`);
    }
  }

  return Object.freeze({
    valid: errors.length === 0,
    visualText,
    logicalSentences: Object.freeze(validUnits),
    errors: Object.freeze(errors)
  });
}

function ownershipAtOffset(units, offset, side) {
  if (side === 'end') {
    return units.find(unit => offset > unit.visualStart && offset <= unit.visualEnd) || null;
  }
  return units.find(unit => offset >= unit.visualStart && offset < unit.visualEnd) || null;
}

function structuralGap(units, start, end) {
  for (let index = 1; index < units.length; index += 1) {
    const gapStart = units[index - 1].visualEnd;
    const gapEnd = units[index].visualStart;
    if (gapEnd > gapStart && start < gapEnd && end > gapStart) {
      return Object.freeze({ start: gapStart, end: gapEnd });
    }
  }
  return null;
}

export function resolveLogicalSentenceSelection({ scene, start, end, visibleText = null } = {}) {
  const ownership = validateLogicalSentenceOwnership(scene);
  if (!ownership.valid) {
    return Object.freeze({
      valid: false,
      reason: 'logical-sentence-ownership-invalid',
      errors: ownership.errors
    });
  }

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    start >= end ||
    end > ownership.visualText.length
  ) {
    return Object.freeze({ valid: false, reason: 'invalid-visual-selection-range' });
  }

  const gap = structuralGap(ownership.logicalSentences, start, end);
  if (gap && start >= gap.start && end <= gap.end) {
    return Object.freeze({
      valid: false,
      reason: 'selection-is-layout-only',
      structuralGap: gap
    });
  }
  if (gap) {
    return Object.freeze({
      valid: false,
      reason: 'selection-crosses-logical-sentence-boundary',
      structuralGap: gap
    });
  }

  const startOwner = ownershipAtOffset(ownership.logicalSentences, start, 'start');
  const endOwner = ownershipAtOffset(ownership.logicalSentences, end, 'end');
  if (!startOwner || !endOwner) {
    return Object.freeze({ valid: false, reason: 'selection-is-layout-only' });
  }
  if (startOwner !== endOwner) {
    return Object.freeze({ valid: false, reason: 'selection-crosses-logical-sentence-boundary' });
  }

  const localStart = start - startOwner.visualStart;
  const localEnd = end - startOwner.visualStart;
  const surface = startOwner.plainText.slice(localStart, localEnd);
  if (visibleText !== null && String(visibleText) !== surface) {
    return Object.freeze({
      valid: false,
      reason: 'visual-selection-does-not-match-logical-sentence',
      expected: surface,
      selected: String(visibleText)
    });
  }

  const meaningfulLength = Number.isInteger(startOwner.meaningfulLength)
    ? startOwner.meaningfulLength
    : null;
  const symbolOnly = meaningfulLength === 0 || startOwner.atomicReason === 'symbol-only';
  if (symbolOnly) {
    return Object.freeze({
      valid: false,
      reason: 'logical-sentence-not-teachable',
      logicalSentenceIndex: startOwner.index
    });
  }

  return Object.freeze({
    valid: true,
    logicalSentenceIndex: startOwner.index,
    logicalSentence: startOwner,
    sentence: startOwner.plainText,
    start: localStart,
    end: localEnd,
    surface,
    visualStart: start,
    visualEnd: end
  });
}

export function logicalSentenceSelectionMessage(result) {
  const messages = {
    'logical-sentence-ownership-invalid': 'Logical sentence ownership is unavailable for this scene.',
    'invalid-visual-selection-range': 'Select a non-empty range inside the visible scene.',
    'selection-crosses-logical-sentence-boundary': 'Select within one logical sentence.',
    'selection-is-layout-only': 'The selection contains only visual layout.',
    'visual-selection-does-not-match-logical-sentence': 'The visible selection does not match the logical sentence.',
    'logical-sentence-not-teachable': 'This visual unit is not a teachable sentence.'
  };
  return messages[result?.reason] || 'This selection cannot be mapped to a logical sentence.';
}
