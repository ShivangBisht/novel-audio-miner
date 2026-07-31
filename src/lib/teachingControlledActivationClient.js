const URL='http://127.0.0.1:8766';
async function request(path,options={}){const response=await fetch(`${URL}${path}`,{headers:{'Content-Type':'application/json; charset=utf-8'},...options});if(!response.ok){let detail=`${response.status} ${response.statusText}`;try{const body=await response.json();detail=typeof body?.detail==='string'?body.detail:JSON.stringify(body?.detail||body);}catch{}throw new Error(`Controlled activation request failed: ${detail}`);}return response.json();}
export const previewControlledActivation=()=>request('/teaching-controlled-activation/preview');
export const createShadowPlan=experiment=>request('/teaching-controlled-activation/plan',{method:'POST',body:JSON.stringify({experiment})});
export const verifyShadowPlan=plan=>request('/teaching-controlled-activation/verify',{method:'POST',body:JSON.stringify({plan})});
