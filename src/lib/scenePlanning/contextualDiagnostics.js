import { buildAtomicTextRanges } from './textRanges.js';
import { planMinimumContextScenes } from './minimumContextPlanner.js';
import { buildMarkupSlices, combineMarkupSlices } from './markupRanges.js';

function compare(left, right) {
  return left.spineIndex - right.spineIndex || left.eventIndex - right.eventIndex;
}

function contains(section, point) {
  return Boolean(
    section?.start && section?.end &&
    compare(point, section.start) >= 0 &&
    compare(point, section.end) <= 0
  );
}

function sectionFor(bookModel, point) {
  const matches = (bookModel?.sections || []).filter(section => contains(section, point));
  return matches.find(section => section.type === 'navigation') ||
    matches.find(section => section.type === 'cover') ||
    matches.find(section => section.type === 'preliminary-illustrations') ||
    matches.find(section => section.type === 'auxiliary-front-matter') ||
    matches.find(section => section.type === 'untitled-reading-section') ||
    matches.find(section => section.type === 'chapter') ||
    matches[0] || null;
}

function boundaryGroup(document, section) {
  return `${document.documentHref}|${section.sectionIndex}`;
}

function sourceBlockId(document, event) {
  return `${document.documentHref}|${event.eventIndex}`;
}

function eventCandidates(document, event, section) {
  const ranges = buildAtomicTextRanges(event.plainText || '', {
    sourceBlockId: sourceBlockId(document, event)
  });
  const markup = buildMarkupSlices(event.htmlText || event.plainText || '', ranges);
  if (!markup.diagnostics.valid || markup.sourceVisibleText !== String(event.plainText || '')) {
    return {
      valid: false,
      reason: 'markup-visible-text-mismatch',
      candidates: []
    };
  }
  const group = boundaryGroup(document, section);
  return {
    valid: true,
    reason: null,
    candidates: markup.slices.map((slice, index) => ({
      ...slice,
      htmlText: slice.htmlText,
      boundaryGroup: group,
      sourceBlockId: sourceBlockId(document, event),
      sourceDocumentHref: document.documentHref,
      sourceSpineIndex: document.spineIndex,
      sourceEventIndex: event.eventIndex,
      sourceRangeIndex: index,
      sectionIndex: section.sectionIndex,
      sectionType: section.type
    }))
  };
}

function finalizeRun(run, output, minimumMeaningfulLength) {
  if (!run.length) return;
  const plan = planMinimumContextScenes(run, { minimumMeaningfulLength });
  for (const scene of plan.scenes) {
    const combined = combineMarkupSlices(scene.sourceCandidates);
    output.scenes.push({
      sourceCandidateCount: scene.sourceCandidateIndexes.length,
      sourceBlockCount: new Set(scene.sourceCandidates.map(candidate => candidate.sourceBlockId)).size,
      sourceEventCount: new Set(scene.sourceCandidates.map(candidate => `${candidate.sourceDocumentHref}|${candidate.sourceEventIndex}`)).size,
      meaningfulLength: scene.meaningfulLength,
      plainTextLength: combined.plainText.length,
      htmlTextLength: combined.htmlText.length,
      attachmentDirection: scene.attachmentDirection,
      attachmentCount: scene.attachmentCount,
      planningReason: scene.planningReason,
      boundaryBefore: scene.boundaryBefore,
      boundaryAfter: scene.boundaryAfter,
      sectionIndex: scene.sourceCandidates[0]?.sectionIndex ?? null,
      sectionType: scene.sourceCandidates[0]?.sectionType ?? null,
      firstDocumentHref: scene.sourceCandidates[0]?.sourceDocumentHref || null,
      firstSpineIndex: scene.sourceCandidates[0]?.sourceSpineIndex ?? null,
      firstEventIndex: scene.sourceCandidates[0]?.sourceEventIndex ?? null,
      reconstructsMarkupVisibleText: combined.plainText === scene.plainText
    });
  }
  output.candidateCount += plan.candidateCount;
  output.plannerValid = output.plannerValid && plan.diagnostics.valid;
}

