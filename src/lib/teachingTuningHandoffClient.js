const BASE='http://127.0.0.1:8766/teaching-tuning-handoff';
async function request(path,options={}){const response=await fetch(`${BASE}${path}`,{headers:{'Content-Type':'application/json; charset=utf-8'},...options});const text=await response.text();let data=null;try{data=text?JSON.parse(text):null;}catch{}if(!response.ok)throw new Error(typeof data?.detail==='string'?data.detail:JSON.stringify(data?.detail||data||text));return data;}
export const previewTuningHandoff=()=>request('/preview');
export const verifyTuningHandoffArtifact=(artifactType,artifact)=>request('/verify',{method:'POST',body:JSON.stringify({artifactType,artifact})});
