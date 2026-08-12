import { buildAtomicTextRanges } from './textRanges.js';
import { planMinimumContextScenes } from './minimumContextPlanner.js';
import { buildMarkupSlices, visibleTextFromInlineHtml } from './markupRanges.js';

function compare(a,b){return a.spineIndex-b.spineIndex||a.eventIndex-b.eventIndex;}
function contains(section,p){return Boolean(section?.start&&section?.end&&compare(p,section.start)>=0&&compare(p,section.end)<=0);}
function sectionFor(model,p){const matches=(model?.sections||[]).filter(s=>contains(s,p));return matches.find(s=>s.type==='navigation')||matches.find(s=>s.type==='cover')||matches.find(s=>s.type==='preliminary-illustrations')||matches.find(s=>s.type==='auxiliary-front-matter')||matches.find(s=>s.type==='untitled-reading-section')||matches.find(s=>s.type==='chapter')||matches[0]||null;}
function eventKey(href,index){return `${href}|${index}`;}
function groupKey(document,section){return `${document.documentHref}|${section.sectionIndex}`;}

function contextualSourceBlockKey(candidate){
 return String(
  candidate?.sourceBlockId||
  (
   candidate?.sourceDocumentHref!=null&&
   candidate?.sourceEventIndex!=null
    ? `${candidate.sourceDocumentHref}|${candidate.sourceEventIndex}`
    : ''
  )
 );
}

function combineContextualSceneMarkup(candidates){
 const source=Array.isArray(candidates)
  ? candidates.filter(Boolean)
  : [];

 let plainText='';
 let htmlText='';
 let previousBlockKey=null;
 let sourceBlockBoundaryCount=0;

 for(const candidate of source){
  const currentBlockKey=
   contextualSourceBlockKey(candidate);

  const crossesSourceBlock=Boolean(
   previousBlockKey&&
   currentBlockKey&&
   currentBlockKey!==previousBlockKey
  );

  if(crossesSourceBlock){
   plainText+='\n';
   htmlText+='<br>';
   sourceBlockBoundaryCount+=1;
  }

  plainText+=String(
   candidate?.plainText??''
  );

  htmlText+=String(
   candidate?.htmlText??
   candidate?.plainText??
   ''
  );

  if(currentBlockKey){
   previousBlockKey=currentBlockKey;
  }
 }

 return Object.freeze({
  plainText,
  htmlText,
  sourceSliceCount:source.length,
  sourceBlockBoundaryCount
 });
}

function normalizeHeadingText(value){
 return String(value||'')
  .normalize('NFKC')
  .replace(/[\\s\\u3000]+/g,'')
  .replace(/^[\\p{P}\\p{S}]+|[\\p{P}\\p{S}]+$/gu,'')
  .toLocaleLowerCase();
}

function firstSectionTextEvent(section,documents){
 for(const document of [...documents].sort(
  (left,right)=>left.spineIndex-right.spineIndex
 )){
  if(
   document.spineIndex<section.start.spineIndex||
   document.spineIndex>section.end.spineIndex
  ){
   continue;
  }

  for(const event of document.events||[]){
   const point={
    spineIndex:document.spineIndex,
    eventIndex:event.eventIndex
   };

   if(!contains(section,point))continue;

   if(
    event.type==='text-block'||
    event.type==='heading'
   ){
    return{
     documentHref:document.documentHref,
     eventIndex:event.eventIndex,
     plainText:event.plainText||''
    };
   }
  }
 }

 return null;
}

function consumedHeadingEventKeys(runtime,documents){
 const keys=new Set();
 const packageModel=runtime?.packageModel;
 const bookModel=runtime?.bookModel;

 for(const section of bookModel?.sections||[]){
  if(
   section.type!=='chapter'||
   section.includedInReading===false
  ){
   continue;
  }

  const title=
   packageModel?.navigation?.[
    section.navigationIndex
   ]?.title||'';

  const first=firstSectionTextEvent(
   section,
   documents
  );

  const normalizedTitle=
   normalizeHeadingText(title);

  if(
   first&&
   normalizedTitle&&
   normalizeHeadingText(first.plainText)===
    normalizedTitle
  ){
   keys.add(
    eventKey(
     first.documentHref,
     first.eventIndex
    )
   );
  }
 }

 return keys;
}

function candidatesFor(document,event,section){
 const key=eventKey(document.documentHref,event.eventIndex);
 const ranges=buildAtomicTextRanges(event.plainText||'',{sourceBlockId:key});
 const markup=buildMarkupSlices(event.htmlText||event.plainText||'',ranges);
 if(!markup.diagnostics.valid||markup.sourceVisibleText!==String(event.plainText||''))return null;
 return markup.slices.map((slice,index)=>({...slice,boundaryGroup:groupKey(document,section),sourceBlockId:key,sourceEventKey:key,sourceDocumentHref:document.documentHref,sourceSpineIndex:document.spineIndex,sourceEventIndex:event.eventIndex,sourceRangeIndex:index,sectionIndex:section.sectionIndex,sectionType:section.type,hasRuby:Boolean(event.hasRuby)}));
}

