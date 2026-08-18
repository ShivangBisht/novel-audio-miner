import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  interactionMatchesAnalyzerElement,
  isReaderSpanActivationKey,
  readAnalyzerElementIdentity
} from '../src/lib/readerSpanInteraction.js';

function element(start, end, surface = '走った') {
  return { dataset: { analyzerStart: String(start), analyzerEnd: String(end), token: surface }, textContent: surface };
}
const target = element(2, 5);
assert.deepEqual(readAnalyzerElementIdentity(target), { start: 2, end: 5, surface: '走った' });
assert.equal(readAnalyzerElementIdentity(element(5, 2)), null);
assert.equal(interactionMatchesAnalyzerElement({ spanStart: 2, spanEnd: 5 }, target), true);
assert.equal(interactionMatchesAnalyzerElement({ spanStart: 2, spanEnd: 4 }, target), false);
assert.equal(isReaderSpanActivationKey('Enter'), true);
assert.equal(isReaderSpanActivationKey(' '), true);
assert.equal(isReaderSpanActivationKey('Escape'), false);

const reader = fs.readFileSync('src/components/Reader.jsx', 'utf8');
for (const token of [
  'data-reader-interactive="true"',
  'role="button"',
  'tabIndex={0}',
  "span.dataset.readerInteractive = 'true';",
  "span.setAttribute('role', 'button');",
  'function activateAnalyzerElement(element, entryPoint = \'pointer\')',
  'function handleReaderSpanClick(event)',
  'function handleReaderSpanKeyDown(event)',
  "event.key === 'Escape'",
  "element.classList.toggle('reader-span-selected', selected)",
  "element.setAttribute('aria-selected', selected ? 'true' : 'false')",
  'onClick={handleReaderSpanClick}',
  'onKeyDown={handleReaderSpanKeyDown}'
]) assert.ok(reader.includes(token), `missing Alpha 3 Reader behavior: ${token}`);
assert.ok(reader.includes("if (teachingMode) return;"), 'Teaching pointer ownership must remain isolated');
assert.ok(reader.includes("if (selection && !selection.isCollapsed) return;"), 'native drag selection must remain authoritative');

const css = fs.readFileSync('src/styles.css', 'utf8');
assert.ok(css.includes('.reader-span-selected'));
assert.ok(css.includes('[data-reader-interactive="true"]:focus-visible'));
console.log('Alpha 3 selection interaction tests passed');
