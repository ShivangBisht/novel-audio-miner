import TeachingCorpusQualityPanel from './TeachingCorpusQualityPanel.jsx';
import { useEffect, useRef, useState } from 'react';
import { captureTeachingSnapshot, createTeachingDecision, listTeachingDecisions, retractTeachingDecision, supersedeTeachingDecision, teachingDecisionDiagnosis, teachingDecisionSummary } from '../lib/teachingDecisionClient.js';
import { diagnoseGuidedTeaching } from '../lib/teachingGuidedReviewClient.js';

const CONFIDENCE = [['preference', 'Prefer this result'], ['confident', 'Confident'], ['needs-review', 'Not sure']];
const FAILURE_LABELS = {
  'accepted-current': 'Analyzer result is correct',
  'candidate-generation-miss': 'Candidate generation miss',
  'ranking-error': 'Matching candidate was not selected',
  'boundary-error': 'Boundary differs',
  'role-error': 'Type or colour differs',
  'identity-error': 'Identity differs',
  'unclassified': 'Needs later review',
};
const ROLE_LABELS = { lexical: 'Vocabulary', 'learnable-grammar': 'Grammar', function: 'Function', name: 'Name', unresolved: 'Leave uncoloured' };
const partition = spans => (spans || []).map(item => item.surface).join(' | ');
async function sha256(value) { const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)); return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2, '0')).join(''); }

