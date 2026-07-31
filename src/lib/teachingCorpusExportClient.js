const URL='http://127.0.0.1:8766';
async function request(path,options={}){const response=await fetch(`${URL}${path}`,{headers:{'Content-Type':'application/json; charset=utf-8'},...options});if(!response.ok){let detail=`${response.status} ${response.statusText}`;try{const body=await response.json();detail=typeof body?.detail==='string'?body.detail:JSON.stringify(body?.detail||body);}catch{}throw new Error(`Corpus export request failed: ${detail}`);}return response.json();}
export const previewTeachingCorpusExport=()=>request('/teaching-corpus-export/preview');
export const generateTeachingCorpusDryRun=()=>request('/teaching-corpus-export/generate',{method:'POST'});
export const verifyTeachingCorpusArtifact=artifact=>request('/teaching-corpus-export/verify',{method:'POST',body:JSON.stringify({artifact})});
