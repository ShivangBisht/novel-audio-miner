import { loadTokenizer, tokenizeText } from './tokenizer.js';
import { classifyTokens, getComprehensionWords, getDisplayWords, getMiningCandidates } from './wordModel.js';
const cache=new Map(),inFlight=new Map(); const MAX=100;
export function buildLegacyKuromojiSceneModelFromTokens(text,tokens){const classifiedWords=classifyTokens(tokens||[]),displayWords=getDisplayWords(classifiedWords);return{source:'legacy-kuromoji',text:String(text??''),tokens:tokens||[],classifiedWords,displayWords,comprehensionWords:getComprehensionWords(classifiedWords),miningCandidates:getMiningCandidates(classifiedWords),contentWords:displayWords};}
function remember(text,model){if(cache.has(text))cache.delete(text);cache.set(text,model);while(cache.size>MAX)cache.delete(cache.keys().next().value);return model;}
export async function getLegacyKuromojiSceneModel(text){const source=String(text??'');if(!source.trim())return buildLegacyKuromojiSceneModelFromTokens(source,[]);if(cache.has(source))return remember(source,cache.get(source));if(inFlight.has(source))return inFlight.get(source);const request=(async()=>{await loadTokenizer();return remember(source,buildLegacyKuromojiSceneModelFromTokens(source,tokenizeText(source)));})().finally(()=>inFlight.delete(source));inFlight.set(source,request);return request;}
export function clearLegacyKuromojiSceneCache(){cache.clear();}
export function getLegacyKuromojiSceneCacheSize(){return cache.size;}
