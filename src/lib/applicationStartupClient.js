const STARTUP_STATUS_URL = '/api/jp-analyzer/startup/status';

export async function getApplicationStartupStatus({ signal } = {}) {
  const response = await fetch(STARTUP_STATUS_URL, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  });
  if (!response.ok) {
    throw new Error(`Startup status request failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export { STARTUP_STATUS_URL };
