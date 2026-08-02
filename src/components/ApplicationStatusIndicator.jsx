import { useEffect, useMemo, useState } from 'react';
import { getApplicationStartupStatus } from '../lib/applicationStartupClient.js';
import ApplicationStatusPanel from './ApplicationStatusPanel.jsx';

const POLL_MS = 10000;

function statusTone(status) {
  if (!status) return 'starting';
  if (status.overallStatus === 'failed') return 'failed';
  if (status.overallStatus === 'degraded' || status.stale) return 'degraded';
  return status.overallStatus === 'ready' ? 'ready' : 'starting';
}

export default function ApplicationStatusIndicator() {
  const [status, setStatus] = useState(null);
  const [requestError, setRequestError] = useState('');
  const [open, setOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function refresh() {
      try {
        const value = await getApplicationStartupStatus({ signal: controller.signal });
        if (active) { setStatus(value); setRequestError(''); }
      } catch (error) {
        if (active && error?.name !== 'AbortError') setRequestError(error?.message || String(error));
      }
    }
    refresh();
    const timer = window.setInterval(refresh, POLL_MS);
    return () => { active = false; controller.abort(); window.clearInterval(timer); };
  }, [refreshToken]);

  const optionalUnavailable = useMemo(() => Object.entries(status?.components || {})
    .filter(([, value]) => !value.required && ['degraded', 'failed'].includes(value.state)).length, [status]);
  const tone = requestError ? 'failed' : statusTone(status);
  const label = requestError
    ? 'Status unavailable'
    : tone === 'ready' && optionalUnavailable
      ? `${optionalUnavailable} optional service${optionalUnavailable === 1 ? '' : 's'} unavailable`
      : tone === 'ready' ? 'Application ready'
      : tone === 'failed' ? 'Startup problem'
      : tone === 'degraded' ? 'Application degraded'
      : 'Starting application';

  return <div className={`application-status application-status-${tone}`} data-testid="application-status-indicator">
    <button type="button" className="application-status-button" onClick={() => setOpen(value => !value)} aria-expanded={open}>
      <span className="application-status-dot" aria-hidden="true" />
      <span>{label}</span>
    </button>
    {open && <ApplicationStatusPanel
      status={status}
      requestError={requestError}
      onClose={() => setOpen(false)}
      onRetry={() => setRefreshToken(value => value + 1)}
    />}
  </div>;
}
