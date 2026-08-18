import { statusPresentationOrder } from '../lib/operationStatus.js';
export default function ReaderDomainStatus({ registry }) {
  const visible=statusPresentationOrder(registry).slice(0,4);
  if(!visible.length)return null;
  return <div className="reader-domain-status" role="status" aria-live="polite">
    {visible.map(item=><div key={item.domain} className={`reader-domain-status-item ${item.severity}`} data-status-domain={item.domain}>
      <strong>{item.domain.replaceAll('-',' ')}</strong><span>{item.message}</span>
      {item.recoverable&&item.recoveryAction&&<small>{item.recoveryAction}</small>}
    </div>)}
  </div>;
}
