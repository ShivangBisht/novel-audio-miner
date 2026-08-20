import assert from 'node:assert/strict';import fs from 'node:fs';
const runner=fs.readFileSync('scripts/run-phase15-9-qualification.mjs','utf8');const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));const worksheet=fs.readFileSync('docs/PHASE15_9_RUNTIME_QUALIFICATION.md','utf8');
for(const token of ["spawnSync(file,args",'shell:false','frontendTests=[','test-phase13-closeout.mjs','validate-phase14-closeout.mjs','test-phase15-design-system.mjs','process.env.ComSpec','npm.cmd run build','/d','/s','/c','--backend','python,[\'-m\',\'pytest\']','JP Analyzer database hash guard','finally{','database hash changed','PHASE15_9_FRONTEND_COMMIT','actualCommit:frontendHead','expectedCommit:expectedFrontend||frontendHead','Phase15FunctionalQualification.v1','phase15_9_qualification.json'])assert.ok(runner.includes(token),token);
for(const forbidden of ['npm run test:phase15.8','shell:true'])assert.equal(runner.includes(forbidden),false,forbidden);
for(const token of ['Startup and shutdown','Reader and scenes','Mining and Teaching','Settings, accessibility, and responsive layouts','Repository and evidence','passed, failed, blocked, or not-applicable'])assert.ok(worksheet.includes(token),token);
assert.equal(pkg.scripts['test:phase15.9'],'node scripts/test-phase15-functional-qualification.mjs && node scripts/run-phase15-9-qualification.mjs');
assert.equal(pkg.scripts['qualify:phase15.9:backend'],'node scripts/run-phase15-9-qualification.mjs --backend');
console.log('Phase 15.9 functional qualification harness tests passed');
