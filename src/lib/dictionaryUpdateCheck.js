const DEFAULT_BASE_URL = 'http://127.0.0.1:8766';
const HTTP_URL = /^https?:\/\//i;
function clean(value) { return typeof value === 'string' ? value.trim() : ''; }
function parseRevision(value) {
  const raw = clean(value); if (!raw) return null;
  const date = raw.match(/(\d{4})[-_.](\d{2})[-_.](\d{2})/);
  if (date) return { kind:'date', parts:date.slice(1).map(Number), raw };
  const version = raw.match(/\d+(?:\.\d+)+/);
  if (version) return { kind:'version', parts:version[0].split('.').map(Number), raw };
  return { kind:'text', parts:[raw.toLowerCase()], raw };
}
function compareParts(a,b){for(let i=0;i<Math.max(a.length,b.length);i+=1){const x=a[i]??0,y=b[i]??0;if(x>y)return 1;if(x<y)return-1;}return 0;}
export function compareDictionaryRevision(installed,available){const a=parseRevision(installed),b=parseRevision(available);if(!a||!b||a.kind!==b.kind)return null;return compareParts(a.parts,b.parts);}
function pick(object,keys){for(const key of keys){const value=object?.[key];if(value!==undefined&&value!==null&&value!=='')return value;}return null;}
function normalizeManifest(payload,dictionary){
  const candidate=Array.isArray(payload?.dictionaries)?payload.dictionaries.find(item=>item?.stableIdentity===dictionary.stableIdentity||item?.dictionaryId===dictionary.dictionaryId||item?.title===dictionary.displayTitle):payload;
  if(!candidate||typeof candidate!=='object')throw new Error('Update metadata does not contain dictionary information.');
  const downloadUrl=clean(pick(candidate,['downloadUrl','archiveUrl','packageUrl','url','sourceUrl']));
  return {stableIdentity:clean(candidate.stableIdentity)||dictionary.stableIdentity,title:clean(candidate.title||candidate.displayTitle)||dictionary.displayTitle,revision:clean(pick(candidate,['revision','releaseDate']))||null,version:clean(candidate.version)||null,contentDigest:clean(pick(candidate,['contentDigest','sha256']))||null,downloadUrl:downloadUrl||dictionary.downloadUrl||null,raw:candidate};
}
export function evaluateUpdateAvailability(dictionary,manifest){
  if(manifest.stableIdentity!==dictionary.stableIdentity)return{status:'identity-mismatch',updateAvailable:false};
  if(manifest.contentDigest&&dictionary.contentDigest){const differs=manifest.contentDigest.toLowerCase()!==dictionary.contentDigest.toLowerCase();return{status:differs?'update-available':'up-to-date',updateAvailable:differs};}
  const comparison=compareDictionaryRevision(dictionary.revision||dictionary.version,manifest.revision||manifest.version);
  if(comparison===null)return{status:'comparison-unavailable',updateAvailable:false};
  return{status:comparison<0?'update-available':'up-to-date',updateAvailable:comparison<0};
}
async function browserMetadata(url,options){const response=await (options.fetchImpl||fetch)(url,{method:'GET',cache:'no-store',signal:options.signal,headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`HTTP ${response.status}`);return{payload:await response.json(),route:'browser'};}
async function analyzerMetadata(url,options){const response=await (options.fetchImpl||fetch)(`${options.baseUrl||DEFAULT_BASE_URL}/dictionary-sync/update/check`,{method:'POST',signal:options.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});const payload=await response.json().catch(()=>null);if(!response.ok)throw new Error(payload?.detail||`Analyzer update check failed (${response.status}).`);return{payload:payload.metadata,route:'analyzer'};}
export async function checkDictionaryUpdate(dictionary,options={}){
  const url=clean(dictionary.updateManifestUrl);const checkedAt=new Date().toISOString();if(!url)return{dictionaryId:dictionary.dictionaryId,status:'no-update-source',updateAvailable:false};
  let fetched;let browserError=null;try{fetched=await browserMetadata(url,options);}catch(error){browserError=error;try{fetched=await analyzerMetadata(url,options);}catch(analyzerError){return{dictionaryId:dictionary.dictionaryId,checkedAt,status:'network-unavailable',updateAvailable:false,error:`Browser: ${browserError.message}; Analyzer: ${analyzerError.message}`};}}
  try{const manifest=normalizeManifest(fetched.payload,dictionary);const evaluation=evaluateUpdateAvailability(dictionary,manifest);return{dictionaryId:dictionary.dictionaryId,checkedAt,manifest,route:fetched.route,...evaluation};}catch(error){return{dictionaryId:dictionary.dictionaryId,checkedAt,status:'invalid-online-metadata',updateAvailable:false,route:fetched.route,error:error.message};}
}
export async function checkAllDictionaryUpdates(dictionaries,options={}){const results=[];for(const dictionary of dictionaries||[]){if(options.signal?.aborted)throw new DOMException('Update check cancelled.','AbortError');const result=await checkDictionaryUpdate(dictionary,options);results.push(result);options.onResult?.(result);}return results;}
async function browserArchive(url,options){const response=await (options.fetchImpl||fetch)(url,{method:'GET',cache:'no-store',signal:options.signal});if(!response.ok)throw new Error(`HTTP ${response.status}`);return{blob:await response.blob(),route:'browser'};}
async function analyzerArchive(url,options){const response=await (options.fetchImpl||fetch)(`${options.baseUrl||DEFAULT_BASE_URL}/dictionary-sync/update/archive`,{method:'POST',signal:options.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});if(!response.ok){const payload=await response.json().catch(()=>null);throw new Error(payload?.detail||`Analyzer download failed (${response.status}).`);}return{blob:await response.blob(),route:'analyzer'};}
export async function downloadDictionaryUpdate(result,options={}){if(!result?.updateAvailable||!HTTP_URL.test(result?.manifest?.downloadUrl||''))throw new Error('No downloadable update is available.');let fetched;try{fetched=await browserArchive(result.manifest.downloadUrl,options);}catch(browserError){try{fetched=await analyzerArchive(result.manifest.downloadUrl,options);}catch(analyzerError){throw new Error(`Browser: ${browserError.message}; Analyzer: ${analyzerError.message}`);}}const fileName=clean(result.manifest.raw?.fileName)||`${result.manifest.stableIdentity}-${result.manifest.revision||result.manifest.version||'update'}.zip`;const file=new File([fetched.blob],fileName,{type:fetched.blob.type||'application/zip'});file.updateRoute=fetched.route;return file;}
