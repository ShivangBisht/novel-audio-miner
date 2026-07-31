import TeachingCorpusExportPanel from './TeachingCorpusExportPanel.jsx';
import {useEffect,useState} from 'react';
import {getCorpusQualitySummary,getRecordQuality,setRecordQuality} from '../lib/teachingQualityClient.js';
const STATES=['captured','needs-review','reviewed','approved','rejected-for-corpus'];
export default function TeachingCorpusQualityPanel({records=[]}){
 const [summary,setSummary]=useState(null),[quality,setQuality]=useState({}),[reviewer,setReviewer]=useState(''),[note,setNote]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function refresh(){try{const total=await getCorpusQualitySummary();const states=await Promise.all(records.map(async r=>[r.recordId,await getRecordQuality(r.recordId)]));const nextQuality=Object.fromEntries(states);setSummary(total);setQuality(nextQuality);const preferredRecord=records.find(r=>(r.lifecycle?.status||'active')==='active'&&(nextQuality[r.recordId]?.reviewer||nextQuality[r.recordId]?.quality_note))||records.find(r=>nextQuality[r.recordId]?.reviewer||nextQuality[r.recordId]?.quality_note);const persisted=preferredRecord?nextQuality[preferredRecord.recordId]:null;setReviewer(current=>current||persisted?.reviewer||'');setNote(current=>current||persisted?.quality_note||'');}catch(e){setMessage(e.message);}}
 useEffect(()=>{refresh();},[records.map(x=>x.recordId).join('|')]);
 async function update(id,state){setBusy(true);try{const current=quality[id]||{};const persistedReviewer=reviewer.trim()||current.reviewer||'';const persistedNote=note.trim()||current.quality_note||'';const result=await setRecordQuality(id,state,persistedReviewer,persistedNote);setReviewer(result.reviewer||persistedReviewer);setNote(result.quality_note||persistedNote);setQuality({...quality,[id]:result});setMessage(`Quality state updated: ${state}. Export remains disabled.`);await refresh();}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 return <details className="teaching-corpus-quality"><summary>Corpus quality review</summary>
  <p>Use this area only after teaching examples have been captured. Approval marks future export eligibility but does not change analyzer behavior.</p>
  {summary&&<div className="teaching-preview-meta"><span>Approved: {summary.approvedCount}</span><span>Needs review: {summary.needsReviewCount}</span><span>Duplicates: {summary.duplicateGroupCount}</span><span>Conflicts: {summary.conflictCount}</span><span>Eligible for export: {summary.exportEligibleCount||0}</span><span>Export: disabled</span></div>}
  <label>Reviewer<input value={reviewer} onChange={e=>setReviewer(e.target.value)} placeholder="Optional reviewer name" /></label><label>Quality note<textarea value={note} onChange={e=>setNote(e.target.value)} /></label>
  <div className="teaching-existing">{records.map(record=><div key={record.recordId}><code>{record.recordId}</code><span>{quality[record.recordId]?.quality_status||'captured'}</span><select disabled={busy} value={quality[record.recordId]?.quality_status||'captured'} onChange={e=>update(record.recordId,e.target.value)}>{STATES.map(x=><option key={x}>{x}</option>)}</select></div>)}</div>
  {message&&<div className="status-message">{message}</div>}
   <TeachingCorpusExportPanel />
 </details>;
}
