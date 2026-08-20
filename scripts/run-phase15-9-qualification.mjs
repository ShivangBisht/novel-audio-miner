import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';

const root=resolve(import.meta.dirname,'..');
const backend=resolve(process.env.JP_ANALYZER_ROOT||join(root,'..','JP analyzer'));
const evidenceDir=resolve(process.env.PHASE15_9_EVIDENCE_DIR||join(root,'..','_PROJECT_WORK'));
const runBackend=process.argv.includes('--backend');
const expectedFrontend=String(process.env.PHASE15_9_FRONTEND_COMMIT||'').trim()||null;
const expectedBackend=String(process.env.PHASE15_9_BACKEND_COMMIT||'').trim()||null;
const startedAt=new Date().toISOString();
const results=[];
const command=(label,file,args,cwd=root)=>{
  const started=Date.now();
  const out=spawnSync(file,args,{cwd,encoding:'utf8',shell:false,env:process.env});
  const record={label,command:[file,...args].join(' '),cwd,status:out.status===0?'passed':'failed',exitCode:out.status,durationMs:Date.now()-started,stdout:(out.stdout||'').trim(),stderr:(out.stderr||'').trim()};
  results.push(record); console.log(`\n[${record.status.toUpperCase()}] ${label}`); if(record.stdout)console.log(record.stdout); if(record.stderr)console.error(record.stderr);
  if(out.status!==0) throw new Error(`${label} failed with exit code ${out.status}`); return record.stdout;
};
const git=(cwd,...args)=>command(`git ${args.join(' ')}`,'git',args,cwd).split(/\r?\n/).at(-1).trim();
const sha256=path=>{const hash=createHash('sha256');hash.update(readFileSync(path));return hash.digest('hex');};
const databases=base=>{const found=[];const walk=(dir,depth=0)=>{if(depth>5)return;for(const name of readdirSync(dir)){if(['.git','.venv','__pycache__','.pytest_cache'].includes(name))continue;const path=join(dir,name);let st;try{st=statSync(path);}catch{continue;}if(st.isDirectory())walk(path,depth+1);else if(/\.(sqlite3?|db)$/i.test(name))found.push(path);}};walk(base);return found.sort();};
const snapshot=paths=>Object.fromEntries(paths.map(path=>[relative(backend,path).replaceAll('\\','/'),{bytes:statSync(path).size,sha256:sha256(path)}]));
let overall='passed', failure=null, beforeDatabases={}, frontendHead=null, backendHead=null;
try{
  frontendHead=git(root,'rev-parse','HEAD'); if(expectedFrontend && frontendHead!==expectedFrontend)throw new Error(`frontend HEAD ${frontendHead} != ${expectedFrontend}`);
  if(git(root,'status','--short'))throw new Error('frontend working tree must be clean before qualification');
  backendHead=git(backend,'rev-parse','HEAD'); if(expectedBackend && backendHead!==expectedBackend)throw new Error(`backend HEAD ${backendHead} != ${expectedBackend}`);
  if(git(backend,'status','--short'))throw new Error('backend working tree must be clean before qualification');
  const frontendTests=[
    'validate-alpha1-architecture-baseline.mjs','test-alpha2-reader-interaction.mjs','test-alpha3-selection-interaction.mjs','test-alpha4-known-word-authority.mjs','test-alpha5-latest-kiku-enrichment.mjs','test-alpha6-status-authority.mjs','test-alpha7-contract-consolidation.mjs','test-alpha8-persistence-hardening.mjs','test-alpha9-retirement.mjs','test-alpha10-release-candidate.mjs',
    'test-phase13-epub-paths.mjs','test-phase13-package-model.mjs','test-phase13-parser-diagnostics.mjs','test-phase13-content-stream.mjs','test-phase13-runtime.mjs','test-phase13-lossless-content-stream.mjs','test-phase13-book-sections.mjs','test-phase13-image-roles.mjs','test-phase13-reader-model.mjs','test-phase13-sidebar-sections.mjs','test-phase13-authoritative-parser.mjs','test-phase13-closeout.mjs',
    'test-phase14-text-ranges.mjs','test-phase14-minimum-context.mjs','test-phase14-markup-ranges.mjs','test-phase14-contextual-diagnostics.mjs','test-phase14-contextual-activation.mjs','test-phase14-logical-sentence-ownership.mjs','test-phase14-logical-sentence-selection.mjs','test-phase14-dom-visual-selection.mjs','test-phase14-sentence-local-analysis.mjs','test-phase14-teaching-input-qualification.mjs','test-phase14-controlled-teaching-runtime.mjs','validate-phase14-cleanup.mjs','validate-phase14-closeout.mjs',
    'test-analyzer-reader-spans.mjs','test-color-sources.mjs','test-analyzer-cache.mjs','test-scene-prefetch.mjs','test-analyzer-metadata-lease.mjs','test-analyzer-learning-model.mjs','test-analyzer-learning-activation.mjs','test-analyzer-mining-selection.mjs','test-analyzer-selection-ownership.mjs','test-analyzer-session-cache.mjs','test-analyzer-priority-scheduler.mjs','test-analyzer-observability.mjs','test-reader-prefetch-integration.mjs','test-tokenizer-retirement.mjs','test-debug-report-v2.mjs','test-teaching-panel-shell.mjs','test-teaching-lifecycle.mjs','test-teaching-decision-workflow.mjs',
    'test-phase15-ui-contract.mjs','test-phase15-reader-shell.mjs','test-phase15-reading-interface.mjs','test-phase15-sidebar-information-architecture.mjs','test-phase15-reader-actions.mjs','test-phase15-teaching-presentation.mjs','test-phase15-settings-workspace.mjs','test-phase15-design-system.mjs','test-phase15-functional-qualification.mjs'
  ];
  for(const script of frontendTests){const path=join(root,'scripts',script);if(!existsSync(path))throw new Error(`required frontend test missing: ${script}`);command(script,'node',[path]);}
  if(process.platform==='win32') command('production build',process.env.ComSpec||'C:\\Windows\\System32\\cmd.exe',['/d','/s','/c','npm.cmd run build']);
  else command('production build','npm',['run','build']);
  if(runBackend){
    const dbs=databases(backend);beforeDatabases=snapshot(dbs);
    const python=resolve(process.env.JP_ANALYZER_PYTHON||join(backend,'.venv','Scripts','python.exe'));
    if(!existsSync(python))throw new Error(`backend Python missing: ${python}`);
    let pytestFailure=null;
    try{ command('JP Analyzer supported pytest suite',python,['-m','pytest'],backend); }
    catch(error){ pytestFailure=error; }
    finally{
      const after=snapshot(dbs);
      results.push({label:'JP Analyzer database hash guard',status:JSON.stringify(beforeDatabases)===JSON.stringify(after)?'passed':'failed',before:beforeDatabases,after});
      if(JSON.stringify(beforeDatabases)!==JSON.stringify(after))throw new Error('authoritative database hash changed during backend qualification');
    }
    if(pytestFailure)throw pytestFailure;
  }else results.push({label:'JP Analyzer supported pytest suite',status:'not-run',reason:'rerun with --backend after reviewing runtime hash scope'});
  command('frontend diff check','git',['diff','--check'],root);command('backend diff check','git',['diff','--check'],backend);
  if(git(root,'status','--short'))throw new Error('frontend working tree changed during qualification');
  if(git(backend,'status','--short'))throw new Error('backend working tree changed during qualification');
}catch(error){overall='failed';failure=String(error?.message||error);console.error(`\n[FAILED] ${failure}`);}
const report={schema:'Phase15FunctionalQualification.v1',phase:'15.9',startedAt,completedAt:new Date().toISOString(),overall,frontend:{root,actualCommit:frontendHead,expectedCommit:expectedFrontend||frontendHead},backend:{root:backend,actualCommit:backendHead,expectedCommit:expectedBackend||backendHead,executed:runBackend,databaseGuards:beforeDatabases},environment:{platform:process.platform,node:process.version},results,failure,manualWorksheet:'docs/PHASE15_9_RUNTIME_QUALIFICATION.md'};
mkdirSync(evidenceDir,{recursive:true});const path=join(evidenceDir,'phase15_9_qualification.json');writeFileSync(path,JSON.stringify(report,null,2)+'\n');console.log(`\nEvidence: ${path}`);process.exitCode=overall==='passed'?0:1;
