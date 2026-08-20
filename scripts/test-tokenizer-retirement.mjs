import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = relative => fs.readFileSync(new URL(relative, root), 'utf8');

const absent = [
  'src/lib/tokenizer.js',
  'src/lib/wordModel.js',
  'src/lib/legacyKuromojiSceneModel.js',
  'src/lib/analyzerShadowComparison.js',
  'src/lib/analyzerWordAdapter.js'
];
for (const relative of absent) {
  assert.equal(fs.existsSync(new URL(relative, root)), false, relative);
}

const pkg = JSON.parse(read('package.json'));
assert.equal('kuromoji' in (pkg.dependencies || {}), false, 'kuromoji dependency retired');

const reader = read('src/components/Reader.jsx');
const workspace = read('src/components/SettingsWorkspace.jsx');
for (const marker of [
  'LEGACY_KUROMOJI',
  'getLegacyKuromojiSceneModel',
  'isLearningCandidate',
  'getSelectedLearningTokens',
  'DictionaryDebugPanel',
  'JpAnalyzerIntegrationPanel'
]) assert.equal(reader.includes(marker), false, marker);

for (const action of [
  'Export Debug Report',
  'Copy diagnostic summary',
  'Clear cached sentence analyses'
]) assert.equal(workspace.includes(action), true, action);

assert.equal((reader + workspace).includes('Clear Analyzer Cache'), false, 'obsolete cache label retired');
assert.equal(reader.includes('clearJpAnalyzerShadowCache'), true, 'authoritative analyzer cache clear remains');
assert.equal(reader.includes('adaptReaderSpansForRendering'), true, 'authoritative readerSpans adapter remains');
assert.equal(reader.includes("learningOwnership.source !== 'jp-analyzer'"), true, 'JP Analyzer learning ownership remains');

const parser = read('src/lib/epubParser.js');
for (const marker of ['loadTokenizer', 'tokenizeText', 'classifiedWords', 'displayWords']) {
  assert.equal(parser.includes(marker), false, marker);
}

console.log('Tokenizer retirement and Settings debug-report compatibility checks passed.');
