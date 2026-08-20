import assert from 'node:assert/strict';
import fs from 'node:fs';

const reader = fs.readFileSync('src/components/Reader.jsx', 'utf8');
const chrome = fs.readFileSync('src/components/reader/ReaderChrome.jsx', 'utf8');
const workspace = fs.readFileSync('src/components/SettingsWorkspace.jsx', 'utf8');
const styles = fs.readFileSync('src/styles.css', 'utf8');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

for (const group of ['book', 'navigation', 'new-words', 'illustrations', 'display']) {
  assert.ok(reader.includes(`data-sidebar-group="${group}"`), `missing sidebar group ${group}`);
}
for (const label of ['Book', 'Navigation', 'New Words', 'Illustrations', 'Display']) {
  assert.ok(reader.includes(`reader-sidebar-section-title">${label}`), `missing sidebar label ${label}`);
}

assert.ok(reader.includes("import SettingsWorkspace from './SettingsWorkspace.jsx'"));
assert.ok(reader.includes('<SettingsWorkspace'));
assert.ok(chrome.includes('onOpenTools'));
assert.ok(chrome.includes('aria-label="Open settings and tools"'));

for (const token of [
  'className="settings-workspace-layer"',
  'className="settings-workspace"',
  'className="settings-workspace-header"',
  'className="settings-workspace-content"',
  'aria-labelledby="settings-workspace-title"',
  '<DictionaryManagementPanel',
  '<TeachingAdvancedDashboard',
  'Session token',
  'Rebuild known-word cache',
  'Clear Anki cache',
  'Force TTS',
  'Debug mode',
  'Debug Report v2',
  'Include full EPUB parser inventory'
]) assert.ok(workspace.includes(token), `workspace tool missing: ${token}`);

const sidebarStart = reader.indexOf('<ReaderSidebar open={sidebarOpen}>');
const sidebarEnd = reader.indexOf('</ReaderSidebar>', sidebarStart);
assert.ok(sidebarStart >= 0 && sidebarEnd > sidebarStart, 'Reader sidebar boundary missing');
const sidebar = reader.slice(sidebarStart, sidebarEnd);
for (const forbidden of [
  '<DictionaryManagementPanel', 'Session token', 'Rebuild known-word cache',
  'Clear Anki cache', 'Force TTS', 'Debug mode', 'Debug Report v2',
  'Include full EPUB parser inventory', '<TeachingAdvancedDashboard'
]) assert.equal(sidebar.includes(forbidden), false, `administrative control remains in sidebar: ${forbidden}`);

for (const retired of [
  'className="reader-tools-layer"',
  'className="reader-tools-panel"',
  'className="reader-tools-header"',
  'className="reader-tools-content"',
  '<details className="dictionary-settings">',
  '<details className="advanced-settings">'
]) assert.equal(reader.includes(retired), false, `retired inline tools markup remains: ${retired}`);

for (const frozen of [
  'resolveDomVisualSelection({', 'resolveLogicalSentenceSelection({',
  'qualifyLogicalTeachingInput({', 'planRollingTextScenePrefetch(displayItems, itemIndex)',
  'resolveAnalyzerReaderContextForOffsets(', '<TeachingPanel',
  'fontFamily: FONT_STACKS[readerStyle.fontFamily]',
  'onClearAnalyzerCache={clearJpAnalyzerShadowCache}',
  'contractDiagnostics={buildContractDiagnostics()}',
  'persistenceDiagnostics={inspectPersistenceHealth(localStorage)}'
]) assert.ok(reader.includes(frozen), `frozen Reader contract missing: ${frozen}`);

assert.ok(styles.includes('PHASE15_4_SIDEBAR_INFORMATION_ARCHITECTURE_BEGIN'));
assert.ok(styles.includes('PHASE15_7_SETTINGS_WORKSPACE_BEGIN'));
assert.match(pkg.scripts?.['test:phase15.4'] || '', /test:phase15\.3/);
console.log('Phase 15.4 sidebar information architecture tests passed');
