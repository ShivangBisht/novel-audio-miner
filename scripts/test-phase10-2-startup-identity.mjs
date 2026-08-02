import fs from 'node:fs';
const path='public/japanese-novel-miner-identity.json';
if(!fs.existsSync(path))throw new Error('Missing startup identity document');
const value=JSON.parse(fs.readFileSync(path,'utf8'));
if(value.schema!=='JapaneseNovelMinerIdentity.v1'||value.application!=='JapaneseNovelMiner')throw new Error('Invalid startup identity document');
console.log('Phase 10.2 frontend identity checks passed.');
