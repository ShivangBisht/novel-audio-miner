/** Alpha 6 domain-owned operation status model. */
export const STATUS_DOMAINS = Object.freeze(['selection','known-word','enrichment','teaching','correction','analyzer','dictionary','anki-connect','startup']);
const SEVERITY = Object.freeze({ error: 5, working: 4, warning: 3, success: 2, info: 1, idle: 0 });
function nowIso(now = new Date()) { return now.toISOString(); }
export function createDomainStatus(domain, patch = {}, now = new Date()) {
  if (!STATUS_DOMAINS.includes(domain)) throw new Error(`Unknown status domain: ${domain}`);
  const severity = SEVERITY[patch.severity] == null ? 'info' : patch.severity;
  return Object.freeze({
    schemaVersion: '1.0', domain, phase: String(patch.phase || 'idle'), severity,
    message: String(patch.message || ''), timestamp: patch.timestamp || nowIso(now),
    operationId: patch.operationId || null, recoverable: patch.recoverable === true,
    recoveryAction: patch.recoveryAction || null, details: patch.details || null,
    owner: patch.owner || 'reader'
  });
}
export function createStatusRegistry(seed = {}) {
  return Object.freeze(Object.fromEntries(STATUS_DOMAINS.map(domain => [domain, seed[domain] || createDomainStatus(domain)])));
}
export function updateStatusDomain(registry, domain, patch, now = new Date()) {
  return Object.freeze({ ...(registry || createStatusRegistry()), [domain]: createDomainStatus(domain, patch, now) });
}
export function projectAnalyzerStatus(shadow, readerValid) {
  const raw = shadow?.status || 'idle';
  if (raw === 'error') return createDomainStatus('analyzer',{phase:'failed',severity:'error',message:shadow?.error?.message || 'JP Analyzer failed.',recoverable:true,recoveryAction:'Retry scene analysis',details:{source:shadow?.source||null,cacheReason:shadow?.cacheReason||null}});
  if (raw === 'ready' && readerValid) return createDomainStatus('analyzer',{phase:'ready',severity:shadow?.error?'warning':'success',message:shadow?.error?'Analyzer ready with background errors.':'Analyzer ready.',details:{source:shadow?.source||null,cacheReason:shadow?.cacheReason||null,prefetchStatus:shadow?.prefetchStatus||'idle'}});
  return createDomainStatus('analyzer',{phase:raw,severity:['metadata','loading'].includes(raw)?'working':'info',message:raw==='metadata'?'Checking analyzer metadata.':raw==='idle'?'Analyzer idle.':'Analyzing scene.'});
}
export function projectKnownWordStatus(authority) {
  const phase=authority?.phase||'unavailable';
  const severity=phase==='failed'?'error':phase==='partial'||phase==='unavailable'?'warning':phase==='loading'?'working':'success';
  return createDomainStatus('known-word',{phase,severity,message:phase==='ready'?`${authority.effectiveCount} effective known words ready.`:authority?.error||`Known-word authority is ${phase}.`,recoverable:['failed','partial','unavailable'].includes(phase),recoveryAction:['failed','partial','unavailable'].includes(phase)?'Rebuild Anki cache':null,details:authority||null});
}
export function projectAnkiStatus(anki) {
  return createDomainStatus('anki-connect',{phase:anki?.phase || (anki?.connected?'connected':'unchecked'),severity:anki?.connected?'success':anki?.phase==='checking'?'working':'warning',message:anki?.message||'AnkiConnect not checked.',recoverable:!anki?.connected,recoveryAction:!anki?.connected?'Start Anki and AnkiConnect, then retry':null});
}
export function statusPresentationOrder(registry) {
  return Object.values(registry||{}).filter(item=>item?.message&&item.phase!=='idle').sort((a,b)=>(SEVERITY[b.severity]-SEVERITY[a.severity])||String(b.timestamp).localeCompare(String(a.timestamp)));
}
