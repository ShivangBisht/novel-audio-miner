import assert from 'node:assert/strict';
import {
  DEFAULT_FORWARD_LIMIT,
  findAdjacentTextScenes,
  planRollingTextScenePrefetch
} from '../src/lib/scenePrefetch.js';

const scene = text => ({ type: 'scene', data: { plainText: text } });
const image = () => ({ type: 'illustration', data: { dataUri: 'data:image/png;base64,x' } });

const items = [
  scene('previous'), image(), scene('current'), image(), scene('next-1'),
  scene('next-2'), image(), scene('next-3'), scene('next-4'), scene('next-5'),
  image(), scene('next-6'), scene('next-7'), scene('next-8'), scene('next-9'),
  scene('next-10'), scene('next-11')
];

const plan = planRollingTextScenePrefetch(items, 2);
assert.equal(plan.forwardLimit, DEFAULT_FORWARD_LIMIT);
assert.equal(plan.forward.length, 10);
assert.equal(plan.previous.text, 'previous');
assert.deepEqual(plan.ordered.map(target => target.text), [
  'next-1', 'next-2', 'next-3', 'next-4', 'next-5',
  'previous',
  'next-6', 'next-7', 'next-8', 'next-9', 'next-10'
]);
assert.deepEqual(plan.ordered.map(target => target.queuePriority), [1,2,3,4,5,6,7,8,9,10,11]);
assert.deepEqual(plan.ordered.map(target => target.priorityClass), [
  'forward-near','forward-near','forward-near','forward-near','forward-near',
  'previous-protection',
  'forward-window','forward-window','forward-window','forward-window','forward-window'
]);
assert.equal(plan.ordered.some(target => target.text === 'next-11'), false);

const nearEnd = planRollingTextScenePrefetch(items, 15);
assert.deepEqual(nearEnd.forward.map(target => target.text), ['next-11']);
assert.equal(nearEnd.previous.text, 'next-9');

const skipped = planRollingTextScenePrefetch([
  scene('current'), image(), scene('  '), image(), scene('valid')
], 0);
assert.deepEqual(skipped.texts, ['valid']);
assert.equal(skipped.forward[0].index, 4);
assert.equal(skipped.forward[0].textDistance, 1);

const duplicate = planRollingTextScenePrefetch([
  scene('previous-duplicate'), scene('current'), scene('same'), scene('same'), scene('later')
], 1);
assert.deepEqual(duplicate.texts, ['same', 'later', 'previous-duplicate']);
assert.equal(duplicate.ordered.filter(target => target.text === 'same').length, 1);

const noForward = planRollingTextScenePrefetch([scene('previous'), scene('current')], 1);
assert.deepEqual(noForward.texts, ['previous']);
assert.equal(noForward.previous.direction, 'previous');

const zero = planRollingTextScenePrefetch(items, 2, { forwardLimit: 0 });
assert.deepEqual(zero.forward, []);
assert.deepEqual(zero.texts, ['previous']);

const adjacent = findAdjacentTextScenes([
  scene('first'), image(), scene('second'), image(), scene('third')
], 2);
assert.equal(adjacent.next.text, 'third');
assert.equal(adjacent.previous.text, 'first');
assert.deepEqual(adjacent.ordered.map(target => target.text), ['third', 'first']);

assert.deepEqual(findAdjacentTextScenes([], 0), { next: null, previous: null, ordered: [] });
console.log('rolling text-scene prefetch planning tests passed');
