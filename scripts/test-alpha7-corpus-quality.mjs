import fs from 'node:fs';
const panel=fs.readFileSync(new URL('../src/components/TeachingCorpusQualityPanel.jsx',import.meta.url),'utf8');const client=fs.readFileSync(new URL('../src/lib/teachingQualityClient.js',import.meta.url),'utf8');
for(const token of ['Corpus quality review','approved','rejected-for-corpus','Duplicates:','Conflicts:','Export: disabled'])if(!panel.includes(token))throw new Error(`missing ${token}`);
for(const token of ['/teaching-quality/summary','qualityStatus'])if(!client.includes(token))throw new Error(`missing ${token}`);
console.log('Alpha 7 corpus quality checks passed.');
