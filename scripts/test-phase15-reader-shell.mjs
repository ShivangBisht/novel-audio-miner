import assert from 'node:assert/strict';
import fs from 'node:fs';

const reader=fs.readFileSync('src/components/Reader.jsx','utf8');
const shell=fs.readFileSync('src/components/reader/ReaderShell.jsx','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));

for(const name of ['ReaderShell','ReaderStatusBar','ReaderTopBar','ReaderMainLayout','ReaderSidebar','ReaderViewport']) {
  assert.ok(shell.includes(`export function ${name}(`),`missing ${name}`);
}
for(const name of ['ReaderShell','ReaderStatusBar','ReaderMainLayout','ReaderSidebar','ReaderViewport']) {
  assert.ok(reader.includes(`<${name}`),`Reader does not use ${name}`);
}
const chrome = fs.existsSync('src/components/reader/ReaderChrome.jsx')
  ? fs.readFileSync('src/components/reader/ReaderChrome.jsx','utf8')
  : '';
assert.ok(
  reader.includes('<ReaderTopBar') || chrome.includes('export function ReaderHeader('),
  'Reader must use the legacy top bar or the Phase 15.3 ReaderHeader replacement'
);
for(const className of ['status-bar','topbar','main-layout','sidebar','reader-area']) {
  assert.ok(shell.includes(className),`shell missing preserved class ${className}`);
}
for(const token of [
  'resolveDomVisualSelection({','resolveLogicalSentenceSelection({',
  'analyzeJpAnalyzerSentenceOnDemand(','qualifyLogicalTeachingInput({',
  'planRollingTextScenePrefetch(displayItems, itemIndex)',
  'resolveAnalyzerReaderContextForOffsets(','<TeachingPanel',
  '<DictionaryManagementPanel'
]) assert.ok(reader.includes(token),`Reader runtime contract missing: ${token}`);
assert.equal(reader.includes('<div className="status-bar">'),false);
assert.equal(reader.includes('<div className="topbar">'),false);
assert.equal(reader.includes('<div className="main-layout">'),false);
assert.equal(reader.includes('<div className="reader-area">'),false);
assert.match(pkg.scripts?.['test:phase15.2']||'',/test:phase15\.1/);
console.log('Phase 15.2 Reader shell decomposition tests passed');
