import {useState} from 'react';
import {applyTeachingImport,exportTeachingEvidence,previewTeachingImport,verifyTeachingEvidence} from '../lib/teachingPortabilityClient.js';

function downloadJson(packageJson,name){const blob=new Blob([packageJson],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;link.click();URL.revokeObjectURL(url);}

export default function TeachingPortabilityPanel(){
 const [packageData,setPackageData]=useState(null),[packageJson,setPackageJson]=useState(null),[preview,setPreview]=useState(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function exportData(){setBusy(true);try{const value=await exportTeachingEvidence();await verifyTeachingEvidence(value.packageJson);setPackageData(value.packageData);setPackageJson(value.packageJson);setPreview(null);downloadJson(value.packageJson,`teaching-evidence-${value.packageData.packageDigest.slice(7,19)}.json`);setMessage('Verified Teaching evidence package downloaded. No dictionary, correction, tuning, or activation data was included.');}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 async function choose(event){const file=event.target.files?.[0];if(!file)return;try{const raw=await file.text();const value=JSON.parse(raw);setPackageData(value);setPackageJson(raw);setPreview(null);setMessage(`Loaded ${file.name}. Preview the import before applying.`);}catch(e){setMessage(`Could not read transfer JSON: ${e.message}`);}}
 async function inspect(){if(!packageJson)return;setBusy(true);try{await verifyTeachingEvidence(packageJson);const value=await previewTeachingImport(packageJson);setPreview(value);setMessage(value.canApply?'Import preview is safe to apply. No writes were performed.':'Import is blocked. Review conflicts or validation problems.');}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 async function apply(){if(!packageJson||!preview?.canApply)return;if(!window.confirm('Import this verified Teaching evidence package? Existing conflicting data will never be overwritten.'))return;setBusy(true);try{const value=await applyTeachingImport(packageJson,packageData.packageDigest);setPreview(value.postImportPreview);setMessage(value.idempotent?'Package was already present; no changes were made.':'Teaching evidence imported transactionally. No tuning or activation occurred.');}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 return <details className="teaching-portability"><summary>Teaching evidence portability</summary>
  <p>Move Teaching evidence between computers without copying SQLite databases. Dictionaries and occurrence corrections are not included.</p>
  <p><strong>This does not tune or activate the analyzer.</strong></p>
  <div className="teaching-actions"><button type="button" disabled={busy} onClick={exportData}>Export Teaching evidence</button><label className="secondary">Choose transfer JSON<input type="file" accept="application/json,.json" onChange={choose} hidden /></label><button type="button" disabled={busy||!packageJson} onClick={inspect}>Preview import</button><button type="button" disabled={busy||!preview?.canApply} onClick={apply}>Apply verified import</button></div>
  {packageData&&<div className="teaching-preview-meta"><span>Schema: {packageData.schema}</span><span>Records: {packageData.counts?.records||0}</span><span>Snapshots: {packageData.counts?.snapshots||0}</span><span>Digest: {packageData.packageDigest?.slice(0,24)}…</span></div>}
  {preview&&<div className="teaching-preview-meta"><span>Insert: {preview.counts?.insert||0}</span><span>Already present: {preview.counts?.alreadyPresent||0}</span><span>Conflicts: {preview.counts?.conflict||0}</span><span>Blocked: {preview.counts?.blocked||0}</span><span>Writes: {preview.writesPerformed?'yes':'no'}</span></div>}
  {message&&<div className="status-message">{message}</div>}
 </details>;
}
