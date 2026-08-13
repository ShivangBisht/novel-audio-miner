import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const pkg=JSON.parse(read('package.json'));
for(const command of ['test:phase14','test:phase14.6','validate:phase14.7','validate:phase14.8']) assert.equal(typeof pkg.scripts?.[command],'string',`missing ${command}`);
for(const path of ['docs/PROJECT_SNAPSHOT_CURRENT.md','docs/PHASE14_ARCHITECTURE_OVERVIEW.md','docs/PHASE14_7_CONSOLIDATION_CLEANUP.md','docs/PHASE14_8_FINAL_CLOSEOUT.md']) assert.equal(existsSync(resolve(root,path)),true,`missing ${path}`);
const snapshot=read('docs/PROJECT_SNAPSHOT_CURRENT.md');
for(const marker of ['Current production baseline:** Phase 14 complete','Phase 13 authoritative EPUB pipeline','Phase 14 contextual Reader architecture','Phase 15 continuation rule']) assert.equal(snapshot.includes(marker),true,`snapshot missing ${marker}`);
const tracked=execFileSync('git',['ls-files'],{cwd:root,encoding:'utf8'}).split(/\r?\n/).filter(Boolean);
for(const path of tracked){
 assert.equal(/\.epub$/i.test(path),false,`tracked EPUB: ${path}`);
 assert.equal(/(^|\/)\.env(\.|$)/i.test(path),false,`tracked environment: ${path}`);
 assert.equal(/(^|\/)(apply|collect)_phase14/i.test(path),false,`tracked transfer tool: ${path}`);
}
console.log('Phase 14.8 final closeout validation passed');
