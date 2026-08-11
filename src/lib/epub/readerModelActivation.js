import { buildQualifiedReaderModel, qualifyShadowRuntime } from './qualifiedReaderModel.js';
export const EPUB_READER_MODEL_MODES=Object.freeze({LEGACY:'legacy',SHADOW_COMPARE:'shadow-compare',QUALIFIED_SHADOW:'qualified-shadow'});
export function normalizeReaderModelMode(value){return Object.values(EPUB_READER_MODEL_MODES).includes(value)?value:EPUB_READER_MODEL_MODES.LEGACY;}
export async function activateReaderModel({mode='legacy',legacy,runtime,zip}={}){
 const requestedMode=normalizeReaderModelMode(mode),gate=qualifyShadowRuntime(runtime);
 const base={requestedMode,gate,legacy:{itemCount:legacy.flatItems.length,sentenceCount:legacy.flatItems.filter(x=>x.type==='sentence').length,imageCount:legacy.flatItems.filter(x=>x.type==='image').length,chapterCount:legacy.chapters.length}};
 if(requestedMode==='legacy')return{...legacy,activation:{...base,source:'legacy',activated:false}};
 if(!gate.valid)return{...legacy,activation:{...base,source:'legacy-fallback',activated:false,fallbackReason:gate.reason}};
 try{const qualified=await buildQualifiedReaderModel({runtime,zip});const comparison={...qualified.diagnostics};
  if(requestedMode==='shadow-compare')return{...legacy,activation:{...base,source:'legacy',activated:false,comparison}};
  return{...legacy,...qualified,activation:{...base,source:'qualified-shadow',activated:true,comparison}};
 }catch(error){return{...legacy,activation:{...base,source:'legacy-fallback',activated:false,fallbackReason:error?.code||'activation-exception',errorMessage:String(error?.message||error)}};}
}
