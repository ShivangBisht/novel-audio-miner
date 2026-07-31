const URL='http://127.0.0.1:8766';
async function request(path,options={}){const response=await fetch(`${URL}${path}`,{headers:{'Content-Type':'application/json; charset=utf-8'},...options});if(!response.ok){let detail=`${response.status} ${response.statusText}`;try{const body=await response.json();detail=typeof body?.detail==='string'?body.detail:JSON.stringify(body?.detail||body);}catch{}throw new Error(`Offline evaluation request failed: ${detail}`);}return response.json();}
export const previewOfflineEvaluation=()=>request('/teaching-offline-evaluation/preview');
export const runOfflineEvaluation=(candidatePredictions={},policy={})=>request('/teaching-offline-evaluation/run',{method:'POST',body:JSON.stringify({candidatePredictions,policy})});
export const verifyOfflineExperiment=experiment=>request('/teaching-offline-evaluation/verify',{method:'POST',body:JSON.stringify({experiment})});
