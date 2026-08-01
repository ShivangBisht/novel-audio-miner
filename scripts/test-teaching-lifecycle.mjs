import fs from 'node:fs';
function read(path){if(!fs.existsSync(path))throw new Error(`Required source file is missing: ${path}`);return fs.readFileSync(path,'utf8');}
function requireToken(source,token,description){if(!source.includes(token))throw new Error(`Missing Teaching lifecycle contract: ${description} (${token})`);}
const reader=read('src/components/Reader.jsx');
const panel=read('src/components/TeachingPanel.jsx');
const decisionPanel=read('src/components/TeachingDecisionPanel.jsx');
const client=read('src/lib/teachingCorrectionsClient.js');
const hook=read('src/lib/useJpAnalyzerShadow.js');
for(const [token,description] of [
['previewReaderCorrection','authoritative correction preview'],['saveReaderCorrection','occurrence correction persistence'],['deactivateReaderCorrection','occurrence correction deactivation'],['listScopedReaderCorrections','active correction lookup'],['Preview result','preview action'],['Start Teaching Review','guided review transition'],['saveOccurrenceCorrection','deferred correction save handler'],['Active corrections in this range','active correction visibility'],['Undo','correction undo action'],['window.confirm','undo confirmation'],['onCorrectionMutation','Reader refresh callback']])requireToken(panel,token,description);
requireToken(decisionPanel,'Save Teaching evidence','Teaching evidence save action');
requireToken(decisionPanel,'Save evidence and fix this occurrence','combined evidence and correction action');
requireToken(decisionPanel,'onFinishReview?.(savedResult)','deferred Reader refresh after success receipt');
for(const [token,description] of [['/reader-corrections/preview','preview API route'],['/reader-corrections/scope','scope API route'],["method: 'POST'",'correction persistence method'],["method: 'DELETE'",'correction deactivation method']])requireToken(client,token,description);
for(const [token,description] of [['onCorrectionMutation={handleCorrectionMutation}','Reader correction callback wiring'],['clearJpAnalyzerShadowCache()','correction-aware analyzer cache clear'],['analyzerRefreshKey','Reader analyzer refresh revision']])requireToken(reader,token,description);
requireToken(hook,'refreshKey = 0','analyzer hook refresh input');
requireToken(hook,'prefetchSignature, refreshKey','refresh-aware analyzer effect dependency');
if(panel.includes('Save correction'))throw new Error('Obsolete early Save correction action remains in the preview stage.');
console.log('Phase 8.4 Teaching lifecycle compatibility checks passed.');
