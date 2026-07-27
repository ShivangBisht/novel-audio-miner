import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { inspectDictionaryPackage } from '../src/lib/dictionaryPackageImport.js';
const zip = new JSZip();
zip.file('index.json', JSON.stringify({
  title:'JMdict [2025-11-01]', format:3, revision:'JMdict.2025-11-01',
  url:'https://github.com/themoeway/yomitan-import', isUpdatable:true,
  indexUrl:'https://github.com/yomidevs/jmdict-yomitan/releases/latest/download/JMdict_english_with_examples.json',
  downloadUrl:'https://github.com/yomidevs/jmdict-yomitan/releases/latest/download/JMdict_english_with_examples.zip',
}));
zip.file('term_bank_1.json', JSON.stringify([['辞書','じしょ','','','',0,['dictionary'],1,'']]));
const bytes=await zip.generateAsync({type:'uint8array'});
const result=await inspectDictionaryPackage({name:'jmdict.zip',arrayBuffer:async()=>bytes.buffer});
assert.equal(result.metadata.revision,'JMdict.2025-11-01');
assert.equal(result.metadata.sourceUrl,'https://github.com/themoeway/yomitan-import');
assert.equal(result.metadata.updateManifestUrl,'https://github.com/yomidevs/jmdict-yomitan/releases/latest/download/JMdict_english_with_examples.json');
assert.equal(result.metadata.downloadUrl,'https://github.com/yomidevs/jmdict-yomitan/releases/latest/download/JMdict_english_with_examples.zip');
assert.equal(result.metadata.isUpdatable,true);
console.log('JMdict update metadata tests passed');
