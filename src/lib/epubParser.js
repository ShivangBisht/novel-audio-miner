import JSZip from 'jszip';
import { buildEpubRuntime } from './epub/epubRuntime.js';
import { buildEpubReaderModel } from './epub/readerModel.js';

async function readZipText(zip,path){
 const file=zip.file(path);
 if(!file)throw new Error(`Missing file: ${path}`);
 return file.async('text');
}
function parseXml(text){return new DOMParser().parseFromString(text,'application/xml');}
async function quickHash(input){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input));return[...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,'0')).join('').slice(0,16);}

export async function parseEpubFile(file){
 const zip=await JSZip.loadAsync(await file.arrayBuffer());
 const container=parseXml(await readZipText(zip,'META-INF/container.xml'));
 const opfPath=container.querySelector('rootfile')?.getAttribute('full-path');
 if(!opfPath)throw new Error('Could not find OPF package file.');
 const opf=parseXml(await readZipText(zip,opfPath));
 const{runtime,diagnostics}=await buildEpubRuntime({zip,opf,opfPath});
 const reader=await buildEpubReaderModel({runtime,zip});
 const metadata=runtime.packageModel.metadata||{};
 const id=await quickHash(`${file.name}:${file.size}:${file.lastModified}`);
 const toc=runtime.packageModel.navigation.map(entry=>({index:entry.index,title:entry.title,href:entry.target.documentHref,fragmentId:entry.target.fragmentId,depth:entry.depth,sourceType:entry.sourceType}));
 const qualification={source:'authoritative',valid:true,gate:reader.qualification||null,diagnostics:reader.diagnostics};
 return{
  id,fileName:file.name,title:metadata.title||file.name.replace(/\.epub$/i,''),author:metadata.creator||'',toc,
  chapters:reader.chapters,flatItems:reader.flatItems,chapterImageLists:reader.chapterImageLists,
  epubRuntimeDiagnostics:diagnostics,readerModelQualification:qualification,
  debug:{tocCount:toc.length,totalItems:reader.flatItems.length,sentenceCount:reader.diagnostics.sentenceCount,imageCount:reader.diagnostics.imageCount,chapterList:reader.chapters.map((chapter,index)=>({title:chapter.title,sentenceCount:chapter.sentences.length,imageCount:(reader.chapterImageLists[index]||[]).length,preview:(chapter.plainText||'').slice(0,80)})),authoritative:true,legacyParserExecuted:false,readerDiagnostics:reader.diagnostics}
 };
}