export function buildContextualSceneStream({runtime,minimumMeaningfulLength=8}={}){
 const documents=[...(runtime?.documents||[])].sort((a,b)=>a.spineIndex-b.spineIndex),bookModel=runtime?.bookModel;
 const headingEventKeys=
  consumedHeadingEventKeys(runtime,documents);
 const scenes=[],consumedEventKeys=new Set(),errors=[];let run=[],activeGroup=null;
 function flush(reason){
  if(!run.length){activeGroup=null;return;}
  const plan=planMinimumContextScenes(run,{minimumMeaningfulLength});
  if(!plan.diagnostics.valid){errors.push(`planner-invalid:${reason}`);run=[];activeGroup=null;return;}
  for(const planned of plan.scenes){
   const combined=combineContextualSceneMarkup(planned.sourceCandidates);
   const first=planned.sourceCandidates[0],last=planned.sourceCandidates.at(-1);
   const sourceCandidateText=
    planned.sourceCandidates
     .map(candidate=>String(candidate?.plainText??''))
     .join('');

   const sourceTextMatches=
    sourceCandidateText===planned.plainText;

   const formattedTextMatches=
    visibleTextFromInlineHtml(combined.htmlText)===
    combined.plainText;

   if(!sourceTextMatches||!formattedTextMatches){
    errors.push(
     `markup-mismatch:${first.sourceEventKey}`
    );
    continue;
   }
   const keys=[...new Set(planned.sourceCandidates.map(c=>c.sourceEventKey))];keys.forEach(key=>consumedEventKeys.add(key));
   scenes.push(Object.freeze({plainText:combined.plainText,htmlText:combined.htmlText,hasRuby:planned.sourceCandidates.some(c=>c.hasRuby),sectionIndex:first.sectionIndex,sectionType:first.sectionType,firstDocumentHref:first.sourceDocumentHref,firstSpineIndex:first.sourceSpineIndex,firstEventIndex:first.sourceEventIndex,lastDocumentHref:last.sourceDocumentHref,lastSpineIndex:last.sourceSpineIndex,lastEventIndex:last.sourceEventIndex,sourceEventKeys:Object.freeze(keys),sourceCandidateCount:planned.sourceCandidates.length,sourceBlockBoundaryCount:combined.sourceBlockBoundaryCount,meaningfulLength:planned.meaningfulLength,attachmentDirection:planned.attachmentDirection,attachmentCount:planned.attachmentCount,planningReason:planned.planningReason,boundaryAfter:reason}));
  }
  run=[];activeGroup=null;
 }
 for(const document of documents){
  flush('document-start');
  for(const event of document.events||[]){
   const p={spineIndex:document.spineIndex,eventIndex:event.eventIndex},section=sectionFor(bookModel,p);
   if(!section||section.includedInReading===false||section.type==='navigation'){flush('excluded-section');continue;}
   if(['image','thematic-break','heading'].includes(event.type)){flush(event.type);continue;}
   if(event.type==='soft-break')continue;
   if(event.type!=='text-block')continue;
   if(
    headingEventKeys.has(
     eventKey(
      document.documentHref,
      event.eventIndex
     )
    )
   ){
    flush('consumed-section-heading');
    continue;
   }
   const group=groupKey(document,section);if(activeGroup!==null&&activeGroup!==group)flush('section-change');activeGroup=group;
   const built=candidatesFor(document,event,section);if(!built){errors.push(`candidate-mismatch:${eventKey(document.documentHref,event.eventIndex)}`);flush('invalid-candidate');continue;}run.push(...built);
  }
  flush('document-end');
 }
 flush('end');
 const starts=new Map(scenes.map(scene=>[eventKey(scene.firstDocumentHref,scene.firstEventIndex),scene]));
 const sourceTextKeys=new Set(
  documents.flatMap(document=>
   (document.events||[])
    .filter(event=>{
     if(event.type!=='text-block'){
      return false;
     }

     const key=eventKey(
      document.documentHref,
      event.eventIndex
     );

     if(headingEventKeys.has(key)){
      return false;
     }

     const section=sectionFor(
      bookModel,
      {
       spineIndex:document.spineIndex,
       eventIndex:event.eventIndex
      }
     );

     return Boolean(
      section&&
      section.includedInReading!==false&&
      section.type!=='navigation'
     );
    })
    .map(event=>
     eventKey(
      document.documentHref,
      event.eventIndex
     )
    )
  )
 );
 const owned=[...consumedEventKeys].filter(key=>sourceTextKeys.has(key));
 return Object.freeze({
 schemaVersion:'14.5',
 valid:
  errors.length===0&&
  owned.length===sourceTextKeys.size,
 errors:Object.freeze(errors),
 scenes:Object.freeze(scenes),
 sceneByStart:starts,
 consumedEventKeys,
 consumedHeadingEventKeys:headingEventKeys,
 consumedHeadingEventCount:
  headingEventKeys.size,
 sourceTextEventCount:
  sourceTextKeys.size,
 ownedTextEventCount:
  owned.length
});
}
