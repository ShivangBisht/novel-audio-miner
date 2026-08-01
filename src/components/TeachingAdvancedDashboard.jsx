import { useState } from 'react';
import TeachingCorpusQualityPanel from './TeachingCorpusQualityPanel.jsx';
import TeachingCorpusExportPanel from './TeachingCorpusExportPanel.jsx';
import TeachingPortabilityPanel from './TeachingPortabilityPanel.jsx';
import TeachingTuningCorpusPanel from './TeachingTuningCorpusPanel.jsx';
import TeachingOfflineEvaluationPanel from './TeachingOfflineEvaluationPanel.jsx';
import TeachingControlledActivationPanel from './TeachingControlledActivationPanel.jsx';

const TOOLS = [
  ['history', 'Review and history', 'Inspect active records and lifecycle state.'],
  ['quality', 'Quality and corpus', 'Review, approve, and check corpus eligibility.'],
  ['portability', 'Portability', 'Move verified Teaching evidence between computers.'],
  ['packages', 'Corpus packages', 'Preview private, redacted, and dry-run corpus packages.'],
  ['evaluation', 'Offline evaluation', 'Measure supplied candidates without changing the analyzer.'],
  ['activation', 'Controlled activation', 'Inspect shadow-only eligibility and rollback controls.'],
];

export default function TeachingAdvancedDashboard({ records = [], onClose }) {
  const [tool, setTool] = useState(null);
  const selected = TOOLS.find(item => item[0] === tool);
  return <section className="teaching-advanced-dashboard" data-testid="teaching-advanced-dashboard">
    <div className="teaching-section-header">
      <div><span className="teaching-eyebrow">Administration</span><h3>Advanced Teaching tools</h3><p>Open only the area you need. Tools do not tune or activate the analyzer.</p></div>
      <button type="button" className="secondary" onClick={onClose}>Hide advanced tools</button>
    </div>
    {!tool && <div className="teaching-tool-grid">{TOOLS.map(([id, title, description]) =>
      <button type="button" key={id} className="teaching-tool-card" onClick={() => setTool(id)}>
        <strong>{title}</strong><span>{description}</span>
      </button>
    )}</div>}
    {tool && <div className="teaching-tool-workspace">
      <div className="teaching-tool-breadcrumb"><button type="button" className="secondary" onClick={() => setTool(null)}>Back to tools</button><div><strong>{selected?.[1]}</strong><span>{selected?.[2]}</span></div></div>
      {tool === 'history' && <section className="teaching-admin-card"><h4>Active Teaching records for this sentence</h4>{records.length === 0 ? <p>No active Teaching records for this sentence.</p> : <div className="teaching-record-list">{records.map(record => <div key={record.recordId}><code>{record.recordId}</code><strong>{record.assertions?.boundary?.surface || 'Unknown surface'}</strong><span>{record.judgment}</span><span>{record.failureClassification}</span></div>)}</div>}</section>}
      {tool === 'quality' && <TeachingCorpusQualityPanel records={records} />}
      {tool === 'portability' && <TeachingPortabilityPanel />}
      {tool === 'packages' && <div className="teaching-tool-stack"><TeachingTuningCorpusPanel /><TeachingCorpusExportPanel /></div>}
      {tool === 'evaluation' && <TeachingOfflineEvaluationPanel />}
      {tool === 'activation' && <TeachingControlledActivationPanel />}
    </div>}
  </section>;
}
