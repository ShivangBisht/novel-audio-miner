import assert from 'node:assert/strict';
import fs from 'node:fs';

const reader = fs.readFileSync('src/components/Reader.jsx', 'utf8');
const chrome = fs.readFileSync('src/components/reader/ReaderChrome.jsx', 'utf8');
const styles = fs.readFileSync('src/styles.css', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

for (const group of ['book', 'navigation', 'new-words', 'illustrations', 'display']) {
  assert.ok(reader.includes(`data-sidebar-group="${group}"`), `missing sidebar group ${group}`);
}
for (const label of ['Book', 'Navigation', 'New Words', 'Illustrations', 'Display']) {
  assert.ok(reader.includes(`reader-sidebar-section-title">${label}`), `missing sidebar label ${label}`);
}
assert.ok(reader.includes('className="reader-tools-layer"'));
assert.ok(reader.includes('className="reader-tools-panel"'));
assert.ok(chrome.includes('onOpenTools'));
assert.ok(chrome.includes('aria-label="Open settings and tools"'));
assert.ok(styles.includes('PHASE15_4_SIDEBAR_INFORMATION_ARCHITECTURE_BEGIN'));

const sidebarStart = reader.indexOf('<ReaderSidebar open={sidebarOpen}>');
const sidebarEnd = reader.indexOf('</ReaderSidebar>', sidebarStart);
const sidebar = reader.slice(sidebarStart, sidebarEnd);
for (const forbidden of [
  '<DictionaryManagementPanel', 'Session Token:', 'Rebuild Cache',
  'Clear Anki Cache', 'Force TTS:', 'Debug Mode:', 'Debug Report',
  'Include full EPUB parser inventory'
]) assert.equal(sidebar.includes(forbidden), false, `administrative control remains in sidebar: ${forbidden}`);

for (const preserved of [
  '<DictionaryManagementPanel', 'Session Token:', 'Rebuild Cache',
  'Clear Anki Cache', 'Force TTS:', 'Debug Mode:', 'Debug Report',
  'Include full EPUB parser inventory', 'clearJpAnalyzerShadowCache'
]) assert.ok(reader.includes(preserved), `preserved tool missing: ${preserved}`);

for (const frozen of [
  'resolveDomVisualSelection({', 'resolveLogicalSentenceSelection({',
  'qualifyLogicalTeachingInput({', 'planRollingTextScenePrefetch(displayItems, itemIndex)',
  'resolveAnalyzerReaderContextForOffsets(', '<TeachingPanel',
  'fontFamily: FONT_STACKS[readerStyle.fontFamily]'
]) assert.ok(reader.includes(frozen), `frozen Reader contract missing: ${frozen}`);

assert.match(pkg.scripts?.['test:phase15.4'] || '', /test:phase15\.3/);
console.log('Phase 15.4 sidebar information architecture tests passed');
