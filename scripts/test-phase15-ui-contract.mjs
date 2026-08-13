import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  PHASE15_ADMIN_GROUPS,
  PHASE15_FROZEN_CONTRACTS,
  PHASE15_READER_SIDEBAR_GROUPS,
  PHASE15_UI_CONTRACT_VERSION,
  PHASE15_UI_REGIONS,
  PHASE15_VISUAL_PRINCIPLES
} from '../src/lib/ui/phase15UiContract.js';

assert.equal(PHASE15_UI_CONTRACT_VERSION, '15.1');
assert.deepEqual(PHASE15_UI_REGIONS, [
  'application-bar', 'reader-header', 'reader-navigation', 'reader-sidebar',
  'reader-viewport', 'reader-actions', 'teaching-surface',
  'settings-administration-workspace'
]);
assert.deepEqual(PHASE15_READER_SIDEBAR_GROUPS, [
  'book', 'navigation', 'new-words', 'illustrations', 'display'
]);
assert.deepEqual(PHASE15_ADMIN_GROUPS, [
  'reading-preferences', 'integrations', 'dictionaries',
  'teaching-administration', 'diagnostics'
]);
for (const contract of [
  'epub-runtime', 'contextual-scenes', 'logical-sentence-ownership',
  'jp-analyzer-record', 'teaching-persistence', 'mining-semantics',
  'prefetch-scheduling'
]) assert.ok(PHASE15_FROZEN_CONTRACTS.includes(contract), contract);
assert.equal(PHASE15_VISUAL_PRINCIPLES.bookTypography, 'preserve-epub-when-available');
assert.equal(PHASE15_VISUAL_PRINCIPLES.consistency, 'single-visual-language');

const plan = fs.readFileSync('docs/PHASE15_UI_OVERHAUL_PLAN.md', 'utf8');
const freeze = fs.readFileSync('docs/PHASE15_1_UI_CONTRACT_FREEZE.md', 'utf8');
const snapshot = fs.readFileSync('docs/PROJECT_SNAPSHOT_CURRENT.md', 'utf8');
for (const marker of [
  'Phase 15 UI Overhaul Plan', 'Frozen processing boundary',
  '15.10 Cleanup, snapshots, and closeout', 'No JP Analyzer production change'
]) assert.ok(plan.includes(marker), marker);
for (const marker of [
  'Canonical regions', 'Default reading sidebar', 'Display adapters',
  'Typography and visual harmony'
]) assert.ok(freeze.includes(marker), marker);
assert.ok(snapshot.includes('docs/PHASE15_UI_OVERHAUL_PLAN.md'));
assert.ok(snapshot.includes('Phase 15 UI overhaul baseline'));

console.log('Phase 15.1 UI contract freeze tests passed');
