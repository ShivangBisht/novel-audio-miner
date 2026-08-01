import { useEffect, useState } from 'react';
import { getCorpusQualitySummary, getRecordQuality, setRecordQuality } from '../lib/teachingQualityClient.js';

const STATES = ['captured', 'needs-review', 'reviewed', 'approved', 'rejected-for-corpus'];
const LABEL = value => String(value || 'captured').replaceAll('-', ' ');

export default function TeachingCorpusQualityPanel({ records = [] }) {
  const [summary, setSummary] = useState(null);
  const [quality, setQuality] = useState({});
  const [reviewer, setReviewer] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const total = await getCorpusQualitySummary();
      const states = await Promise.all(records.map(async record => [record.recordId, await getRecordQuality(record.recordId)]));
      const values = Object.fromEntries(states);
      setSummary(total); setQuality(values);
      const remembered = records.map(record => values[record.recordId]).find(value => value?.reviewer || value?.quality_note);
      setReviewer(current => current || remembered?.reviewer || '');
      setNote(current => current || remembered?.quality_note || '');
    } catch (error) { setMessage(error.message); }
  }
  useEffect(() => { refresh(); }, [records.map(item => item.recordId).join('|')]);

  async function update(recordId, state) {
    setBusy(true);
    try {
      const current = quality[recordId] || {};
      const result = await setRecordQuality(recordId, state, reviewer.trim() || current.reviewer || '', note.trim() || current.quality_note || '');
      setQuality(previous => ({ ...previous, [recordId]: result }));
      setReviewer(result.reviewer || reviewer); setNote(result.quality_note || note);
      setMessage(`Quality state updated: ${LABEL(state)}. Export remains disabled.`);
      await refresh();
    } catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  return <section className="teaching-admin-card teaching-quality-card">
    <div className="teaching-section-header"><div><span className="teaching-eyebrow">Corpus governance</span><h4>Quality and corpus review</h4><p>Approval makes evidence eligible for a future corpus. It does not tune the analyzer.</p></div></div>
    {summary && <div className="teaching-metadata-grid">
      <div className="teaching-metadata-item"><span>Approved</span><strong>{summary.approvedCount}</strong></div>
      <div className="teaching-metadata-item warning"><span>Needs review</span><strong>{summary.needsReviewCount}</strong></div>
      <div className="teaching-metadata-item"><span>Duplicates</span><strong>{summary.duplicateGroupCount}</strong></div>
      <div className="teaching-metadata-item"><span>Conflicts</span><strong>{summary.conflictCount}</strong></div>
      <div className="teaching-metadata-item"><span>Eligible</span><strong>{summary.exportEligibleCount || 0}</strong></div>
      <div className="teaching-metadata-item muted"><span>Export</span><strong>Disabled</strong></div>
    </div>}
    <div className="teaching-form-grid"><label>Reviewer<input value={reviewer} onChange={event => setReviewer(event.target.value)} placeholder="Optional reviewer name" /></label><label className="wide">Quality note<textarea value={note} onChange={event => setNote(event.target.value)} /></label></div>
    <div className="teaching-quality-records">{records.map(record => { const state = quality[record.recordId]?.quality_status || 'captured'; return <div key={record.recordId}><div><code>{record.recordId}</code><span>{record.assertions?.boundary?.surface}</span></div><span className={`teaching-status-badge ${state}`}>{LABEL(state)}</span><select disabled={busy} value={state} onChange={event => update(record.recordId, event.target.value)}>{STATES.map(value => <option key={value} value={value}>{LABEL(value)}</option>)}</select></div>; })}</div>
    {message && <div className="status-message">{message}</div>}
  </section>;
}
