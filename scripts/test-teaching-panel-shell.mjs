import fs from 'node:fs';
function read(path){if(!fs.existsSync(path))throw new Error(`Required source file is missing: ${path}`);return fs.readFileSync(path,'utf8');}
function requireToken(source,token,description){if(!source.includes(token))throw new Error(`Missing Teaching panel-shell contract: ${description} (${token})`);}
const reader=read('src/components/Reader.jsx');
const panel=read('src/components/TeachingPanel.jsx');
const decisionPanel=read('src/components/TeachingDecisionPanel.jsx');
const dashboard=read('src/components/TeachingAdvancedDashboard.jsx');
const client=read('src/lib/teachingCorrectionsClient.js');
for(const [token,description] of [['Teaching Mode:','Teaching Mode toggle'],['resolveTeachingSelection','offset-aware Teaching selection'],['<TeachingPanel','Teaching panel mount'],['lastTeachingReceipt','saved receipt ownership']])requireToken(reader,token,description);
for(const token of ['Current result is correct','Show selection as one unit','Split selection','Change type or colour only','Vocabulary','Grammar','Function','Name','Leave uncoloured','Preview result','Start Teaching Review','Already reviewed','Edit this occurrence','Advanced tools'])requireToken(panel,token,`current Teaching control ${token}`);
for(const [token,description] of [["intent === 'keep-current'",'accepted-current intent'],['Current type','read-only current type display'],['copied without an override','accepted-current safety explanation'],['existingRecordId={editMode ? existingRecordId:null}','explicit edit-mode supersession'],['<TeachingAdvancedDashboard','Advanced Teaching dashboard mount']])requireToken(panel,token,description);
requireToken(decisionPanel,'Review automatic diagnosis','guided diagnosis stage');
requireToken(decisionPanel,'Save Teaching evidence','final Teaching save action');
requireToken(dashboard,'Review and history','Advanced history category');
requireToken(dashboard,'Quality and corpus','Advanced quality category');
requireToken(client,'/reader-corrections/preview','correction preview route');
requireToken(client,'/reader-corrections/scope','correction scope route');
if(panel.includes('Save correction'))throw new Error('Obsolete early Save correction control remains.');
console.log('Teaching panel shell compatibility checks passed.');
