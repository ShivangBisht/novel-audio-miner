const LABELS = {
  analyzer: 'Japanese analyzer',
  dictionary: 'Dictionary',
  kwja: 'KWJA',
  frontend: 'Application interface',
  voicevox: 'VOICEVOX',
  ankiConnect: 'AnkiConnect',
};

const IMPACT = {
  voicevox: 'Generated VOICEVOX audio is unavailable. Reading and analysis still work.',
  ankiConnect: 'Mining cards to Anki is unavailable. Reading and analysis still work.',
  analyzer: 'Sentence analysis and colourisation are unavailable.',
  dictionary: 'Dictionary evidence and scoring may be unavailable.',
  kwja: 'KWJA-backed sentence analysis is unavailable.',
  frontend: 'The application interface is unavailable.',
};

function pretty(value) {
  return String(value || 'pending').replaceAll('-', ' ');
}

export default function ApplicationStatusPanel({ status, requestError, onClose, onRetry }) {
  const components = Object.entries(status?.components || {});
  const problems = status?.problems || [];
  return <section className="application-status-panel" role="dialog" aria-label="Application diagnostics" data-testid="application-status-panel">
    <div className="application-status-heading">
      <div><span>Japanese Novel Miner</span><h2>Application status</h2></div>
      <button type="button" className="secondary" onClick={onClose}>Close</button>
    </div>
    {requestError && <div className="application-status-problem"><strong>Status request failed</strong><span>{requestError}</span></div>}
    <div className="application-component-list">
      {components.map(([name, component]) => <article key={name} className={`application-component application-component-${component.state}`}>
        <div><span className="application-component-dot" /><strong>{LABELS[name] || name}</strong></div>
        <span className="application-component-state">{pretty(component.state)}</span>
        <p>{component.detail || IMPACT[name] || 'No detail available.'}</p>
        {component.state !== 'ready' && IMPACT[name] && <small>{IMPACT[name]}</small>}
      </article>)}
    </div>
    {problems.length > 0 && <div className="application-problem-list">
      <h3>Attention needed</h3>
      {problems.map((problem, index) => <div className={problem.fatal ? 'application-status-problem fatal' : 'application-status-problem'} key={`${problem.code}-${index}`}>
        <strong>{problem.message}</strong>
        <code>{problem.code}</code>
        {problem.detail && <span>{problem.detail}</span>}
        {problem.suggestedAction && <span>{problem.suggestedAction}</span>}
      </div>)}
    </div>}
    <details className="application-technical-details">
      <summary>Technical details</summary>
      <div><span>Source</span><code>{status?.source || 'unavailable'}</code></div>
      <div><span>Last update</span><code>{status?.capturedAt || 'unavailable'}</code></div>
      <div><span>Logs</span><code>{status?.diagnostics?.logDirectory || 'unavailable'}</code></div>
    </details>
    <div className="application-status-actions">
      <button type="button" onClick={onRetry}>Retry status check</button>
    </div>
  </section>;
}
