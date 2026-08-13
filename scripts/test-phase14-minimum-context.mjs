import assert from 'node:assert/strict';
import { buildAtomicTextRanges } from '../src/lib/scenePlanning/textRanges.js';
import {
  DEFAULT_MINIMUM_MEANINGFUL_LENGTH,
  planMinimumContextScenes
} from '../src/lib/scenePlanning/minimumContextPlanner.js';

function candidates(text, options = {}) {
  return buildAtomicTextRanges(text, { forceFallback: true }).map(candidate => ({
    ...candidate,
    ...options
  }));
}

assert.equal(DEFAULT_MINIMUM_MEANINGFUL_LENGTH, 8);

const normal = planMinimumContextScenes(candidates('これは十分に長い文です。次も十分に長い文です。'));
assert.equal(normal.scenes.length, 2);
assert.equal(normal.scenes[0].planningReason, 'standalone-sufficient');
assert.deepEqual(normal.scenes[0].sourceCandidateIndexes, [0]);

const short = planMinimumContextScenes(candidates('けれど。次の完全な文です。'));
assert.equal(short.scenes.length, 1);
assert.equal(short.scenes[0].plainText, 'けれど。次の完全な文です。');
assert.equal(short.scenes[0].attachmentDirection, 'forward');
assert.equal(short.scenes[0].attachmentCount, 1);
assert.equal(short.scenes[0].planningReason, 'minimum-context-reached');

const multiple = planMinimumContextScenes(candidates('と。次。さらに説明します。'));
assert.equal(multiple.scenes.length, 1);
assert.equal(multiple.scenes[0].plainText, 'と。次。さらに説明します。');
assert.equal(multiple.scenes[0].attachmentCount, 2);

const dialogue = planMinimumContextScenes(candidates('「そうですか」彼女は静かにうなずいた。'));
assert.equal(dialogue.scenes.length, 1);
assert.equal(dialogue.scenes[0].sourceCandidates[0].atomicReason, 'quote-group');
assert.equal(dialogue.scenes[0].plainText, '「そうですか」彼女は静かにうなずいた。');

const symbol = planMinimumContextScenes(candidates('♠これは同じ文章です。'));
assert.equal(symbol.scenes.length, 1);
assert.equal(symbol.scenes[0].plainText, '♠これは同じ文章です。');

const hard = candidates('と。次の完全な文です。');
hard[0] = { ...hard[0], hardBoundaryAfter: true, boundaryGroup: 'left' };
hard[1] = { ...hard[1], hardBoundaryBefore: true, boundaryGroup: 'right' };
const hardPlan = planMinimumContextScenes(hard);
assert.equal(hardPlan.scenes.length, 2);
assert.equal(hardPlan.scenes[0].plainText, 'と。');
assert.equal(hardPlan.scenes[0].planningReason, 'no-safe-attachment-hard-boundary');
assert.equal(hardPlan.scenes[0].boundaryAfter, 'hard-boundary');

const backwardSource = candidates('これは十分に長い文です。と。');
const backward = planMinimumContextScenes(backwardSource);
assert.equal(backward.scenes.length, 1);
assert.equal(backward.scenes[0].plainText, 'これは十分に長い文です。と。');
assert.equal(backward.scenes[0].attachmentDirection, 'backward');
assert.equal(backward.scenes[0].planningReason, 'backward-fallback');

const isolated = candidates('これは十分に長い文です。と。');
isolated[0] = { ...isolated[0], hardBoundaryAfter: true };
isolated[1] = { ...isolated[1], hardBoundaryBefore: true };
const isolatedPlan = planMinimumContextScenes(isolated);
assert.equal(isolatedPlan.scenes.length, 2);
assert.equal(isolatedPlan.scenes[1].planningReason, 'no-safe-attachment-end-of-input');

const custom = planMinimumContextScenes(candidates('短い。次です。'), {
  minimumMeaningfulLength: 3
});
assert.equal(custom.minimumMeaningfulLength, 3);
assert.equal(custom.scenes.length, 1);
assert.equal(custom.scenes[0].plainText, '短い。次です。');
assert.equal(custom.scenes[0].attachmentDirection, 'forward');
assert.equal(custom.scenes[0].attachmentCount, 1);
assert.equal(
  custom.scenes[0].planningReason,
  'minimum-context-reached'
);

for (const plan of [normal, short, multiple, dialogue, symbol, hardPlan, backward, isolatedPlan, custom]) {
  assert.equal(plan.diagnostics.valid, true);
  assert.equal(plan.diagnostics.reconstructedTextMatches, true);
  assert.equal(plan.diagnostics.assignedCandidateCount, plan.candidateCount);
  assert.equal(plan.diagnostics.uniqueCandidateCount, plan.candidateCount);
}

console.log('Phase 14.2 minimum-context scene planner tests passed');
