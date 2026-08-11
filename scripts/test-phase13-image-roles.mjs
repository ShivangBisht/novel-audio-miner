import assert from 'node:assert/strict';
import { buildEpubImageRoleModel } from '../src/lib/epub/imageRoleModel.js';
const sections=[
{sectionIndex:0,type:'cover',start:{spineIndex:0,eventIndex:0},end:{spineIndex:0,eventIndex:0}},
{sectionIndex:1,type:'preliminary-illustrations',start:{spineIndex:1,eventIndex:0},end:{spineIndex:1,eventIndex:0}},
{sectionIndex:2,type:'navigation',includedInReading:false,start:{spineIndex:2,eventIndex:0},end:{spineIndex:2,eventIndex:0}},
{sectionIndex:3,type:'chapter',navigationIndex:0,start:{spineIndex:3,eventIndex:0},end:{spineIndex:6,eventIndex:30}},
{sectionIndex:4,type:'chapter',navigationIndex:1,start:{spineIndex:7,eventIndex:0},end:{spineIndex:7,eventIndex:2}},
{sectionIndex:5,type:'chapter',navigationIndex:2,start:{spineIndex:8,eventIndex:0},end:{spineIndex:8,eventIndex:2}},
{sectionIndex:6,type:'auxiliary-front-matter',start:{spineIndex:9,eventIndex:0},end:{spineIndex:9,eventIndex:2}},
{sectionIndex:7,type:'back-matter',start:{spineIndex:10,eventIndex:0},end:{spineIndex:12,eventIndex:2}}];
const bookModel={cover:{chosen:{documentHref:'cover.xhtml',eventIndex:0}},sections};
const between=(href,spine,image)=>({documentHref:href,spineIndex:spine,events:[{type:'text-block',eventIndex:0},{type:'image',eventIndex:1,imageHref:image,alt:'scene divider'},{type:'text-block',eventIndex:2}]});
const terminal=(href,spine)=>({documentHref:href,spineIndex:spine,events:[{type:'text-block',eventIndex:0},{type:'image',eventIndex:1,imageHref:'publisher.png',alt:'publisher'}]});
const denseEvents=[];for(let i=0;i<24;i++){denseEvents.push({type:'text-block',eventIndex:i*2});if(i===5)denseEvents.push({type:'image',eventIndex:11,imageHref:'unique-separator.jpg',alt:'divider'});if(i===10)denseEvents.push({type:'image',eventIndex:21,imageHref:'normal-inline.jpg',alt:''});if(i===15)denseEvents.push({type:'image',eventIndex:31,imageHref:'short-alt-inline.jpg',alt:'art'});}denseEvents.sort((a,b)=>a.eventIndex-b.eventIndex);
const documents=[
{documentHref:'cover.xhtml',spineIndex:0,events:[{type:'image',eventIndex:0,imageHref:'cover.jpg'}]},
{documentHref:'front.xhtml',spineIndex:1,events:[{type:'image',eventIndex:0,imageHref:'front.jpg'}]},
{documentHref:'toc.xhtml',spineIndex:2,events:[{type:'image',eventIndex:0,imageHref:'nav.png'}]},
{documentHref:'title.xhtml',spineIndex:3,events:[{type:'image',eventIndex:0,imageHref:'title.png'}]},
{documentHref:'prose.xhtml',spineIndex:4,events:[{type:'text-block',eventIndex:0},{type:'image',eventIndex:1,imageHref:'inline.jpg'},{type:'text-block',eventIndex:2}]},
{documentHref:'dense.xhtml',spineIndex:5,events:denseEvents},
between('sep1.xhtml',6,'separator.png'),between('sep2.xhtml',7,'separator.png'),between('sep3.xhtml',8,'separator.png'),
{documentHref:'chapter2.xhtml',spineIndex:7,events:[{type:'image',eventIndex:0,imageHref:'opening.jpg'},{type:'text-block',eventIndex:1},{type:'image',eventIndex:2,imageHref:'repeat-twice.png'}]},
{documentHref:'chapter3.xhtml',spineIndex:8,events:[{type:'text-block',eventIndex:0},{type:'image',eventIndex:1,imageHref:'repeat-twice.png'},{type:'text-block',eventIndex:2}]},
{documentHref:'credits.xhtml',spineIndex:9,events:[{type:'text-block',eventIndex:0},{type:'text-block',eventIndex:1},{type:'image',eventIndex:2,imageHref:'tm.gif',alt:''}]},
terminal('back1.xhtml',10),terminal('back2.xhtml',11),terminal('back3.xhtml',12)];
const model=buildEpubImageRoleModel({packageModel:{},documents,bookModel});
const occurrences=href=>model.occurrences.filter(x=>x.resourceHref===href);const role=href=>occurrences(href)[0].candidateRole;
assert.equal(role('cover.jpg'),'cover');assert.equal(role('front.jpg'),'front-matter-illustration');assert.equal(role('nav.png'),'navigation-image');assert.equal(role('title.png'),'chapter-title-artwork');assert.equal(role('inline.jpg'),'inline-illustration');assert.equal(role('opening.jpg'),'chapter-opening-illustration');
assert.equal(role('separator.png'),'ornament');assert.equal(occurrences('separator.png')[0].confidence,'medium');assert.equal(occurrences('separator.png')[0].resourceOccurrenceCount,3);assert.equal(occurrences('separator.png')[0].resourceDocumentCount,3);assert.equal(occurrences('separator.png')[0].resourceChapterCount,3);assert.equal(occurrences('separator.png')[0].resourceBetweenTextRatio,1);
assert.equal(role('unique-separator.jpg'),'ornament');assert.ok(occurrences('unique-separator.jpg')[0].evidence.includes('unique-between-substantive-text'));
assert.equal(role('normal-inline.jpg'),'inline-illustration');assert.equal(role('short-alt-inline.jpg'),'ornament');
assert.notEqual(role('repeat-twice.png'),'ornament');assert.equal(role('tm.gif'),'publisher-mark');assert.equal(occurrences('tm.gif')[0].sectionType,'auxiliary-front-matter');assert.equal(role('publisher.png'),'publisher-mark');
assert.equal(model.resources.find(x=>x.resourceHref==='unique-separator.jpg').candidateRole,'ornament');assert.equal(model.resources.find(x=>x.resourceHref==='tm.gif').candidateRole,'publisher-mark');assert.equal(JSON.stringify(model).includes('plainText'),false);assert.equal(JSON.stringify(model).includes('scene divider'),false);
console.log('Phase 13.6A image-role closeout tests passed');
