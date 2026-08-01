import { useEffect, useState } from 'react';
import { getCorpusGovernanceReport, verifyCorpusGovernanceReport } from '../lib/teachingCorpusGovernanceClient.js';

const LABELS = {
  harnessValid: 'Harness valid', trainFit: 'Train fit', validationPassed: 'Validation', testPassed: 'Protected test', deploymentEligible: 'Deployment',
};
const statusClass = item => item?.passed ? 'approved' : (item?.status === 'insufficient' || item?.status === 'unavailable' ? 'needs-review' : 'captured');
const pretty = value => String(value || '').replaceAll('-', ' ');

export default function TeachingCorpusGovernancePanel() {
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('Loading corpus governance...');
  const [busy, setBusy] = useState(true);

  async function refresh() {
    setBusy(true);
    try { const response = await getCorpusGovernanceReport(); setResult(response.report); setMessage(''); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  useEffect(() => { refresh(); }, []);
  async function verify() {
    if (!result) return;
    setBusy(true);
    try { const response = await verifyCorpusGovernanceReport(result); setMessage(response.ok ? 'Governance report verified.' : 'Governance verification failed.'); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  const maturity = result?.maturity || {};
  const counts = result?.counts || {};
  const coverage = result?.coverage || {};
  return <section className="teaching-admin-card teaching-governance-panel" data-testid="teaching-governance-panel">
    <div className="teaching-section-header"><div><span className="teaching-eyebrow">Post-Alpha D</span><h4>Corpus governance and readiness</h4><p>Coverage and leakage reporting only. This does not tune, activate, or deploy the analyzer.</p></div><button type="button" className="secondary" disabled={busy} onClick={refresh}>Refresh</button></div>
    {result && <>
      <div className="teaching-governance-maturity">{Object.entries(LABELS).map(([key,label]) => { const item=maturity[key]; return <div key={key} className="teaching-governance-level"><span>{label}</span><strong className={`teaching-status-badge ${statusClass(item)}`}>{pretty(item?.status)}</strong><small>{item?.reasons?.[0] || 'No blocking reason.'}</small></div>; })}</div>
      <div className="teaching-metadata-grid">
        <div className="teaching-metadata-item"><span>Eligible</span><strong>{counts.eligible || 0}</strong></div>
        <div className="teaching-metadata-item"><span>Train</span><strong>{coverage.bySplit?.train || 0}</strong></div>
        <div className="teaching-metadata-item"><span>Validation</span><strong>{coverage.bySplit?.validation || 0}</strong></div>
        <div className="teaching-metadata-item"><span>Test</span><strong>{coverage.bySplit?.test || 0}</strong></div>
        <div className="teaching-metadata-item"><span>Provenance groups</span><strong>{counts.provenanceGroups || 0}</strong></div>
        <div className={`teaching-metadata-item ${counts.leakageFindings ? 'warning' : ''}`}><span>Leakage findings</span><strong>{counts.leakageFindings || 0}</strong></div>
      </div>
      <details className="teaching-governance-details"><summary>Coverage and balance</summary>
        <div className="teaching-governance-columns">
          {[['Judgments',coverage.byJudgment],['Failure classes',coverage.byFailureClassification],['Reader roles',coverage.byAssertedRole],['Quality states',coverage.byQualityStatus]].map(([title,values]) => <div key={title}><h5>{title}</h5>{Object.entries(values || {}).map(([name,count]) => <div className="teaching-governance-row" key={name}><span>{pretty(name)}</span><strong>{count}</strong></div>)}</div>)}
        </div>
      </details>
      <details className="teaching-governance-details"><summary>Readiness gaps and collection recommendations</summary>
        {result.gaps?.length ? <ul className="teaching-governance-list">{result.gaps.map(gap => <li key={gap.code}><strong>{gap.actual}/{gap.required}</strong><span>{gap.message}</span></li>)}</ul> : <p>No configured collection gaps.</p>}
      </details>
      <details className="teaching-governance-details"><summary>Provenance and leakage</summary>
        <p>{result.provenance?.groupCount || 0} independent groups. {result.provenance?.leakage?.length || 0} leakage findings.</p>
        {(result.provenance?.leakage || []).map((item,index) => <div className="status-message error" key={`${item.type}-${index}`}>{pretty(item.type)} crosses {item.splits?.join(', ')}</div>)}
      </details>
      <div className="teaching-preview-meta"><span>Report: {result.reportDigest}</span><span>Corpus: {result.corpusDigest}</span><span>Tuning: disabled</span><span>Deployment: disabled</span></div>
      <div className="teaching-primary-actions"><button type="button" className="secondary" disabled={busy} onClick={verify}>Verify report</button></div>
    </>}
    {message && <div className={`status-message ${message.includes('failed') || message.includes('request') ? 'error' : 'ok'}`}>{message}</div>}
  </section>;
}
