/** Alpha 4 known-word authority and cache lifecycle. */
const ANKI_CACHE_KEY = 'novel-audio-miner:ankiWordCache';
const MANUAL_KNOWN_KEY = 'novel-audio-miner:manualKnownWords';
const LEGACY_CACHE_KEY = 'novel-audio-miner:wordCache';
const CACHE_VERSION = 4;
const CACHE_TTL_DAYS = 7;
const NOTE_TYPE_FIELDS = { 'Kaishi 1.5k':'Word', JP1Kv3:'Word', ImmersionKitCard:'Word', Kiku:'Expression' };
let ankiRecord = null;
let manualKnownCache = null;
let runtime = { phase:'idle', error:null };
function normalize(value){ return typeof value === 'string' ? value.trim() : ''; }
function loadManual(){
 if(manualKnownCache) return manualKnownCache;
 try { const data=JSON.parse(localStorage.getItem(MANUAL_KNOWN_KEY)||'null'); manualKnownCache=new Set(data?.version===CACHE_VERSION||data?.version===3?data.words||[]:[]); }
 catch { manualKnownCache=new Set(); }
 return manualKnownCache;
}
function saveManual(){ try{localStorage.setItem(MANUAL_KNOWN_KEY,JSON.stringify({version:CACHE_VERSION,timestamp:Date.now(),words:[...loadManual()]}));}catch{} }
function loadAnki(){
 if(ankiRecord) return ankiRecord;
 try {
  const data=JSON.parse(localStorage.getItem(ANKI_CACHE_KEY)||'null');
  if(!data || ![3,CACHE_VERSION].includes(data.version)) return null;
  const age=Date.now()-(data.refreshedAt||data.timestamp||0);
  if(age>CACHE_TTL_DAYS*86400000) return null;
  ankiRecord={words:new Set(data.words||[]),refreshedAt:data.refreshedAt||data.timestamp||null,complete:data.complete!==false,failures:data.failures||[]};
  return ankiRecord;
 } catch { return null; }
}
function saveAnki(){ try{localStorage.setItem(ANKI_CACHE_KEY,JSON.stringify({version:CACHE_VERSION,refreshedAt:ankiRecord.refreshedAt,complete:ankiRecord.complete,failures:ankiRecord.failures,words:[...ankiRecord.words]}));}catch{} }
function union(){ return new Set([...(loadAnki()?.words||[]),...loadManual()]); }
export function getKnownWordAuthority(){
 const anki=loadAnki(); const manual=loadManual();
 const phase=runtime.phase==='loading'?'loading':runtime.phase==='failed'?'failed':anki?(anki.complete?'ready':'partial'):'unavailable';
 return Object.freeze({schemaVersion:'1.0',phase,ready:Boolean(anki),complete:Boolean(anki?.complete),error:runtime.error,refreshedAt:anki?.refreshedAt||null,ankiCount:anki?.words.size||0,manualCount:manual.size,effectiveCount:union().size,failures:Object.freeze([...(anki?.failures||[])])});
}
export function resolveKnownWordState(word){
 const key=normalize(word); const manual=Boolean(key&&loadManual().has(key)); const anki=Boolean(key&&loadAnki()?.words.has(key)); const authority=getKnownWordAuthority();
 const confirmedUnknown=Boolean(key&&!manual&&!anki&&authority.ready&&authority.complete);
 return Object.freeze({key,manual,anki,effective:manual||anki,confirmedUnknown,indeterminate:Boolean(key&&!manual&&!anki&&!confirmedUnknown),authorityPhase:authority.phase});
}
export async function getKnownWords(fn,onProgress){ if(loadAnki()) return union(); return buildCache(fn,onProgress); }
export async function buildCache(fn,onProgress){
 runtime={phase:'loading',error:null}; const words=new Set(),failures=[];
 for(const [noteType,fieldName] of Object.entries(NOTE_TYPE_FIELDS)){
  try{
   onProgress?.(`Reading ${noteType} cards...`); const ids=await fn('findNotes',{query:`note:"${noteType}"`});
   for(let i=0;i<ids.length;i+=500){ const batch=ids.slice(i,i+500); onProgress?.(`Reading ${noteType}: ${Math.min(i+500,ids.length)} / ${ids.length}`); const notes=await fn('notesInfo',{notes:batch}); for(const note of notes){const value=normalize(note.fields?.[fieldName]?.value);if(value)words.add(value);} }
  }catch(error){ failures.push({noteType,message:error?.message||String(error)}); }
 }
 ankiRecord={words,refreshedAt:Date.now(),complete:failures.length===0,failures}; saveAnki(); loadManual();
 runtime=failures.length===Object.keys(NOTE_TYPE_FIELDS).length?{phase:'failed',error:'All configured Anki note-type reads failed.'}:{phase:failures.length?'partial':'ready',error:failures.length?'Some configured Anki note types could not be read.':null};
 if(runtime.phase==='failed') throw new Error(runtime.error);
 return union();
}
export function addManualKnownWord(word){const key=normalize(word);if(!key||loadManual().has(key))return false;loadManual().add(key);saveManual();return true;}
export function addKnownWord(word){return addManualKnownWord(word);}
export function removeManualKnownWord(word){const key=normalize(word);if(!key||!loadManual().delete(key))return false;saveManual();return true;}
export function isManualKnownWord(word){return resolveKnownWordState(word).manual;}
export function isAnkiKnownWord(word){return resolveKnownWordState(word).anki;}
export function isKnownWord(word){return resolveKnownWordState(word).effective;}
export function getManualKnownWords(){return new Set(loadManual());}
export function getCacheSize(){return union().size;}
export function getCacheStats(){const a=getKnownWordAuthority();return {anki:a.ankiCount,manual:a.manualCount,total:a.effectiveCount,phase:a.phase,complete:a.complete,refreshedAt:a.refreshedAt,error:a.error,failures:[...a.failures]};}
export function clearCache(){ankiRecord=null;runtime={phase:'idle',error:null};try{localStorage.removeItem(ANKI_CACHE_KEY);localStorage.removeItem(LEGACY_CACHE_KEY);}catch{}}
export function clearManualKnownWords(){manualKnownCache=new Set();saveManual();}
