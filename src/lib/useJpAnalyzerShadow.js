import { useEffect, useRef, useState } from 'react';
import { analyzeSentence, getAnalyzerHealth } from './jpAnalyzerClient.js';
import { ANALYZER_CACHE_PREFIX, createAnalyzerCacheIdentity, createAnalyzerCacheRecord,
  normalizeAnalyzerMetadata, validateAnalyzerCacheRecord } from './analyzerCacheIdentity.js';

const MAX_PERSISTED_ENTRIES = 100;
const memoryCache = new Map();
const pendingRequests = new Map();

function initial() { return { status:'idle', source:null, result:null, error:null, elapsedMs:null,
  cacheKey:null, cacheIdentity:null, cacheReason:null, correctionRevision:null,
  analyzerVersion:null, readerSpanSchemaVersion:null, inFlightRequestCount:pendingRequests.size }; }
async function textHash(text) { const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)); return Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,'0')).join(''); }
function storageKey(identity) { return ANALYZER_CACHE_PREFIX + identity; }
function removeStored(identity) { try { localStorage.removeItem(storageKey(identity)); } catch {} }
function readStored(identity,text,hash,metadata) { try { const raw=localStorage.getItem(storageKey(identity)); if(!raw)return null; const record=JSON.parse(raw); const check=validateAnalyzerCacheRecord(record,text,hash,metadata); if(!check.valid){removeStored(identity);return null;} record.lastAccessedAt=new Date().toISOString(); localStorage.setItem(storageKey(identity),JSON.stringify(record)); return record; } catch { removeStored(identity); return null; } }
function trimStorage() { try { const rows=[]; for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key?.startsWith(ANALYZER_CACHE_PREFIX))continue;try{const v=JSON.parse(localStorage.getItem(key));rows.push({key,at:v?.lastAccessedAt||v?.savedAt||''});}catch{rows.push({key,at:''});}} rows.sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(MAX_PERSISTED_ENTRIES).forEach(x=>localStorage.removeItem(x.key)); } catch {} }
function persist(record) { try { localStorage.setItem(storageKey(record.cacheIdentity),JSON.stringify(record)); trimStorage(); } catch {} }
function pending(identity,text) { if(pendingRequests.has(identity))return pendingRequests.get(identity); const started=performance.now(); const request=analyzeSentence(text).then(result=>({result,elapsedMs:Math.round(performance.now()-started)})).finally(()=>pendingRequests.delete(identity)); pendingRequests.set(identity,request); return request; }

export function clearJpAnalyzerShadowCache(){ memoryCache.clear(); try{const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith(ANALYZER_CACHE_PREFIX))keys.push(k);}keys.forEach(k=>localStorage.removeItem(k));}catch{} }
export function getJpAnalyzerShadowCacheSize(){return memoryCache.size;}

export function useJpAnalyzerShadow(text,{enabled=true}={}) {
  const sourceText=String(text??''); const generation=useRef(0); const [state,setState]=useState(initial);
  useEffect(()=>{ generation.current+=1; const runId=generation.current; if(!enabled||!sourceText.trim()){setState(initial());return;} let disposed=false;
    async function run(){ setState({...initial(),status:'metadata',cacheReason:'checking-authoritative-metadata'});
      try {
        const [hash,health]=await Promise.all([textHash(sourceText),getAnalyzerHealth()]);
        if(disposed||runId!==generation.current)return;
        const metadata=normalizeAnalyzerMetadata(health); const identity=createAnalyzerCacheIdentity(hash,metadata);
        if(!metadata.valid||!identity) throw new Error('JP Analyzer health lacks cache identity metadata.');
        const common={cacheKey:hash,cacheIdentity:identity,correctionRevision:metadata.correctionRevision,analyzerVersion:metadata.analyzerVersion,readerSpanSchemaVersion:metadata.readerSpanSchemaVersion};
        const mem=memoryCache.get(identity); const memCheck=validateAnalyzerCacheRecord(mem,sourceText,hash,metadata);
        if(memCheck.valid){setState({...initial(),...common,status:'ready',source:'memory-cache',result:mem,elapsedMs:0,cacheReason:'validated-memory-hit'});return;}
        if(mem)memoryCache.delete(identity);
        const stored=readStored(identity,sourceText,hash,metadata);
        if(stored){memoryCache.set(identity,stored);setState({...initial(),...common,status:'ready',source:'persistent-cache',result:stored,elapsedMs:0,cacheReason:'validated-persistent-hit'});return;}
        setState({...initial(),...common,status:'analyzing',source:'network',cacheReason:'cache-miss',inFlightRequestCount:pendingRequests.size+1});
        const response=await pending(identity,sourceText); if(disposed||runId!==generation.current)return;
        const responseMetadata=normalizeAnalyzerMetadata(response.result);
        if(createAnalyzerCacheIdentity(hash,responseMetadata)!==identity) throw new Error('Analyzer metadata changed during analysis; result was not cached.');
        const record=createAnalyzerCacheRecord(response.result,hash,metadata); const check=validateAnalyzerCacheRecord(record,sourceText,hash,metadata);
        if(!check.valid) throw new Error(`Analyzer result is not cacheable: ${check.reason}`);
        memoryCache.set(identity,record);persist(record);
        setState({...initial(),...common,status:'ready',source:'network',result:record,elapsedMs:response.elapsedMs,cacheReason:'network-result-cached'});
      } catch(error){if(disposed||runId!==generation.current)return;setState({...initial(),status:'error',source:'network',error,cacheReason:'metadata-or-analysis-failed'});}
    }
    run(); return()=>{disposed=true;};
  },[sourceText,enabled]); return state;
}
