import { useEffect, useMemo, useState } from 'react';
import { previewReaderCorrection, listScopedReaderCorrections } from '../lib/teachingCorrectionsClient.js';

const ACTIONS = [
  ['show-as-one-unit', 'Show as one unit', null],
  ['split', 'Split', null],
  ['mark-vocabulary', 'Vocabulary', 'lexical'],
  ['mark-grammar', 'Grammar', 'learnable-grammar'],
  ['mark-function', 'Function', 'function'],
  ['mark-name', 'Name', 'name'],
  ['mark-unresolved', 'Leave uncoloured', 'unresolved'],
];
function partition(spans) { return (spans || []).map(item => item.surface).join(' | '); }
export default function TeachingPanel({ selection, analysis, onClose }) {
  const [action, setAction] = useState('show-as-one-unit');
  const [splitOffsets, setSplitOffsets] = useState([]);
  const [preview, setPreview] = useState(null);
  const [scope, setScope] = useState(null);
  const [status, setStatus] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const current = ACTIONS.find(item => item[0] === action) || ACTIONS[0];
  const internalOffsets = useMemo(() => {
    if (!selection?.valid) return [];
    const values = [];
    for (let value = selection.start + 1; value < selection.end; value += 1) values.push(value);
    return values;
  }, [selection]);
  useEffect(() => {
    setPreview(null); setSplitOffsets([]); setAction('show-as-one-unit');
    if (!selection?.valid) return;
    listScopedReaderCorrections(selection).then(setScope).catch(() => setScope(null));
  }, [selection?.sentence, selection?.start, selection?.end]);
  async function runPreview() {
    if (!selection?.valid) return;
    setBusy(true); setStatus({ type: 'working', text: 'Requesting authoritative preview...' });
    try {
      const payload = {
        sentence: selection.sentence, start: selection.start, end: selection.end,
        surface: selection.surface, action, displayRole: current[2], splitOffsets,
        scope: 'occurrence', baselineReaderSpans: analysis.words,
        readerCandidates: analysis.candidates || [], readerSelection: analysis.selection || {},
      };
      const result = await previewReaderCorrection(payload);
      setPreview(result); setStatus({ type: 'ok', text: 'Preview validated. Nothing has been saved.' });
    } catch (error) { setPreview(null); setStatus({ type: 'error', text: error.message }); }
    finally { setBusy(false); }
  }
  if (!selection?.valid) return null;
  return <section className="teaching-panel" data-testid="teaching-panel">
    <div className="teaching-panel-header"><div><strong>Teaching Mode</strong><span>Exact occurrence preview · no changes saved</span></div><button type="button" className="secondary" onClick={onClose}>Close</button></div>
    <div className="teaching-selection-summary"><strong>{selection.surface}</strong><span>Offsets {selection.start}–{selection.end} · spans {selection.coveredSpanIndexes.join(', ')}</span></div>
    <div className="teaching-partition"><span>Current partition</span><code>{partition(analysis.words)}</code></div>
    <div className="teaching-actions">{ACTIONS.map(([value,label]) => <button type="button" key={value} className={action===value?'teaching-action active':'teaching-action'} onClick={()=>{setAction(value);setPreview(null);}}>{label}</button>)}</div>
    {action === 'split' && <div className="teaching-split"><span>Split after character:</span><div>{internalOffsets.map(offset => <label key={offset}><input type="checkbox" checked={splitOffsets.includes(offset)} onChange={event => setSplitOffsets(values => event.target.checked ? [...values,offset].sort((a,b)=>a-b) : values.filter(value=>value!==offset))}/>{selection.sentence.slice(selection.start, offset)} | {selection.sentence.slice(offset, selection.end)}</label>)}</div></div>}
    <button type="button" disabled={busy || (action==='split' && splitOffsets.length===0)} onClick={runPreview}>Preview</button>
    {status.text && <div className={`status-message ${status.type}`}>{status.text}</div>}
    {preview && <div className="teaching-preview"><div><span>Before</span><code>{partition(preview.originalReaderSpans)}</code></div><div><span>After</span><code>{partition(preview.previewReaderSpans)}</code></div><div className="teaching-preview-meta"><span>Role: {preview.derivedCorrection.displayRole}</span><span>Scope: {preview.derivedCorrection.scope}</span><span>Saved: no</span></div></div>}
    {scope?.corrections?.length > 0 && <div className="teaching-existing">Existing corrections in range: {scope.corrections.length}</div>}
  </section>;
}
