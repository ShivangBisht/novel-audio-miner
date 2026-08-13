import assert from 'node:assert/strict';
import {
  buildAtomicTextRanges,
  meaningfulCharacterCount,
  validateAtomicTextRanges
} from '../src/lib/scenePlanning/textRanges.js';

assert.equal(meaningfulCharacterCount('♠'), 0);
assert.equal(meaningfulCharacterCount('と。'), 1);
assert.equal(meaningfulCharacterCount('けれど。'), 3);
assert.equal(meaningfulCharacterCount('「そうですか」'), 5);
assert.equal(meaningfulCharacterCount('ＡＢＣ１２３！？'), 6);

const examples = [
  '♠これは同じ文章です。',
  'けれど。次の完全な文です。',
  'うちだって無理よ。次の説明です。',
  'と。次の完全な文です。',
  '「そう……というわけでは」彼女は答えた。',
  '「一つ目。二つ目？」彼女は答えた。',
  '終端記号がない文章'
];
for (const source of examples) {
  const ranges = buildAtomicTextRanges(source);
  const validation = validateAtomicTextRanges(source, ranges);
  assert.equal(validation.valid, true, `${source}: ${validation.errors.join(',')}`);
  assert.equal(validation.reconstructedText, source);
  assert.equal(ranges.every((range, index) => index === 0 || range.start === ranges[index - 1].end), true);
}

const dialogue = buildAtomicTextRanges('「一つ目。二つ目？」彼女は答えた。', { forceFallback: true });
assert.equal(dialogue[0].plainText, '「一つ目。二つ目？」');
assert.equal(dialogue[0].atomicReason, 'quote-group');
assert.equal(dialogue[1].plainText, '彼女は答えた。');

const symbol = buildAtomicTextRanges('♠', { forceFallback: true });
assert.equal(symbol.length, 1);
assert.equal(symbol[0].atomicReason, 'symbol-only');
assert.equal(symbol[0].meaningfulLength, 0);

const fallback = buildAtomicTextRanges('けれど。次です。', { forceFallback: true, sourceBlockId: 'block-1' });
assert.deepEqual(fallback.map(range => range.plainText), ['けれど。', '次です。']);
assert.equal(fallback[0].sourceBlockId, 'block-1');

console.log('Phase 14.1 atomic text-range tests passed');
