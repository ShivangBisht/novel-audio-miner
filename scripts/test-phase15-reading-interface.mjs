import assert from 'node:assert/strict';
import fs from 'node:fs';

const reader = fs.readFileSync('src/components/Reader.jsx', 'utf8');
const chrome = fs.readFileSync('src/components/reader/ReaderChrome.jsx', 'utf8');
const shell = fs.readFileSync('src/components/reader/ReaderShell.jsx', 'utf8');
const workspace = fs.readFileSync('src/components/SettingsWorkspace.jsx', 'utf8');
const styles = fs.readFileSync('src/styles.css', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

for (const component of ['ReaderHeader', 'ReaderNavigation', 'ReaderSidebarToggle', 'ReaderSceneFrame']) {
  assert.ok(chrome.includes(`export function ${component}(`), `missing ${component}`);
  assert.ok(reader.includes(`<${component}`), `Reader does not use ${component}`);
}

for (const token of [
  'aria-label="Reader navigation"',
  'aria-label="Previous scene"',
  'aria-label="Next scene"',
  'reader-progress-track',
  'reader-scene-frame-text',
  'reader-scene-frame-illustration',
  'PHASE15_3_READING_INTERFACE_BEGIN',
  '--app-font:',
  '.sentence-content {',
  '@media (prefers-reduced-motion: reduce)'
]) assert.ok((chrome + shell + styles).includes(token), `missing reading UI contract: ${token}`);

for (const token of [
  'resolveDomVisualSelection({',
  'resolveLogicalSentenceSelection({',
  'analyzeJpAnalyzerSentenceOnDemand(',
  'qualifyLogicalTeachingInput({',
  'planRollingTextScenePrefetch(displayItems, itemIndex)',
  'resolveAnalyzerReaderContextForOffsets(',
  '<TeachingPanel',
  '<SettingsWorkspace',
  'fontFamily: FONT_STACKS[readerStyle.fontFamily]'
]) assert.ok(reader.includes(token), `frozen Reader contract missing: ${token}`);

for (const token of [
  "import DictionaryManagementPanel from './DictionaryManagementPanel.jsx'",
  '<DictionaryManagementPanel'
]) assert.ok(workspace.includes(token), `Settings workspace contract missing: ${token}`);

assert.equal(reader.includes('<DictionaryManagementPanel'), false, 'Dictionary Management must remain outside the reading interface');
assert.equal(reader.includes('<div className="nav-header">'), false);
assert.equal(reader.includes('Load another book'), false);
assert.match(pkg.scripts?.['test:phase15.3'] || '', /test:phase15\.2/);
console.log('Phase 15.3 reading interface and Settings boundary tests passed');
