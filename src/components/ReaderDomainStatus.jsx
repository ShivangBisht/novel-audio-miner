import { statusPresentationOrder } from '../lib/operationStatus.js';
const READER_ACTION_DOMAINS = new Set(['selection', 'enrichment', 'teaching', 'correction', 'analyzer']);
const ACTIONABLE_SEVERITIES = new Set(['error', 'warning', 'working']);
export default function ReaderDomainStatus({ registry }) {
  const visible = statusPresentationOrder(registry)
    .filter(item => READER_ACTION_DOMAINS.has(item.domain) && ACTIONABLE_SEVERITIES.has(item.severity) && item.phase !== 'external')
    .slice(0, 1);
  if (!visible.length) return null;
  const item = visible[0];
  return <div className={`reader-domain-notice ${item.severity}`} role="status" aria-live={item.severity === 'error' ? 'assertive' : 'polite'} data-status-domain={item.domain}>
    <div><strong>{item.domain.replaceAll('-', ' ')}</strong><span>{item.message}</span></div>
    {item.recoverable && item.recoveryAction && <small>{item.recoveryAction}</small>}
  </div>;
}
