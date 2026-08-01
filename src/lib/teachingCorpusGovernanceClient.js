const BASE = 'http://127.0.0.1:8766/teaching-corpus-governance';
async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json; charset=utf-8' }, ...options });
  const raw = await response.text();
  let body = null; try { body = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) throw new Error(`Corpus governance request failed: ${body?.detail ? JSON.stringify(body.detail) : raw || response.statusText}`);
  return body;
}
export const getCorpusGovernanceReport = () => request('/report');
export const buildCorpusGovernanceReport = policy => request('/report', { method: 'POST', body: JSON.stringify({ policy }) });
export const verifyCorpusGovernanceReport = report => request('/verify', { method: 'POST', body: JSON.stringify({ report }) });
