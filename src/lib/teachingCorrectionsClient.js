const DEFAULT_BASE_URL = 'http://127.0.0.1:8766';
async function request(path, options = {}, baseUrl = DEFAULT_BASE_URL) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.detail || `Teaching request failed (${response.status}).`);
  return payload;
}
export function previewReaderCorrection(payload, options = {}) {
  return request('/reader-corrections/preview', { method: 'POST', body: JSON.stringify(payload), signal: options.signal }, options.baseUrl);
}
export function listScopedReaderCorrections({ sentence, start, end, includeInactive = false }, options = {}) {
  const params = new URLSearchParams({ sentence, includeInactive: String(includeInactive) });
  if (Number.isInteger(start)) params.set('start', String(start));
  if (Number.isInteger(end)) params.set('end', String(end));
  return request(`/reader-corrections/scope?${params}`, { signal: options.signal }, options.baseUrl);
}
