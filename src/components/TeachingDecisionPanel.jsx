import { useEffect, useMemo, useState } from 'react';
import { captureTeachingSnapshot, createTeachingDecision, listTeachingDecisions, retractTeachingDecision } from '../lib/teachingDecisionClient.js';

const JUDGMENTS = [
  ['accepted-current', '✓ Analyzer is correct'],
  ['corrected', 'Record correction'],
  ['rejected', 'Reject analyzer decision'],
];
const ROLES = ['', 'lexical', 'learnable-grammar', 'function', 'name', 'unresolved'];
const FAILURES = ['unclassified', 'candidate-generation-miss', 'ranking-error', 'hard-gate-error', 'boundary-error', 'role-error', 'identity-error', 'partition-optimization-error', 'abstention-error'];

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join('');
}

export default function TeachingDecisionPanel({ selection, analysis, provenance }) {
  const [judgment, setJudgment] = useState('accepted-current');
  const [assertedRole, setAssertedRole] = useState('');
  const [identityKey, setIdentityKey] = useState('');
  const [failure, setFailure] = useState('unclassified');
  const [confidence, setConfidence] = useState('preference');
  const [note, setNote] = useState('');
  const [records, setRecords] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const observed = useMemo(() => (analysis?.words || []).find(span => span.start === selection?.start && span.end === selection?.end) || null, [analysis, selection]);
  const canAcceptCurrent = Boolean(observed);

  async function refresh() {
    if (!selection?.sentence) return;
    try {
      const sentenceSha256 = await sha256(selection.sentence);
      const response = await listTeachingDecisions({ sentenceSha256, lifecycleStatus: null });
      setRecords(response.records || []);
    } catch (error) {
      setMessage(error.message);
    }
  }
  
useEffect(() => {
  setJudgment(canAcceptCurrent ? 'accepted-current' : 'corrected');
  setAssertedRole('');
  setIdentityKey('');
  setFailure('unclassified');
  setNote('');
  setMessage('');
  refresh();
}, [
  selection?.sentence,
  selection?.start,
  selection?.end,
  canAcceptCurrent,
]);;

  async function save() {
	  if (judgment === 'accepted-current' && !canAcceptCurrent) {
	setMessage(
    'Select one complete analyzer span before marking the analyzer decision correct.'
	);
	return;
	}
    setBusy(true); setMessage('Capturing analyzer decision...');
    try {
      const snapshot = await captureTeachingSnapshot(selection.sentence);
      const role = judgment === 'accepted-current' ? (observed?.displayRole || observed?.role || 'unresolved') : (assertedRole || 'unresolved');
      const approvedTarget = judgment === 'corrected' ? {
        targetSpans: [{ start: selection.start, end: selection.end, surface: selection.surface, displayRole: role }],
        provenance: provenance || null,
      } : null;
      const record = await createTeachingDecision({
        snapshot,
        boundary: { start: selection.start, end: selection.end, surface: selection.surface },
        judgment,
        classification: { assertedRole: role },
        identity: identityKey.trim() ? { assertedLookupKey: identityKey.trim() } : null,
        approvedTarget,
        failureClassification: judgment === 'accepted-current' ? 'accepted-current' : failure,
        confidence,
        note: note.trim() || null,
        operationalCorrectionLink: null,
      });
      setMessage(`Decision saved: ${record.recordId}`);
      await refresh();
    } catch (error) {
      setMessage(error.message);
    } finally { setBusy(false); }
  }

  async function retract(recordId) {
    if (!window.confirm(`Retract decision ${recordId}? History will be retained.`)) return;
    setBusy(true);
    try { await retractTeachingDecision(recordId, 'Retracted from Teaching Mode'); await refresh(); setMessage('Decision retracted; history retained.'); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  return <section className="teaching-decision-panel" data-testid="teaching-decision-panel">
    <strong>Review analyzer decision</strong>
    <span>Creates test-only evidence. Does not apply a correction or change analyzer behavior.</span>
    <div className="teaching-actions">
  {JUDGMENTS.map(([value, label]) => {
    const acceptingCurrent = value === 'accepted-current';
    const disabled = acceptingCurrent && !canAcceptCurrent;

    return (
      <button
        type="button"
        key={value}
        className={
          judgment === value
            ? 'teaching-action active'
            : 'teaching-action'
        }
        disabled={disabled}
        title={
          disabled
            ? 'Select one complete analyzer span before accepting it'
            : undefined
        }
        onClick={() => setJudgment(value)}
      >
        {label}
      </button>
    );
  })}
</div>
{!canAcceptCurrent && (
  <div className="status-message">
    The selected range is only part of an analyzer span.
    Select one complete analyzer span before marking the analyzer decision correct.
  </div>
)}
    {judgment !== 'accepted-current' && <>
      <label>Asserted classification<select value={assertedRole} onChange={e=>setAssertedRole(e.target.value)}>{ROLES.map(role=><option key={role} value={role}>{role || 'Choose classification'}</option>)}</select></label>
      <label>Failure classification<select value={failure} onChange={e=>setFailure(e.target.value)}>{FAILURES.map(value=><option key={value}>{value}</option>)}</select></label>
      <label>Optional identity<input value={identityKey} onChange={e=>setIdentityKey(e.target.value)} placeholder="Lookup key, grammar ID, or name identity" /></label>
    </>}
    <label>Confidence<select value={confidence} onChange={e=>setConfidence(e.target.value)}><option value="preference">Preference</option><option value="confident">Confident</option><option value="needs-review">Needs review</option></select></label>
    <label>Optional note<textarea maxLength={1000} value={note} onChange={e=>setNote(e.target.value)} /></label>
    <button
  type="button"
  onClick={save}
  disabled={
    busy ||
    (judgment === 'accepted-current' && !canAcceptCurrent) ||
    (judgment !== 'accepted-current' && !assertedRole)
  }
>
  Save review decision
</button>
    {message && <div className="status-message">{message}</div>}
    {records.length > 0 && <div className="teaching-existing"><strong>Sentence decision history</strong>{records.map(record=><div key={record.recordId}><span>{record.judgment} · {record.lifecycle?.status} · {record.qualityState?.exportStatus}</span><code>{record.recordId}</code>{record.lifecycle?.status==='active'&&<button type="button" className="danger-button" disabled={busy} onClick={()=>retract(record.recordId)}>Retract</button>}</div>)}</div>}
  </section>;
}