export default function TeachingDecisionPanel({ selection, analysis, provenance, preview, previewPayload, proposedRole, roleLabel, onSaveOccurrenceCorrection, onReturnToPreview, onComplete, onFinishReview, existingRecordId, reviewIntent }) {
  const [stage, setStage] = useState('diagnosis');
  const [confidence, setConfidence] = useState('preference');
  const [note, setNote] = useState('');
  const [identityKey, setIdentityKey] = useState('');
  const [fixOccurrence, setFixOccurrence] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [guidedDiagnosis, setGuidedDiagnosis] = useState(null);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [diagnosis, setDiagnosis] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [savedResult, setSavedResult] = useState(null);
  const [filters, setFilters] = useState({ judgment: '', lifecycle: '', failure: '' });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const diagnosisPromiseRef = useRef(null);
  const diagnosisRequestKeyRef = useRef(null);

  const observed = (analysis?.words || []).find(x => x.start === selection?.start && x.end === selection?.end) || null;
  const assertedRole = proposedRole || observed?.displayRole || observed?.role || preview?.derivedCorrection?.displayRole || 'unresolved';
  const beforePartition = partition(preview?.originalReaderSpans || analysis?.words);
  const afterPartition = partition(preview?.previewReaderSpans || analysis?.words);
  const intent = reviewIntent || (previewPayload?.action === 'show-as-one-unit' ? 'show-as-one-unit' : (observed ? 'accepted-current' : 'change-role'));

  async function refresh() {
    if (!selection?.sentence) return;
    try {
      const sentenceSha256 = await sha256(selection.sentence);
      const [items, totals] = await Promise.all([listTeachingDecisions({ sentenceSha256, lifecycleStatus: null }), teachingDecisionSummary()]);
      setRecords(items.records || []); setSummary(totals);
    } catch (error) { setMessage(error.message); }
  }
  useEffect(() => {
    if (!selection?.sentence || !selection?.surface || selection?.start == null || selection?.end == null) return undefined;

    setStage('diagnosis'); setConfidence('preference'); setNote(''); setIdentityKey(''); setFixOccurrence(false);
    setSnapshot(null); setGuidedDiagnosis(null); setMessage(''); setDiagnosis(null); setSelectedRecord(null); setSavedResult(null);
    refresh();

    const requestKey = JSON.stringify({
      sentence: selection.sentence,
      start: selection.start,
      end: selection.end,
      surface: selection.surface,
      action: previewPayload?.action || null,
      assertedRole,
      intent,
    });

    if (diagnosisRequestKeyRef.current !== requestKey || !diagnosisPromiseRef.current) {
      diagnosisRequestKeyRef.current = requestKey;
      diagnosisPromiseRef.current = (async () => {
        const captured = await captureTeachingSnapshot(selection.sentence);
        const result = await diagnoseGuidedTeaching({
          snapshotId: captured.snapshotId,
          snapshotDigest: captured.contentDigest,
          boundary: { start: selection.start, end: selection.end, surface: selection.surface },
          assertedRole,
          intent,
        });
        return { captured, result };
      })();
    }

    let cancelled = false;
    setBusy(true);
    setMessage('Capturing the correction-free analyzer snapshot and deriving the diagnosis...');

    diagnosisPromiseRef.current
      .then(({ captured, result }) => {
        if (cancelled) return;
        setSnapshot(captured);
        setGuidedDiagnosis(result);
        setConfidence(result.recommendedConfidence || 'preference');
        setNote(`${selection.surface}: ${result.reason}`);
        setMessage('');
      })
      .catch(error => {
        if (cancelled) return;
        diagnosisPromiseRef.current = null;
        diagnosisRequestKeyRef.current = null;
        setMessage(error.message);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });

    return () => { cancelled = true; };
  }, [selection?.sentence, selection?.surface, selection?.start, selection?.end, previewPayload?.action, assertedRole, intent]);

  const visible = records.filter(r => (!filters.judgment || r.judgment === filters.judgment) && (!filters.lifecycle || r.lifecycle?.status === filters.lifecycle) && (!filters.failure || r.failureClassification === filters.failure));
  function finalPayload() {
    const judgment = guidedDiagnosis?.judgment || 'rejected';
    return { snapshot, boundary: { start: selection.start, end: selection.end, surface: selection.surface }, judgment, classification: { assertedRole }, identity: identityKey.trim() ? { assertedLookupKey: identityKey.trim() } : null, approvedTarget: judgment === 'corrected' ? { targetSpans: [{ start: selection.start, end: selection.end, surface: selection.surface, displayRole: assertedRole }], provenance: provenance || null } : null, failureClassification: guidedDiagnosis?.failureClassification || 'unclassified', confidence, note: note.trim() || null, operationalCorrectionLink: null };
  }
  async function save(replaceId = null) {
    if (!snapshot || !guidedDiagnosis) { setMessage('Wait for the automatic diagnosis before saving.'); return; }
    setBusy(true); setMessage('Saving reviewed Teaching evidence...');
    try {
      const body = finalPayload();
      const result = replaceId ? await supersedeTeachingDecision(replaceId, body) : await createTeachingDecision(body);
      const recordId = replaceId ? result.replacement.recordId : result.recordId;
      let correction = null;
      if (!replaceId && fixOccurrence && guidedDiagnosis.judgment === 'corrected') correction = await onSaveOccurrenceCorrection?.();
      setSavedResult({ recordId, correction, replacedRecordId: replaceId }); setMessage(''); setStage('success'); setSelectedRecord(null); await refresh(); onComplete?.({ recordId, correction });
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function inspect(record) { setSelectedRecord(record); setDiagnosis(null); try { setDiagnosis(await teachingDecisionDiagnosis(record.recordId)); } catch (error) { setMessage(error.message); } }
  async function retract(id) { if (!window.confirm(`Retract ${id}? History is retained.`)) return; setBusy(true); try { await retractTeachingDecision(id, 'Retracted in guided Teaching advanced tools'); await refresh(); setMessage('Decision retracted; history retained.'); } catch (error) { setMessage(error.message); } finally { setBusy(false); } }

  return <section className="teaching-decision-panel teaching-review-card" data-testid="teaching-decision-panel">
    <div className="teaching-review-header"><div><strong>Teaching review</strong><span>Saving Teaching evidence does not tune or activate the analyzer.</span></div><button type="button" className="secondary" onClick={onReturnToPreview}>Back to preview</button></div>
    <ol className="teaching-review-progress"><li className={stage === 'diagnosis' ? 'active' : 'complete'}>Diagnosis</li><li className={stage === 'details' ? 'active' : (['review','success'].includes(stage) ? 'complete' : '')}>Details</li><li className={stage === 'review' ? 'active' : (stage === 'success' ? 'complete' : '')}>Save</li></ol>
    {summary && <div className="teaching-preview-meta"><span>Corpus: {summary.recordCount}</span><span>Integrity: {summary.integrity?.ok ? 'ok' : 'issues'}</span><span>Export: disabled</span></div>}

    {stage === 'diagnosis' && <div className="teaching-guided-step" data-testid="teaching-diagnosis">
      <h4>Review automatic diagnosis</h4>
      <div className="teaching-comparison-grid"><div><span>Before</span><code>{beforePartition}</code></div><div><span>After</span><code>{afterPartition}</code></div></div>
      <div className="teaching-result-summary"><span>Selected result</span><strong>{selection.surface}</strong><span>Type: {roleLabel || ROLE_LABELS[assertedRole] || assertedRole}</span></div>
      {busy && <div className="status-message working">{message}</div>}
      {!busy && guidedDiagnosis && <div className="teaching-diagnosis-card"><span>System diagnosis</span><strong>{FAILURE_LABELS[guidedDiagnosis.failureClassification] || guidedDiagnosis.failureClassification}</strong><p>{guidedDiagnosis.reason}</p><details><summary>Show technical details</summary><div className="teaching-preview-meta"><span>Candidate: {guidedDiagnosis.candidatePresent ? 'present' : 'missing'}</span><span>Boundary: {guidedDiagnosis.boundaryMatches ? 'match' : 'different'}</span><span>Classification: {guidedDiagnosis.classificationMatches ? 'match' : 'different'}</span><span>Overlapping candidates: {guidedDiagnosis.overlappingCandidateCount}</span></div></details></div>}
      {message && !busy && <div className="status-message error">{message}</div>}
      <div className="teaching-primary-actions"><button type="button" disabled={busy || !guidedDiagnosis} onClick={() => setStage('details')}>Accept diagnosis and continue</button></div>
    </div>}

    {stage === 'details' && <div className="teaching-guided-step" data-testid="teaching-details"><h4>Review details</h4><div className="teaching-form-grid"><label>Confidence<select value={confidence} onChange={e => setConfidence(e.target.value)}>{CONFIDENCE.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Optional identity<input value={identityKey} onChange={e => setIdentityKey(e.target.value)} placeholder="Only if you want to assert a specific identity" /></label><label className="wide">Optional note<textarea value={note} onChange={e => setNote(e.target.value)} /></label></div><div className="teaching-primary-actions"><button type="button" className="secondary" onClick={() => setStage('diagnosis')}>Back</button><button type="button" onClick={() => setStage('review')}>Next</button></div></div>}

    {stage === 'review' && <div className="teaching-guided-step" data-testid="teaching-final-review"><h4>Final review</h4><dl className="teaching-review-summary"><dt>Reviewed text</dt><dd>{selection.surface}</dd><dt>Approved result</dt><dd>{afterPartition}</dd><dt>Type</dt><dd>{roleLabel || ROLE_LABELS[assertedRole] || assertedRole}</dd><dt>Diagnosis</dt><dd>{FAILURE_LABELS[guidedDiagnosis?.failureClassification] || guidedDiagnosis?.failureClassification}</dd><dt>Confidence</dt><dd>{CONFIDENCE.find(x => x[0] === confidence)?.[1] || confidence}</dd><dt>Analyzer tuning</dt><dd>Not performed</dd></dl>{guidedDiagnosis?.judgment === 'corrected' && <label className="teaching-save-choice"><input type="checkbox" checked={fixOccurrence} onChange={e => setFixOccurrence(e.target.checked)} /><span><strong>Also fix this occurrence</strong><small>Changes only this Reader occurrence. Global analyzer behavior remains unchanged.</small></span></label>}<div className="teaching-primary-actions"><button type="button" className="secondary" onClick={() => setStage('details')}>Back</button><button type="button" className="teaching-save" disabled={busy} onClick={() => save(existingRecordId || null)}>{fixOccurrence ? 'Save evidence and fix this occurrence' : 'Save Teaching evidence'}</button></div>{message && <div className="status-message error">{message}</div>}</div>}

    {stage === 'success' && <div className="teaching-guided-step teaching-success-card" data-testid="teaching-success"><h4>Teaching evidence saved</h4><p><strong>Record:</strong> {savedResult?.recordId}</p><p><strong>Occurrence correction:</strong> {savedResult?.correction?.correctionId || 'Not requested'}</p><p><strong>Quality state:</strong> Captured</p><p><strong>Analyzer tuning:</strong> Not performed</p><p><strong>Global analyzer:</strong> Unchanged</p><button type="button" onClick={() => onFinishReview?.(savedResult)}>Return to reading</button></div>}


  </section>;
}
