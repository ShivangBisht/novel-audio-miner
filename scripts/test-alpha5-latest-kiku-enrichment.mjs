import assert from 'node:assert/strict';
import fs from 'node:fs';
import { comparePinnedTarget, readPinnedNoteExpression, runLatestKikuEnrichment } from '../src/lib/latestKikuEnrichment.js';
assert.equal(readPinnedNoteExpression({fields:{Expression:{value:' 走る '}}}),'走る');
assert.equal(comparePinnedTarget('走る','走る').status,'match');
assert.equal(comparePinnedTarget('走る','歩く').status,'mismatch');
assert.equal(comparePinnedTarget('走る','').status,'unavailable');
let findCount=0;
const updates=[];
const events=[];
const requests=[];
const note={noteId:100,fields:{Expression:{value:'走る'},Reading:{value:'はしる'},Definition:{value:'Yomitan definition'},ExpressionAudio:{value:'[sound:yomitan.mp3]'}}};
const result=await runLatestKikuEnrichment({
 lookupIdentity:'走る',readerInteraction:{spanStart:1,spanEnd:3},sceneIdentity:'b:1',chapterIdentity:2,noteType:'Kiku',novelSentence:'私は走った。',bookTitle:'Book',chapterTitle:'Chapter',
 fields:{sentence:'Sentence',sentenceFurigana:'SentenceFurigana',miscInfo:'MiscInfo',selectionText:'SelectionText',sentenceAudio:'SentenceAudio',picture:'Picture'},
 onEvent:event=>events.push(event)
},{
 now:()=>new Date('2026-08-18T08:00:00Z'),
 checkAnkiConnect:async()=>({ok:true}),
 findLatestNote:async()=>{findCount++;return {query:'note:"Kiku" added:1',ids:[100],note};},
 autoEnrichWordWithFallback:async()=>({sentence:'例文',sentenceFurigana:'例文',source:'Test',method:'nadeshiko',mode:'i+1',audioUrl:'',imageUrl:''}),
 updateNoteFields:async(id,fields)=>{updates.push({id,fields});for(const [name,value] of Object.entries(fields))note.fields[name]={value};},
 ankiRequest:async(action,params)=>{requests.push({action,params});if(action==='notesInfo')return [note];return null;},
 generateVoicevoxAudio:async()=>{throw new Error('unused');}
});
assert.equal(findCount,1);
assert.equal(result.pinnedTarget.noteId,100);
assert.equal(result.comparison.status,'match');
assert.equal(result.outcome,'complete');
assert.equal(result.verification.Sentence,true);
assert.equal(result.protectedFieldVerification.unchanged,true);
assert.deepEqual(result.protectedFieldVerification.changedFields,[]);
assert.equal(note.fields.Reading.value,'はしる');
assert.equal(note.fields.Definition.value,'Yomitan definition');
assert.equal(note.fields.ExpressionAudio.value,'[sound:yomitan.mp3]');
assert.equal(updates[0].id,100);
assert.equal(requests.at(-1).params.query,'nid:100');
assert.ok(events.some(event=>event.stage==='targetPinned'));
assert.ok(events.some(event=>event.stage==='verifyNoteFields'));
let mismatchUpdate=null;
const mismatchNote={noteId:7,fields:{Expression:{value:'歩く'}}};
const mismatch=await runLatestKikuEnrichment({
 lookupIdentity:'走る',noteType:'Kiku',novelSentence:'文',bookTitle:'',chapterTitle:'',
 fields:{sentence:'S',sentenceFurigana:'SF',miscInfo:'M',selectionText:'T',sentenceAudio:'A',picture:'P'}
},{
 checkAnkiConnect:async()=>({ok:true}),
 findLatestNote:async()=>({query:'note:"Kiku" added:1',ids:[7],note:mismatchNote}),
 autoEnrichWordWithFallback:async()=>({sentence:'文',sentenceFurigana:'文',source:'VOICEVOX',method:'voicevox',audioUrl:'',imageUrl:'',fallbackReason:'test fallback'}),
 generateVoicevoxAudio:async()=>({filename:'v.wav',audioBase64:'x'}),
 ankiRequest:async(action,params)=>{if(action==='storeMediaFile')return params.filename;if(action==='notesInfo')return [mismatchNote];return null;},
 updateNoteFields:async(id,fields)=>{mismatchUpdate=id;for(const [name,value] of Object.entries(fields))mismatchNote.fields[name]={value};}
});
assert.equal(mismatch.comparison.status,'mismatch');
assert.equal(mismatchUpdate,7);
assert.equal(mismatch.outcome,'partial');
assert.equal(mismatch.verification.S,true);
assert.equal(mismatch.verification.A,true);
assert.equal(mismatch.verification.T,true);
const reader=fs.readFileSync('src/components/Reader.jsx','utf8');
assert.ok(reader.includes('runLatestKikuEnrichment'));
assert.equal(reader.includes('const noteResult = await findLatestNote(noteType);'),false);
assert.ok(reader.includes('enrichmentOperation'));
console.log('Alpha 5 latest-Kiku-note enrichment tests passed');
