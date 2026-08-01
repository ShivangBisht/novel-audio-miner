const DEFAULT_URL = 'http://127.0.0.1:8766';
async function request(path, options = {}) {
  const response = await fetch(`${DEFAULT_URL}${path}`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    ...options,
  });

  const raw = await response.text();
  let body = null;
  try { body = raw ? JSON.parse(raw) : null; } catch { body = null; }

  if (!response.ok) {
    if (body?.detail?.code === 'ANALYZER_SNAPSHOT_UNAVAILABLE') {
      throw new Error('The analyzer is still processing this sentence. Return to the preview and start the Teaching review again.');
    }
    const detail = typeof body?.detail === 'string'
      ? body.detail
      : body?.detail?.message || body?.message || raw || `${response.status} ${response.statusText}`;
    throw new Error(`Teaching decision request failed: ${detail}`);
  }

  return body;
}
export const captureTeachingSnapshot = sentence => request('/teaching-decisions/snapshot', { method:'POST', body:JSON.stringify({sentence}) });
export const createTeachingDecision = payload => request('/teaching-decisions', { method:'POST', body:JSON.stringify(payload) });
export const supersedeTeachingDecision = (recordId,payload) => request(`/teaching-decisions/${encodeURIComponent(recordId)}/supersede`, { method:'POST', body:JSON.stringify(payload) });
export const retractTeachingDecision = (recordId,note=null) => request(`/teaching-decisions/${encodeURIComponent(recordId)}/retract`, { method:'POST', body:JSON.stringify({note}) });
export const teachingDecisionSummary = () => request('/teaching-decisions/summary');
export const teachingDecisionDiagnosis = recordId => request(`/teaching-decisions/${encodeURIComponent(recordId)}/diagnosis`);
export const listTeachingDecisions = ({sentenceSha256,judgment,failureClassification,lifecycleStatus=null}={}) => {
 const query=new URLSearchParams();
 if(sentenceSha256)query.set('sentenceSha256',sentenceSha256);
 if(judgment)query.set('judgment',judgment);
 if(failureClassification)query.set('failureClassification',failureClassification);
 if(lifecycleStatus!==null)query.set('lifecycleStatus',lifecycleStatus);
 return request(`/teaching-decisions?${query}`);
};
