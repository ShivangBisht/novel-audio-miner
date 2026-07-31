const DEFAULT_URL = 'http://127.0.0.1:8766';

async function request(path, options = {}) {
  const response = await fetch(`${DEFAULT_URL}${path}`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    ...options,
  });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = await response.json();
      detail = typeof body?.detail === 'string' ? body.detail : body?.detail?.message || JSON.stringify(body?.detail || body);
    } catch {}
    throw new Error(`Teaching decision request failed: ${detail}`);
  }
  return response.json();
}

export const captureTeachingSnapshot = sentence => request('/teaching-decisions/snapshot', {
  method: 'POST', body: JSON.stringify({ sentence }),
});

export const createTeachingDecision = payload => request('/teaching-decisions', {
  method: 'POST', body: JSON.stringify(payload),
});

export const listTeachingDecisions = ({ sentenceSha256, lifecycleStatus = null } = {}) => {
  const query = new URLSearchParams();
  if (sentenceSha256) query.set('sentenceSha256', sentenceSha256);
  if (lifecycleStatus !== null) query.set('lifecycleStatus', lifecycleStatus);
  return request(`/teaching-decisions?${query.toString()}`);
};

export const retractTeachingDecision = (recordId, note = null) => request(
  `/teaching-decisions/${encodeURIComponent(recordId)}/retract`,
  { method: 'POST', body: JSON.stringify({ note }) },
);
