import assert from 'node:assert/strict';
import fs from 'node:fs';

const required = [
  'docs/ALPHA_STABILIZATION_ROADMAP.md',
  'docs/ALPHA1_ARCHITECTURE_BASELINE.md',
  'docs/ALPHA_SOURCE_OF_TRUTH_MATRIX.md',
  'docs/ALPHA_ROUTE_CONTRACT_REGISTRY.md',
  'docs/ALPHA_PERSISTENCE_REGISTRY.md',
  'docs/ALPHA_DEPRECATION_INVENTORY.md',
  'docs/PHASE15_RESUMPTION_PLAN.md',
  'docs/PHASE16_ROADMAP.md',
  'docs/ALPHA_BASELINE_MANIFEST.json'
];
for (const path of required) assert.ok(fs.existsSync(path), `missing ${path}`);
const manifest = JSON.parse(fs.readFileSync('docs/ALPHA_BASELINE_MANIFEST.json','utf8'));
assert.equal(manifest.schema, 'AlphaArchitectureBaseline.v1');
assert.equal(manifest.frontend.commit, 'b38caa0ce0e59853f4e1836330f7b21f349641d9');
assert.equal(manifest.backend.commit, 'fb794954135ab18c9a7e0039a76b51b69b6a3d16');
assert.equal(manifest.workflow.yomitan, 'standalone-kiku-note-creation');
assert.equal(manifest.workflow.novelAudioMiner, 'latest-kiku-note-enrichment');
assert.equal(manifest.workflow.jpAnalyzer, 'linguistic-authority');
const alpha = fs.readFileSync(required[0], 'utf8');
for (let index=1; index<=10; index++) assert.ok(alpha.includes(`Alpha ${index}:`), `missing Alpha ${index}`);
const phase16 = fs.readFileSync('docs/PHASE16_ROADMAP.md','utf8');
for (let index=1; index<=10; index++) assert.ok(phase16.includes(`Phase 16.${index}:`), `missing Phase 16.${index}`);
const snapshot = fs.readFileSync('docs/PROJECT_SNAPSHOT_CURRENT.md','utf8');
assert.ok(snapshot.includes('ALPHA_STABILIZATION_BASELINE_START'));
assert.ok(snapshot.includes('PHASE16_ROADMAP.md'));
console.log('Alpha 1 architecture baseline validation passed');
