import { meaningfulCharacterCount } from './textRanges.js';

export const DEFAULT_MINIMUM_MEANINGFUL_LENGTH = 8;

function candidateText(candidate) {
  return String(candidate?.plainText ?? '');
}

function candidateMeaningfulLength(candidate) {
  return Number.isInteger(candidate?.meaningfulLength)
    ? candidate.meaningfulLength
    : meaningfulCharacterCount(candidateText(candidate));
}

function hasHardBoundaryBetween(left, right) {
  return Boolean(
    left?.hardBoundaryAfter ||
    right?.hardBoundaryBefore ||
    (
      left?.boundaryGroup != null &&
      right?.boundaryGroup != null &&
      left.boundaryGroup !== right.boundaryGroup
    )
  );
}

function createScene(candidate, candidateIndex) {
  const plainText = candidateText(candidate);
  return {
    plainText,
    meaningfulLength: candidateMeaningfulLength(candidate),
    sourceCandidateIndexes: [candidateIndex],
    sourceCandidates: [candidate],
    attachmentDirection: 'none',
    attachmentCount: 0,
    boundaryBefore: candidate?.boundaryBefore || (
      candidate?.hardBoundaryBefore ? 'hard-boundary' : 'candidate-start'
    ),
    boundaryAfter: null,
    planningReason: null
  };
}

function appendCandidate(scene, candidate, candidateIndex, direction) {
  scene.plainText += candidateText(candidate);
  scene.meaningfulLength += candidateMeaningfulLength(candidate);
  scene.sourceCandidateIndexes.push(candidateIndex);
  scene.sourceCandidates.push(candidate);
  scene.attachmentDirection = direction;
  scene.attachmentCount += 1;
}

function prependScene(target, source) {
  target.plainText = source.plainText + target.plainText;
  target.meaningfulLength = source.meaningfulLength + target.meaningfulLength;
  target.sourceCandidateIndexes = [
    ...source.sourceCandidateIndexes,
    ...target.sourceCandidateIndexes
  ];
  target.sourceCandidates = [
    ...source.sourceCandidates,
    ...target.sourceCandidates
  ];
  target.boundaryBefore = source.boundaryBefore;
  target.attachmentDirection = 'backward';
  target.attachmentCount += source.sourceCandidateIndexes.length;
}

function freezeScene(scene, sceneIndex) {
  return Object.freeze({
    sceneIndex,
    plainText: scene.plainText,
    meaningfulLength: scene.meaningfulLength,
    sourceCandidateIndexes: Object.freeze([...scene.sourceCandidateIndexes]),
    sourceCandidates: Object.freeze([...scene.sourceCandidates]),
    attachmentDirection: scene.attachmentDirection,
    attachmentCount: scene.attachmentCount,
    boundaryBefore: scene.boundaryBefore,
    boundaryAfter: scene.boundaryAfter,
    planningReason: scene.planningReason
  });
}

export function planMinimumContextScenes(candidates, {
  minimumMeaningfulLength = DEFAULT_MINIMUM_MEANINGFUL_LENGTH
} = {}) {
  const source = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  const minimum = Math.max(1, Number(minimumMeaningfulLength) || DEFAULT_MINIMUM_MEANINGFUL_LENGTH);
  const planned = [];
  let index = 0;

  while (index < source.length) {
    const scene = createScene(source[index], index);
    let cursor = index;

    while (scene.meaningfulLength < minimum && cursor + 1 < source.length) {
      const current = source[cursor];
      const next = source[cursor + 1];
      if (hasHardBoundaryBetween(current, next)) break;
      cursor += 1;
      appendCandidate(scene, next, cursor, 'forward');
    }

    const lastCandidate = source[cursor];
    const blockedByHardBoundary = cursor + 1 < source.length && hasHardBoundaryBetween(
      lastCandidate,
      source[cursor + 1]
    );

    if (scene.meaningfulLength >= minimum) {
      scene.planningReason = scene.attachmentCount > 0
        ? 'minimum-context-reached'
        : 'standalone-sufficient';
      scene.boundaryAfter = blockedByHardBoundary
        ? 'hard-boundary'
        : 'candidate-complete';
      planned.push(scene);
    } else {
      const previous = planned[planned.length - 1] || null;
      const firstCandidate = source[index];
      const previousCandidateIndex = previous?.sourceCandidateIndexes?.at(-1);
      const previousCandidate = Number.isInteger(previousCandidateIndex)
        ? source[previousCandidateIndex]
        : null;
      const backwardSafe = Boolean(
        previous &&
        previousCandidate &&
        !hasHardBoundaryBetween(previousCandidate, firstCandidate)
      );

      if (backwardSafe) {
        const prior = planned.pop();
        prependScene(scene, prior);
        scene.planningReason = 'backward-fallback';
        scene.boundaryAfter = blockedByHardBoundary
          ? 'hard-boundary'
          : 'end-of-input';
        planned.push(scene);
      } else {
        scene.planningReason = blockedByHardBoundary
          ? 'no-safe-attachment-hard-boundary'
          : 'no-safe-attachment-end-of-input';
        scene.boundaryAfter = blockedByHardBoundary
          ? 'hard-boundary'
          : 'end-of-input';
        planned.push(scene);
      }
    }

    index = cursor + 1;
  }

  const scenes = planned.map(freezeScene);
  const reconstructedText = scenes.map(scene => scene.plainText).join('');
  const sourceText = source.map(candidateText).join('');
  const assignedIndexes = scenes.flatMap(scene => scene.sourceCandidateIndexes);
  const uniqueIndexes = new Set(assignedIndexes);

  return Object.freeze({
    schemaVersion: '14.2',
    minimumMeaningfulLength: minimum,
    candidateCount: source.length,
    sceneCount: scenes.length,
    scenes: Object.freeze(scenes),
    diagnostics: Object.freeze({
      valid: reconstructedText === sourceText &&
        assignedIndexes.length === source.length &&
        uniqueIndexes.size === source.length,
      reconstructedTextMatches: reconstructedText === sourceText,
      assignedCandidateCount: assignedIndexes.length,
      uniqueCandidateCount: uniqueIndexes.size,
      forwardAttachmentSceneCount: scenes.filter(scene => scene.attachmentDirection === 'forward').length,
      backwardAttachmentSceneCount: scenes.filter(scene => scene.attachmentDirection === 'backward').length,
      hardBoundaryStopCount: scenes.filter(scene => scene.boundaryAfter === 'hard-boundary').length,
      insufficientContextSceneCount: scenes.filter(scene => scene.meaningfulLength < minimum).length
    })
  });
}
