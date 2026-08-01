import TeachingDecisionPanel from './TeachingDecisionPanel.jsx';
import TeachingAdvancedDashboard from './TeachingAdvancedDashboard.jsx';
import { useEffect, useMemo, useState } from 'react';
import { previewReaderCorrection, saveReaderCorrection, deactivateReaderCorrection, listScopedReaderCorrections } from '../lib/teachingCorrectionsClient.js';
import { listTeachingDecisions } from '../lib/teachingDecisionClient.js';
import { getRecordQuality } from '../lib/teachingQualityClient.js';

const INTENT_ACTIONS = [
  ['keep-current', 'Current result is correct', 'Preserve the analyzer boundary and type.'],
  ['show-as-one-unit', 'Show selection as one unit', 'Merge the selected text into one Reader unit.'],
  ['split', 'Split selection', 'Create multiple Reader units inside the selection.'],
  ['change-role', 'Change type or colour only', 'Keep the current boundary and change only its type.'],
];
const ROLE_ACTIONS = [
  ['mark-vocabulary', 'Vocabulary', 'lexical'],
  ['mark-grammar', 'Grammar', 'learnable-grammar'],
  ['mark-function', 'Function', 'function'],
  ['mark-name', 'Name', 'name'],
  ['mark-unresolved', 'Leave uncoloured', 'unresolved'],
];
const ROLE_LABELS = { lexical: 'Vocabulary', 'learnable-grammar': 'Grammar', function: 'Function', name: 'Name', unresolved: 'Leave uncoloured' };
const FAILURE_LABELS = { 'accepted-current':'Analyzer result is correct', 'candidate-generation-miss':'Candidate generation miss', 'ranking-error':'Matching candidate was not selected', 'boundary-error':'Boundary differs', 'role-error':'Type or colour differs', 'identity-error':'Identity differs', unclassified:'Needs later review' };
const partition = spans => (spans || []).map(item => item.surface).join(' | ');
const signature = value => JSON.stringify(value);
async function sha256(value) { const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return [...new Uint8Array(digest)].map(item => item.toString(16).padStart(2, '0')).join(''); }
function sameRange(record, selection) { const boundary = record?.assertions?.boundary; return record?.lifecycle?.status === 'active' && boundary?.start === selection?.start && boundary?.end === selection?.end && boundary?.surface === selection?.surface; }
function Meta({ label, value, tone = '' }) { return <div className={`teaching-metadata-item ${tone}`}><span>{label}</span><strong>{value}</strong></div>; }

