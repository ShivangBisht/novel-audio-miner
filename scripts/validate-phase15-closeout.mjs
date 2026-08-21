import assert from 'node:assert/strict';
import fs from 'node:fs';
const shell=fs.readFileSync('src/components/reader/ReaderShell.jsx','utf8');const reader=fs.readFileSync('src/components/Reader.jsx','utf8');const css=fs.readFileSync('src/styles.css','utf8');const snap=fs.readFileSync('docs/PROJECT_SNAPSHOT_CURRENT.md','utf8');const close=fs.readFileSync('docs/PHASE15_10_FINAL_CLOSEOUT.md','utf8');const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
for(const retired of ['export function ReaderTopBar(', 'ReaderTopBar'])assert.equal((shell+reader).includes(retired),false,retired);
for(const retired of ['.nav-header {','.action-bar {','.reader-tools-layer {','.reader-tools-panel {','.reader-sidebar-book h2','.reader-sidebar-progress {'])assert.equal(css.includes(retired),false,retired);
for(const token of ['Authoritative Phase 15 closeout status','Production baseline:** Phase 15 complete','Next planned phase:** Phase 16'])assert.ok(snap.includes(token),token);
for(const token of ['Phase 15.10 Final Closeout','phase15-complete','database hashes remain unchanged','500 kB'])assert.ok(close.includes(token),token);
assert.equal(pkg.scripts['validate:phase15.10'],'node scripts/validate-phase15-closeout.mjs');console.log('Phase 15.10 cleanup, snapshot, and closeout validation passed');
