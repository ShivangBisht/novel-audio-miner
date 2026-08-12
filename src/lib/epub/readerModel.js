import { splitJapaneseSentences } from '../japaneseSentenceSplitter.js';
import { buildContextualSceneDiagnostics } from '../scenePlanning/contextualDiagnostics.js';
import { buildContextualSceneStream } from '../scenePlanning/contextualScenes.js';
function compare(a,b){return a.spineIndex-b.spineIndex||a.eventIndex-b.eventIndex;}
function contains(section,p){return section?.start&&section?.end&&compare(p,section.start)>=0&&compare(p,section.end)<=0;}
function sectionFor(model,p){const matches=(model?.sections||[]).filter(s=>contains(s,p));return matches.find(s=>s.type==='navigation')||matches.find(s=>s.type==='cover')||matches.find(s=>s.type==='preliminary-illustrations')||matches.find(s=>s.type==='auxiliary-front-matter')||matches.find(s=>s.type==='untitled-reading-section')||matches.find(s=>s.type==='chapter')||matches[0]||null;}
function escapeHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
function sentenceItems(event){const split=splitJapaneseSentences(event.plainText||'');if(event.hasRuby&&event.htmlText)return[{plainText:event.plainText,htmlText:event.htmlText,hasRuby:true,preservedAsSingleRubyEvent:split.length>1}];return split.map(plainText=>({plainText,htmlText:escapeHtml(plainText),hasRuby:false,preservedAsSingleRubyEvent:false}));}
function roleKey(o){return `${o.documentHref}|${o.eventIndex}`;}
async function imageDataUri(zip,href){const file=zip.file(href);if(!file)return null;return URL.createObjectURL(await file.async('blob'));}
function normalizeHeadingText(value){return String(value||'').normalize('NFKC').replace(/[\s\u3000]+/g,'').replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu,'').toLocaleLowerCase();}
const DISPLAY_LABELS={
  'book-cover':'Book cover',
  illustrations:'Illustrations',
  'front-matter':'Front matter',
  introduction:'Introduction'
};
function displaySections(packageModel,bookModel){const result=[],groupIndex=new Map();for(const section of(bookModel.sections||[]).filter(s=>s.includedInReading!==false&&s.type!=='navigation')){if(section.type==='chapter'){const index=result.length;result.push({id:`chapter-${index}`,index,title:packageModel.navigation?.[section.navigationIndex]?.title||`Section ${index+1}`,titleSource:'package-navigation',sectionRole:'named-section',sectionIndices:[section.sectionIndex],navigationIndex:section.navigationIndex,href:section.start.documentHref||'',sourceHrefs:[],plainText:'',sentences:[]});continue;}const key=section.displayGroup||section.type;if(!groupIndex.has(key)){const index=result.length;groupIndex.set(key,index);result.push({id:key,index,title:DISPLAY_LABELS[key]||'Untitled section',titleSource:'localized-structural-role',sectionRole:key,sectionIndices:[],sourceHrefs:[],plainText:'',sentences:[]});}result[groupIndex.get(key)].sectionIndices.push(section.sectionIndex);}return result;}
function firstSectionTextEvent(section,documents){for(const document of[...documents].sort((a,b)=>a.spineIndex-b.spineIndex)){if(document.spineIndex<section.start.spineIndex||document.spineIndex>section.end.spineIndex)continue;for(const event of document.events||[]){const p={spineIndex:document.spineIndex,eventIndex:event.eventIndex};if(!contains(section,p))continue;if(event.type==='text-block'||event.type==='heading')return{documentHref:document.documentHref,eventIndex:event.eventIndex};}}return null;}
export function qualifyEpubRuntime(runtime){
 if(!runtime){
  return{
   valid:false,
   reason:'epub-runtime-missing'
  };
 }

 const {
  diagnostics,
  bookModel,
  imageModel,
  documents
 }=runtime;

 if(!bookModel){
  return{
   valid:false,
   reason:'missing-book-model'
  };
 }

 if(!imageModel){
  return{
   valid:false,
   reason:'missing-image-model'
  };
 }

 const reconstructionDocuments=
  diagnostics?.documents||[];

 const unsafeReconstructionFailures=
  reconstructionDocuments.filter(document=>{
   const ownershipUnsafe=
    Number(document.unownedTextNodeCount||0)>0||
    Number(document.duplicateTextNodeCount||0)>0;

   const contentUnsafe=
    document.reconstructionQualification==='failed'||
    (
     document.reconstructed===false&&
     document.compactEquivalent!==true
    );

   return ownershipUnsafe||contentUnsafe;
  });

 if(unsafeReconstructionFailures.length>0){
  const failures=
   unsafeReconstructionFailures.map(document=>({
    documentHref:document.documentHref,
    spineIndex:document.spineIndex,
    reconstructionQualification:
     document.reconstructionQualification||'failed',
    expectedLength:document.expectedLength,
    extractedLength:document.extractedLength,
    compactExpectedLength:
     document.compactExpectedLength??null,
    compactExtractedLength:
     document.compactExtractedLength??null,
    lengthDelta:document.lengthDelta,
    textNodeCount:document.textNodeCount,
    ownedTextNodeCount:document.ownedTextNodeCount,
    unownedTextNodeCount:
     document.unownedTextNodeCount,
    duplicateTextNodeCount:
     document.duplicateTextNodeCount
   }));

  return{
   valid:false,
   reason:'reconstruction-failure',
   details:{
    failureCount:failures.length,
    failures
   }
  };
 }

 const normalizedEquivalentDocuments=
  reconstructionDocuments
   .filter(document=>
    document.reconstructionQualification===
    'normalized-equivalent'
   )
   .map(document=>({
    documentHref:document.documentHref,
    spineIndex:document.spineIndex,
    expectedLength:document.expectedLength,
    extractedLength:document.extractedLength,
    lengthDelta:document.lengthDelta
   }));

 for(const document of diagnostics?.documents||[]){
  if(Number(document.unownedTextNodeCount||0)>0){
   return{
    valid:false,
    reason:'text-ownership-failure'
   };
  }

  if(Number(document.duplicateTextNodeCount||0)>0){
   return{
    valid:false,
    reason:'duplicate-text-failure'
   };
  }
 }

 for(const section of bookModel.sections||[]){
  if(
   !section.start||
   !section.end||
   compare(section.start,section.end)>0
  ){
   return{
    valid:false,
    reason:'invalid-section-range'
   };
  }
 }

 const readable=(bookModel.sections||[])
  .filter(section=>
   section.includedInReading!==false&&
   section.type!=='navigation'
  );

 const overlaps=(left,right)=>
  compare(left.start,right.end)<=0&&
  compare(right.start,left.end)<=0;

 const safeCoverOverlay=(left,right)=>{
  const cover=
   left.type==='cover'
    ? left
    : right.type==='cover'
      ? right
      : null;

  const owner=
   cover===left
    ? right
    : cover===right
      ? left
      : null;

  if(!cover||!owner){
   return false;
  }

  return(
   compare(cover.start,cover.end)===0&&
   contains(owner,cover.start)
  );
 };

 for(let i=0;i<readable.length;i++){
  for(let j=i+1;j<readable.length;j++){
   if(
    overlaps(readable[i],readable[j])&&
    !safeCoverOverlay(readable[i],readable[j])
   ){
    return{
     valid:false,
     reason:'overlapping-readable-sections',
     details:{
      leftSectionIndex:readable[i].sectionIndex,
      leftSectionType:readable[i].type,
      rightSectionIndex:readable[j].sectionIndex,
      rightSectionType:readable[j].type
     }
    };
   }
  }
 }

 let previous=null;

 for(const document of documents||[]){
  for(const event of document.events||[]){
   const current={
    spineIndex:document.spineIndex,
    eventIndex:event.eventIndex
   };

   if(previous&&compare(previous,current)>=0){
    return{
     valid:false,
     reason:'invalid-event-order'
    };
   }

   previous=current;
  }
 }

 return{
  valid:true,
  reason:null,
  qualification:
   normalizedEquivalentDocuments.length>0
    ? 'normalized-equivalent'
    : 'exact',
  warnings:
   normalizedEquivalentDocuments.length>0
    ? [{
       code:
        'normalized-reconstruction-equivalence',
       documentCount:
        normalizedEquivalentDocuments.length,
       documents:
        normalizedEquivalentDocuments
      }]
    : []
 };
}

