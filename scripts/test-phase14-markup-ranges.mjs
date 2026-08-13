import assert from 'node:assert/strict';
import { buildAtomicTextRanges } from '../src/lib/scenePlanning/textRanges.js';
import {
  buildMarkupSlices,
  combineMarkupSlices,
  sliceInlineHtmlByVisibleRange,
  visibleTextFromInlineHtml
} from '../src/lib/scenePlanning/markupRanges.js';

const rubyHtml = '<ruby>漢字<rt>かんじ</rt></ruby>を読む。次へ進む。';
const rubyText = '漢字を読む。次へ進む。';
assert.equal(visibleTextFromInlineHtml(rubyHtml), rubyText);
const rubyRanges = buildAtomicTextRanges(rubyText, { forceFallback: true });
const rubySlices = buildMarkupSlices(rubyHtml, rubyRanges);
assert.equal(rubySlices.diagnostics.valid, true);
assert.equal(rubySlices.slices.length, 2);
assert.equal(rubySlices.slices[0].plainText, '漢字を読む。');
assert.match(rubySlices.slices[0].htmlText, /<ruby>漢字<rt>かんじ<\/rt><\/ruby>を読む。/);
assert.equal(rubySlices.slices[1].plainText, '次へ進む。');
assert.equal(rubySlices.slices[1].htmlText, '次へ進む。');

const emphasisHtml = '<strong>短い。</strong><em>次の完全な文です。</em>';
const emphasisText = '短い。次の完全な文です。';
const emphasisRanges = buildAtomicTextRanges(emphasisText, { forceFallback: true });
const emphasisSlices = buildMarkupSlices(emphasisHtml, emphasisRanges);
assert.equal(emphasisSlices.diagnostics.valid, true);
assert.equal(emphasisSlices.slices[0].htmlText, '<strong>短い。</strong>');
assert.equal(emphasisSlices.slices[1].htmlText, '<em>次の完全な文です。</em>');
const combined = combineMarkupSlices(emphasisSlices.slices);
assert.equal(combined.plainText, emphasisText);
assert.equal(combined.htmlText, emphasisHtml);

const entityHtml = 'A&amp;B。C&#33;';
assert.equal(visibleTextFromInlineHtml(entityHtml), 'A&B。C!');
const entitySlice = sliceInlineHtmlByVisibleRange(entityHtml, 0, 4);
assert.equal(entitySlice.plainText, 'A&B。');
assert.equal(entitySlice.htmlText, 'A&amp;B。');

const nestedHtml = '<span class="a">前<em>半</em></span>。<strong>後半。</strong>';
const nestedText = '前半。後半。';
const nestedRanges = buildAtomicTextRanges(nestedText, { forceFallback: true });
const nested = buildMarkupSlices(nestedHtml, nestedRanges);
assert.equal(nested.diagnostics.valid, true);
assert.equal(visibleTextFromInlineHtml(nested.slices[0].htmlText), nested.slices[0].plainText);
assert.equal(visibleTextFromInlineHtml(nested.slices[1].htmlText), nested.slices[1].plainText);

const breakHtml = '一行目<br>二行目。';
assert.equal(visibleTextFromInlineHtml(breakHtml), '一行目\n二行目。');

console.log('Phase 14.3 markup-preserving range tests passed');
