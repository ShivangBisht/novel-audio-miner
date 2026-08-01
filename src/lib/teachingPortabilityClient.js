const URL='http://127.0.0.1:8766';
async function responseError(response){let detail=`${response.status} ${response.statusText}`;try{const body=await response.json();detail=typeof body?.detail==='string'?body.detail:JSON.stringify(body?.detail||body);}catch{}throw new Error(`Teaching portability request failed: ${detail}`);}
async function request(path,options={}){const response=await fetch(`${URL}${path}`,{headers:{'Content-Type':'application/json; charset=utf-8'},...options});if(!response.ok)await responseError(response);return response.json();}
export async function exportTeachingEvidence(){const response=await fetch(`${URL}/teaching-portability/export`);if(!response.ok)await responseError(response);const packageJson=await response.text();return {packageJson,packageData:JSON.parse(packageJson)};}
export const verifyTeachingEvidence=packageJson=>request('/teaching-portability/verify',{method:'POST',body:JSON.stringify({packageJson})});
export const previewTeachingImport=packageJson=>request('/teaching-portability/import/preview',{method:'POST',body:JSON.stringify({packageJson})});
export const applyTeachingImport=(packageJson,confirmPackageDigest)=>request('/teaching-portability/import/apply',{method:'POST',body:JSON.stringify({packageJson,confirmPackageDigest})});
