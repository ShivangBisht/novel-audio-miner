const URL='http://127.0.0.1:8766';
async function request(path,options={}){const response=await fetch(`${URL}${path}`,{headers:{'Content-Type':'application/json; charset=utf-8'},...options});if(!response.ok){let detail=`${response.status} ${response.statusText}`;try{const body=await response.json();detail=typeof body?.detail==='string'?body.detail:JSON.stringify(body?.detail||body);}catch{}throw new Error(`Corpus quality request failed: ${detail}`);}return response.json();}
export const getCorpusQualitySummary=()=>request('/teaching-quality/summary');
export const getRecordQuality=id=>request(`/teaching-quality/${encodeURIComponent(id)}`);
export const setRecordQuality=(id,qualityStatus,reviewer,qualityNote)=>request(`/teaching-quality/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify({qualityStatus,reviewer,qualityNote})});
