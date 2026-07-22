import assert from 'node:assert/strict';
import { findAdjacentTextScenes } from '../src/lib/scenePrefetch.js';

const scene = text => ({ type: 'scene', data: { plainText: text } });
const image = () => ({ type: 'illustration', data: { dataUri: 'data:image/png;base64,x' } });

const items = [
  scene('first'),
  image(),
  scene('second'),
  image(),
  image(),
  scene('third'),
  scene('   '),
  scene('fourth')
];

const middle = findAdjacentTextScenes(items, 2);
assert.deepEqual(middle.next, { index: 5, text: 'third', direction: 'next' });
assert.deepEqual(middle.previous, { index: 0, text: 'first', direction: 'previous' });
assert.deepEqual(middle.ordered.map(target => target.text), ['third', 'first']);

const illustration = findAdjacentTextScenes(items, 3);
assert.equal(illustration.next.index, 5);
assert.equal(illustration.previous.index, 2);

const start = findAdjacentTextScenes(items, 0);
assert.equal(start.previous, null);
assert.equal(start.next.index, 2);

const duplicate = findAdjacentTextScenes([scene('same'), image(), scene('current'), image(), scene('same')], 2);
assert.equal(duplicate.ordered.length, 1);
assert.equal(duplicate.ordered[0].direction, 'next');

assert.deepEqual(findAdjacentTextScenes([], 0), { next: null, previous: null, ordered: [] });
console.log('adjacent text-scene prefetch tests passed');
