const BASE="http://127.0.0.1:8766/teaching-tuning-corpus";
async function textOrThrow(response){const text=await response.text();if(!response.ok)throw new Error(text);return text;}
export async function exportTuningCorpus(profile){return textOrThrow(await fetch(`${BASE}/export?profile=${encodeURIComponent(profile)}`));}
export async function previewTuningCorpus(profile){return JSON.parse(await textOrThrow(await fetch(`${BASE}/preview?profile=${encodeURIComponent(profile)}`)));}
export async function verifyTuningCorpus(packageJson){return JSON.parse(await textOrThrow(await fetch(`${BASE}/verify`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({packageJson})})));}