export function buildContextualSceneDiagnostics({ runtime, minimumMeaningfulLength = 8 } = {}) {
  const { documents = [], bookModel } = runtime || {};
  const output = {
    candidateCount: 0,
    scenes: [],
    plannerValid: true,
    skippedEventCount: 0,
    skippedReasons: new Map(),
    hardBoundaryCounts: new Map()
  };
  let run = [];
  let activeGroup = null;

  function boundary(reason) {
    finalizeRun(run, output, minimumMeaningfulLength);
    run = [];
    activeGroup = null;
    output.hardBoundaryCounts.set(reason, (output.hardBoundaryCounts.get(reason) || 0) + 1);
  }

  for (const document of [...documents].sort((left, right) => left.spineIndex - right.spineIndex)) {
    boundary('document-start');
    for (const event of document.events || []) {
      const point = { spineIndex: document.spineIndex, eventIndex: event.eventIndex };
      const section = sectionFor(bookModel, point);
      if (!section || section.includedInReading === false || section.type === 'navigation') {
        boundary('excluded-section');
        continue;
      }
      if (event.type === 'image') {
        boundary('image');
        continue;
      }
      if (event.type === 'thematic-break') {
        boundary('thematic-break');
        continue;
      }
      if (event.type === 'heading') {
        boundary('heading');
        continue;
      }
      if (event.type === 'soft-break') continue;
      if (event.type !== 'text-block') continue;

      const group = boundaryGroup(document, section);
      if (activeGroup != null && activeGroup !== group) boundary('section-change');
      activeGroup = group;
      const built = eventCandidates(document, event, section);
      if (!built.valid) {
        output.skippedEventCount += 1;
        output.skippedReasons.set(built.reason, (output.skippedReasons.get(built.reason) || 0) + 1);
        boundary('invalid-event-candidate');
        continue;
      }
      run.push(...built.candidates);
    }
    boundary('document-end');
  }

  finalizeRun(run, output, minimumMeaningfulLength);
  const scenes = Object.freeze(output.scenes.map(scene => Object.freeze(scene)));
  const roleCounts = {};
  const reasonCounts = {};
  for (const scene of scenes) {
    roleCounts[scene.sectionType || 'unknown'] = (roleCounts[scene.sectionType || 'unknown'] || 0) + 1;
    reasonCounts[scene.planningReason] = (reasonCounts[scene.planningReason] || 0) + 1;
  }
  return Object.freeze({
    schemaVersion: '14.4',
    mode: 'diagnostic-only',
    minimumMeaningfulLength,
    candidateCount: output.candidateCount,
    contextualSceneCount: scenes.length,
    sourceTextEventCount: documents.reduce((sum, document) => sum + (document.events || []).filter(event => event.type === 'text-block').length, 0),
    plannerValid: output.plannerValid,
    skippedEventCount: output.skippedEventCount,
    skippedReasons: Object.freeze(Object.fromEntries(output.skippedReasons)),
    hardBoundaryCounts: Object.freeze(Object.fromEntries(output.hardBoundaryCounts)),
    planningReasonCounts: Object.freeze(reasonCounts),
    sectionRoleCounts: Object.freeze(roleCounts),
    forwardAttachmentSceneCount: scenes.filter(scene => scene.attachmentDirection === 'forward').length,
    backwardAttachmentSceneCount: scenes.filter(scene => scene.attachmentDirection === 'backward').length,
    insufficientContextSceneCount: scenes.filter(scene => scene.meaningfulLength < minimumMeaningfulLength).length,
    multiCandidateSceneCount: scenes.filter(scene => scene.sourceCandidateCount > 1).length,
    multiEventSceneCount: scenes.filter(scene => scene.sourceEventCount > 1).length,
    maximumMeaningfulLength: scenes.reduce((maximum, scene) => Math.max(maximum, scene.meaningfulLength), 0),
    maximumPlainTextLength: scenes.reduce((maximum, scene) => Math.max(maximum, scene.plainTextLength), 0),
    averageMeaningfulLength: scenes.length
      ? Number((scenes.reduce((sum, scene) => sum + scene.meaningfulLength, 0) / scenes.length).toFixed(2))
      : 0,
    allMarkupSlicesReconstruct: scenes.every(scene => scene.reconstructsMarkupVisibleText),
    sceneSummaries: scenes
  });
}
