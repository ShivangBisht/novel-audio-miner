const BASE = 'http://127.0.0.1:8766/teaching-guided-review';

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, options);
  if (!response.ok) throw new Error(`Guided Teaching request failed: ${await response.text()}`);
  return response.json();
}

export function diagnoseGuidedTeaching(body) {
  return request('/diagnose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
}