export async function buildEpubReaderModel({runtime,zip}={}){const contextualScenePlanning=buildContextualSceneDiagnostics({runtime});const contextualStream=buildContextualSceneStream({runtime});const contextualActivated=contextualStream.valid;const gate=qualifyEpubRuntime(runtime);if(!gate.valid){
  const details=gate.details
    ? `: ${JSON.stringify(gate.details)}`
    : '';
  throw Object.assign(
    new Error(`${gate.reason}${details}`),
    {
      code:gate.reason,
      details:gate.details||null
    }
  );
}const{packageModel,bookModel,imageModel,documents}=runtime;const chapters=displaySections(packageModel,bookModel);const displayIndexBySection=new Map();for(const chapter of chapters)for(const sectionIndex of chapter.sectionIndices||[])displayIndexBySection.set(sectionIndex,chapter.index);const occurrences=new Map((imageModel.occurrences||[]).map(o=>[roleKey(o),o]));const headingEvents=new Map();for(const section of(bookModel.sections||[]).filter(s=>s.type==='chapter'&&s.includedInReading!==false)){const title=packageModel.navigation?.[section.navigationIndex]?.title||'';const first=firstSectionTextEvent(section,documents);if(first)headingEvents.set(`${first.documentHref}|${first.eventIndex}`,{section,title});}const items=[],consumedHeadings=[];let suppressedOrnamentCount=0,suppressedPublisherMarkCount=0,excludedNavigationCount=0;for(const document of[...documents].sort((a,b)=>a.spineIndex-b.spineIndex))for(const event of document.events||[]){const p={spineIndex:document.spineIndex,eventIndex:event.eventIndex},section=sectionFor(bookModel,p);if(!section||section.includedInReading===false||section.type==='navigation'){if(section?.type==='navigation')excludedNavigationCount++;continue;}const chapterIndex=displayIndexBySection.get(section.sectionIndex);if(!Number.isInteger(chapterIndex))continue;const chapter=chapters[chapterIndex],chapterTitle=chapter.title;if(!chapter.sourceHrefs.includes(document.documentHref))chapter.sourceHrefs.push(document.documentHref);if(event.type==='image'){const occurrence=occurrences.get(`${document.documentHref}|${event.eventIndex}`);if(occurrence?.candidateRole==='ornament'&&['medium','high'].includes(occurrence.confidence)){suppressedOrnamentCount++;continue;}if(occurrence?.candidateRole==='publisher-mark'&&['medium','high'].includes(occurrence.confidence)){suppressedPublisherMarkCount++;continue;}const dataUri=await imageDataUri(zip,event.imageHref);if(!dataUri)continue;items.push({type:'image',dataUri,alt:event.alt||'',chapterIndex,chapterTitle,parserDebug:{itemType:'image',pageHref:document.documentHref,pageIndex:document.spineIndex,orderedIndex:event.eventIndex,resolvedZipPath:event.imageHref,hasDataUri:true,readerModelSource:'authoritative',imageRole:occurrence?.candidateRole||'unknown'}});continue;}if(event.type!=='text-block'&&event.type!=='heading')continue;if(contextualActivated&&event.type==='text-block'){const contextual=contextualStream.sceneByStart.get(`${document.documentHref}|${event.eventIndex}`);if(contextual){const item={type:'sentence',plainText:contextual.plainText,htmlText:contextual.htmlText,chapterIndex,chapterTitle,parserDebug:{itemType:'sentence',pageHref:contextual.firstDocumentHref,pageIndex:contextual.firstSpineIndex,orderedIndex:contextual.firstEventIndex,lastPageHref:contextual.lastDocumentHref,lastPageIndex:contextual.lastSpineIndex,lastOrderedIndex:contextual.lastEventIndex,plainTextLength:contextual.plainText.length,htmlTextLength:contextual.htmlText.length,hasRuby:contextual.hasRuby,preservedAsSingleRubyEvent:false,readerModelSource:'contextual-authoritative',scenePlanning:{sourceCandidateCount:contextual.sourceCandidateCount,sourceEventCount:contextual.sourceEventKeys.length,sourceBlockBoundaryCount:contextual.sourceBlockBoundaryCount||0,meaningfulLength:contextual.meaningfulLength,attachmentDirection:contextual.attachmentDirection,attachmentCount:contextual.attachmentCount,planningReason:contextual.planningReason,boundaryAfter:contextual.boundaryAfter}}};items.push(item);chapter.sentences.push(item);chapter.plainText+=(chapter.plainText?'\n':'')+contextual.plainText;}continue;}const heading=headingEvents.get(`${document.documentHref}|${event.eventIndex}`);if(heading&&normalizeHeadingText(event.plainText)===normalizeHeadingText(heading.title)&&normalizeHeadingText(heading.title)){consumedHeadings.push({documentHref:document.documentHref,eventIndex:event.eventIndex,navigationIndex:heading.section.navigationIndex,action:'consume-as-section-heading',normalizedMatch:true});continue;}for(const sentence of sentenceItems(event)){const{plainText,htmlText,hasRuby,preservedAsSingleRubyEvent}=sentence,item={type:'sentence',plainText,htmlText,chapterIndex,chapterTitle,parserDebug:{itemType:'sentence',pageHref:document.documentHref,pageIndex:document.spineIndex,orderedIndex:event.eventIndex,plainTextLength:plainText.length,htmlTextLength:htmlText.length,hasRuby,preservedAsSingleRubyEvent,readerModelSource:'authoritative'}};items.push(item);chapter.sentences.push(item);chapter.plainText+=(chapter.plainText?'\n':'')+plainText;}}const chapterImageLists={};chapters.forEach((_,i)=>chapterImageLists[i]=[]);items.forEach((item,sceneIndex)=>{item.sceneIndex=sceneIndex;item.parserDebug.sceneIndex=sceneIndex;if(item.type==='image')chapterImageLists[item.chapterIndex].push(item);});return{flatItems:items,chapters,chapterImageLists,qualification:gate,diagnostics:{source:'authoritative',contextualScenePlanning,contextualActivation:{schemaVersion:'14.5',activated:contextualActivated,fallbackReason:contextualActivated?null:'contextual-stream-qualification-failed',errors:contextualStream.errors,sourceTextEventCount:contextualStream.sourceTextEventCount,ownedTextEventCount:contextualStream.ownedTextEventCount,contextualSceneCount:contextualStream.scenes.length},itemCount:items.length,sentenceCount:items.filter(x=>x.type==='sentence').length,imageCount:items.filter(x=>x.type==='image').length,suppressedOrnamentCount,suppressedPublisherMarkCount,excludedNavigationCount,chapterCount:chapters.length,sidebarSectionCount:chapters.length,sidebarRoles:chapters.map(x=>x.sectionRole),sidebarImageCount:Object.values(chapterImageLists).reduce((n,x)=>n+x.length,0),unassignedVisibleItemCount:items.filter(x=>!Number.isInteger(x.chapterIndex)||x.chapterIndex<0).length,rubySentenceCount:items.filter(x=>x.type==='sentence'&&x.parserDebug?.hasRuby).length,preservedRubyEventCount:items.filter(x=>x.type==='sentence'&&x.parserDebug?.preservedAsSingleRubyEvent).length,consumedHeadingCount:
 contextualActivated
  ? contextualStream.consumedHeadingEventCount
  : consumedHeadings.length,
consumedHeadings:
 contextualActivated
  ? [...contextualStream.consumedHeadingEventKeys].map(
     key=>({
      eventKey:key,
      action:'consume-as-section-heading',
      normalizedMatch:true,
      source:'contextual-authoritative'
     })
    )
  : consumedHeadings}};}
