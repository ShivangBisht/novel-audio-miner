import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = relative => readFileSync(resolve(root, relative), 'utf8');
const pkg = JSON.parse(read('package.json'));
const required = [
  'docs/PHASE14_ARCHITECTURE_OVERVIEW.md',
  'docs/PHASE14_7_CONSOLIDATION_CLEANUP.md',
  'src/lib/scenePlanning/textRanges.js',
  'src/lib/scenePlanning/minimumContextPlanner.js',
  'src/lib/scenePlanning/markupRanges.js',
  'src/lib/scenePlanning/contextualScenes.js',
  'src/lib/scenePlanning/logicalSentenceSelection.js',
  'src/lib/scenePlanning/domVisualSelection.js',
  'src/lib/scenePlanning/teachingInputQualification.js'
];
for (const relative of required) assert.equal(existsSync(resolve(root, relative)), true, `missing ${relative}`);
for (const command of ['test:phase14.6', 'test:phase14', 'validate:phase14.7']) {
  assert.equal(typeof pkg.scripts?.[command], 'string', `missing command ${command}`);
}
const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
const forbiddenPatterns = [
  /(^|\/)dist\//, /(^|\/)node_modules\//, /(^|\/)__pycache__\//,
  /\.pyc$/i, /\.epub$/i, /(^|\/)PHASE14_.*_SOURCE\.md$/i,
  /(^|\/)apply_phase14.*\.py$/i, /(^|\/)collect_phase14.*\.(py|ps1)$/i,
  /debug[-_ ]?report.*\.json$/i, /(^|\/)\.env(\.|$)/i
];
for (const path of tracked) for (const pattern of forbiddenPatterns) {
  assert.equal(pattern.test(path), false, `tracked cleanup artifact: ${path}`);
}
const retired = [
  'src/lib/tokenizer.js', 'src/lib/wordModel.js',
  'src/lib/legacyKuromojiSceneModel.js', 'src/lib/analyzerShadowComparison.js',
  'src/lib/analyzerWordAdapter.js'
];
for (const relative of retired) assert.equal(existsSync(resolve(root, relative)), false, `retired file restored: ${relative}`);
const reader = read('src/components/Reader.jsx');
for (const marker of ['LEGACY_KUROMOJI', 'getLegacyKuromojiSceneModel']) {
  assert.equal(reader.includes(marker), false, `retired Reader marker restored: ${marker}`);
}
for (const marker of ['resolveDomVisualSelection', 'resolveLogicalSentenceSelection', 'analyzeJpAnalyzerSentenceOnDemand', 'qualifyLogicalTeachingInput']) {
  assert.equal(reader.includes(marker), true, `missing Phase 14.5A runtime ownership: ${marker}`);
}
const overview = read('docs/PHASE14_ARCHITECTURE_OVERVIEW.md');
for (const marker of ['contextual visual scenes', 'logical sentence', 'Preserved formal contracts']) {
  assert.equal(overview.includes(marker), true, `overview missing ${marker}`);
}
console.log('Phase 14.7 consolidation and repository hygiene validation passed');