export default function TeachingPanel({ selection, analysis, provenance, onClose, onCorrectionMutation, lastTeachingReceipt, onTeachingReceipt }) {
  const [intent, setIntent] = useState('show-as-one-unit');
  const [roleAction, setRoleAction] = useState('mark-vocabulary');
  const [splitOffsets, setSplitOffsets] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewPayload, setPreviewPayload] = useState(null);
  const [workflowStage, setWorkflowStage] = useState('preview');
  const [scope, setScope] = useState(null);
  const [records, setRecords] = useState([]);
  const [quality, setQuality] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [status, setStatus] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(null);

  const chosenRole = ROLE_ACTIONS.find(item => item[0] === roleAction) || ROLE_ACTIONS[0];
  const observed = useMemo(() => (analysis?.words || []).find(item => item.start === selection?.start && item.end === selection?.end) || null, [analysis?.words, selection?.start, selection?.end]);
  const observedRole = observed?.displayRole || observed?.role || 'unresolved';
  const assertedRole = intent === 'keep-current' ? observedRole : chosenRole[2];
  const internalOffsets = useMemo(() => { const values = []; if (selection?.valid) for (let value = selection.start + 1; value < selection.end; value += 1) values.push(value); return values; }, [selection]);
  const correctionAction = intent === 'change-role' ? roleAction : intent;
  const payload = useMemo(() => selection?.valid ? { sentence: selection.sentence, start: selection.start, end: selection.end, surface: selection.surface, action: correctionAction, displayRole: assertedRole, splitOffsets, scope: 'occurrence', baselineReaderSpans: analysis.words, readerCandidates: analysis.candidates || [], readerSelection: analysis.selection || {} } : null, [selection, correctionAction, assertedRole, splitOffsets, analysis]);
  const previewCurrent = Boolean(preview && previewPayload && signature(payload) === signature(previewPayload));
  const activeRecord = useMemo(() => records.find(record => sameRange(record, selection)) || null, [records, selection]);
  const activeCorrection = scope?.corrections?.[0] || null;
  const receiptMatches = Boolean(lastTeachingReceipt && lastTeachingReceipt.sentence === selection?.sentence && lastTeachingReceipt.start === selection?.start && lastTeachingReceipt.end === selection?.end);
  const receipt = receiptMatches ? lastTeachingReceipt : null;
  const existingRecordId = activeRecord?.recordId || receipt?.recordId || null;
  const correctionId = activeCorrection?.correction_id || receipt?.correction?.correctionId || null;
  const qualityState = activeRecord ? (quality[activeRecord.recordId]?.quality_status || 'captured') : (receipt ? 'captured' : null);
  const existingRole = activeRecord?.assertions?.classification?.assertedRole || activeCorrection?.display_role || activeCorrection?.displayRole || observedRole;
  const hasExisting = Boolean(activeRecord || activeCorrection || receipt);

  async function refreshExisting() {
    if (!selection?.valid) return;
    setLoaded(false);
    try {
      const sentenceSha256 = await sha256(selection.sentence);
      const [corrections, response] = await Promise.all([listScopedReaderCorrections(selection), listTeachingDecisions({ sentenceSha256, lifecycleStatus: 'active' })]);
      const nextRecords = response.records || [];
      setScope(corrections); setRecords(nextRecords);
      const matches = nextRecords.filter(record => sameRange(record, selection));
      const states = await Promise.all(matches.map(async record => { try { return [record.recordId, await getRecordQuality(record.recordId)]; } catch { return [record.recordId, null]; } }));
      setQuality(Object.fromEntries(states));
    } catch (error) { setStatus({ type:'error', text:error.message }); }
    finally { setLoaded(true); }
  }

  useEffect(() => {
    setPreview(null); setPreviewPayload(null); setSaved(null); setSplitOffsets([]); setIntent('show-as-one-unit'); setRoleAction('mark-vocabulary'); setWorkflowStage('preview'); setEditMode(false); setStatus({ type:'', text:'' }); refreshExisting();
  }, [selection?.sentence, selection?.start, selection?.end]);

  function invalidate() { setPreview(null); setPreviewPayload(null); setSaved(null); setWorkflowStage('preview'); }
  function chooseIntent(value) { setIntent(value); invalidate(); }

  async function runPreview() {
    if (intent === 'keep-current') {
      if (!observed) { setStatus({ type:'error', text:'Current result is correct requires one exact analyzer span. Select the complete current span.' }); return; }
      const local = { originalReaderSpans: analysis.words, previewReaderSpans: analysis.words, derivedCorrection: { displayRole: observedRole, scope:'occurrence', action:'accepted-current' } };
      setPreview(local); setPreviewPayload(payload); setSaved(null); setStatus({ type:'ok', text:'Current boundary and type will be preserved. Nothing has been saved.' }); return;
    }
    setBusy(true); setStatus({ type:'working', text:'Requesting authoritative preview...' });
    try { const result = await previewReaderCorrection(payload); setPreview(result); setPreviewPayload(payload); setSaved(null); setStatus({ type:'ok', text:'Preview validated. Nothing has been saved.' }); }
    catch (error) { setPreview(null); setPreviewPayload(null); setStatus({ type:'error', text:error.message }); }
    finally { setBusy(false); }
  }

  async function saveOccurrenceCorrection() {
    if (intent === 'keep-current') return null;
    if (!previewCurrent) throw new Error('Preview the current result before saving the occurrence correction.');
    const result = await saveReaderCorrection(previewPayload);
    if (!result.saved || !result.correctionId) throw new Error('Backend did not confirm correction persistence.');
    setSaved(result); setScope(value => ({ ...value, corrections:[{ correction_id:result.correctionId, action:previewPayload.action, surface:previewPayload.surface, display_role:previewPayload.displayRole }] })); return result;
  }
  async function finishReview(result) { if (result?.correction) await onCorrectionMutation?.(result.correction); onClose?.(); }
  async function undo(record) { if (!window.confirm(`Undo correction ${record.correction_id}?`)) return; setBusy(true); try { const result = await deactivateReaderCorrection(record.correction_id); await onCorrectionMutation?.(result); setScope(value => ({ ...value, corrections:[] })); setEditMode(Boolean(activeRecord)); setStatus({ type:'ok', text:'Correction undone and Reader refresh requested.' }); } catch (error) { setStatus({ type:'error', text:error.message }); } finally { setBusy(false); } }

  if (!selection?.valid) return null;
  const showExisting = loaded && hasExisting && !editMode && workflowStage === 'preview';
  const showPreview = loaded && (!hasExisting || editMode) && workflowStage === 'preview';
  const reviewIntent = intent === 'keep-current' ? 'accepted-current' : (intent === 'change-role' ? 'change-role' : 'show-as-one-unit');

  return <section className="teaching-panel teaching-workflow" data-testid="teaching-panel">
    <div className="teaching-panel-header teaching-panel-toolbar"><div><strong>Teaching Mode</strong><span>{showExisting ? 'Reviewed occurrence' : 'Inspect, preview, then review'}</span></div><div className="teaching-toolbar-actions"><button type="button" className="secondary" onClick={() => setAdvancedOpen(value => !value)}>{advancedOpen ? 'Hide advanced tools' : 'Advanced tools'}</button><button type="button" className="secondary" onClick={onClose}>Close</button></div></div>
    {!loaded && <div className="teaching-loading-card">Checking existing Teaching evidence...</div>}

    {showExisting && <section className="teaching-existing-state" data-testid="teaching-existing-state"><div className="teaching-existing-heading"><div className="teaching-success-icon">✓</div><div><span className="teaching-eyebrow">Already reviewed</span><h3>{selection.surface}</h3><span className="teaching-role-badge">{ROLE_LABELS[existingRole] || existingRole || 'Not specified'}</span></div></div><div className="teaching-metadata-grid"><Meta label="Teaching evidence" value={existingRecordId ? 'Saved' : 'Not recorded'} tone={existingRecordId ? 'success':'muted'} /><Meta label="Quality state" value={(qualityState || 'not available').replaceAll('-', ' ')} tone={qualityState === 'approved' ? 'success':'warning'} /><Meta label="Occurrence correction" value={correctionId ? 'Active':'Not active'} tone={correctionId ? 'success':'muted'} /><Meta label="Analyzer tuning" value="Not performed" tone="muted" /></div>{existingRecordId && <div className="teaching-identity-row"><span>Teaching record</span><code>{existingRecordId}</code></div>}{correctionId && <div className="teaching-identity-row"><span>Correction</span><code>{correctionId}</code></div>}{activeRecord?.failureClassification && <div className="teaching-identity-row"><span>Diagnosis</span><strong>{FAILURE_LABELS[activeRecord.failureClassification] || activeRecord.failureClassification}</strong></div>}<div className="teaching-existing-actions"><button type="button" onClick={onClose}>Return to reading</button><button type="button" className="secondary" onClick={() => { setEditMode(true); setStatus({ type:'working', text:existingRecordId ? 'Saving a changed review will supersede the active Teaching record and retain its history.' : 'Editing the active occurrence correction.' }); }}>Edit this occurrence</button>{existingRecordId && <button type="button" className="secondary" onClick={() => setAdvancedOpen(true)}>Review for corpus</button>}</div></section>}

    {showPreview && <><ol className="teaching-stepper"><li className="active"><span>1</span>Preview</li><li><span>2</span>Teaching review</li></ol><div className="teaching-stage-card">{editMode && hasExisting && <div className="teaching-edit-warning"><strong>Editing an existing reviewed occurrence</strong><span>Saving changed Teaching evidence will supersede the active record and retain its history.</span></div>}<div className="teaching-selection-summary"><strong>{selection.surface}</strong><span>Offsets {selection.start}-{selection.end} · spans {selection.coveredSpanIndexes.join(', ')}</span></div><div className="teaching-partition"><span>Current sentence</span><code>{partition(analysis.words)}</code></div>
      <div className="teaching-choice-group"><span className="teaching-choice-label">What should the Reader show?</span><div className="teaching-intent-grid">{INTENT_ACTIONS.map(([value,label,description]) => <button type="button" key={value} className={intent === value ? 'active':''} onClick={() => chooseIntent(value)}><strong>{label}</strong><span>{description}</span></button>)}</div></div>
      {intent === 'keep-current' && <div className="teaching-readonly-choice"><span>Current type</span><strong>{ROLE_LABELS[observedRole] || observedRole}</strong><small>The analyzer boundary and type will be copied without an override.</small></div>}
      {(intent === 'show-as-one-unit' || intent === 'change-role' || intent === 'split') && <div className="teaching-choice-group"><span className="teaching-choice-label">{intent === 'change-role' ? 'Choose the new type or colour' : 'Type or colour'}</span><div className="teaching-segmented-control teaching-role-options">{ROLE_ACTIONS.map(([value,label]) => <button type="button" key={value} className={roleAction === value ? 'active':''} onClick={() => { setRoleAction(value); invalidate(); }}>{label}</button>)}</div></div>}
      {intent === 'split' && <div className="teaching-split"><span>Split after character:</span><div>{internalOffsets.map(offset => <label key={offset}><input type="checkbox" checked={splitOffsets.includes(offset)} onChange={event => { invalidate(); setSplitOffsets(values => event.target.checked ? [...values,offset].sort((a,b)=>a-b) : values.filter(value => value !== offset)); }} />{selection.sentence.slice(selection.start,offset)} | {selection.sentence.slice(offset,selection.end)}</label>)}</div></div>}
      <div className="teaching-primary-actions"><button type="button" disabled={busy || (intent === 'keep-current' && !observed) || (intent === 'split' && !splitOffsets.length)} onClick={runPreview}>Preview result</button>{editMode && hasExisting && <button type="button" className="secondary" onClick={() => setEditMode(false)}>Cancel editing</button>}</div>{status.text && <div className={`status-message ${status.type}`}>{status.text}</div>}
      {preview && <div className="teaching-preview teaching-preview-card"><div><span>Before</span><code>{partition(preview.originalReaderSpans)}</code></div><div><span>After</span><code>{partition(preview.previewReaderSpans)}</code></div><div className="teaching-preview-meta"><span>Type: {ROLE_LABELS[assertedRole] || assertedRole}</span><span>Status: preview only</span><span>Saved: {saved ? 'yes':'no'}</span></div></div>}
      {previewCurrent && <div className="teaching-primary-actions"><button type="button" className="teaching-save" onClick={() => setWorkflowStage('review')}>Start Teaching Review</button><button type="button" className="secondary" onClick={invalidate}>Edit preview</button></div>}
    </div></>}

    {workflowStage === 'review' && previewCurrent && <TeachingDecisionPanel selection={selection} analysis={analysis} provenance={provenance} preview={preview} previewPayload={previewPayload} proposedRole={assertedRole} roleLabel={ROLE_LABELS[assertedRole] || assertedRole} reviewIntent={reviewIntent} existingRecordId={editMode ? existingRecordId:null} onSaveOccurrenceCorrection={saveOccurrenceCorrection} onReturnToPreview={() => setWorkflowStage('preview')} onComplete={result => { onTeachingReceipt?.({ ...result, sentence:selection.sentence, start:selection.start, end:selection.end, surface:selection.surface }); setStatus({ type:'ok', text:'Teaching review completed.' }); }} onFinishReview={finishReview} />}
    {advancedOpen && <TeachingAdvancedDashboard records={records} onClose={() => setAdvancedOpen(false)} />}
    {scope?.corrections?.length > 0 && !showExisting && <details className="teaching-existing"><summary>Active corrections in this range</summary>{scope.corrections.map(record => <div key={record.correction_id}><span>{record.action} · {record.surface}</span><button type="button" className="danger-button" disabled={busy} onClick={() => undo(record)}>Undo</button></div>)}</details>}
  </section>;
}
