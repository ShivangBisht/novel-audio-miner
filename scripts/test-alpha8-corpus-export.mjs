import fs from 'node:fs';
const panel=fs.readFileSync(new URL('../src/components/TeachingCorpusExportPanel.jsx',import.meta.url),'utf8');const client=fs.readFileSync(new URL('../src/lib/teachingCorpusExportClient.js',import.meta.url),'utf8');
for(const token of ['Corpus export dry run','Preview export','Validate corpus','Generate dry-run package','does not train, tune, or activate','Exclusion reasons','Export: disabled'])if(!panel.includes(token))throw new Error(`missing ${token}`);
for(const token of ['/teaching-corpus-export/preview','/generate','/verify'])if(!client.includes(token))throw new Error(`missing ${token}`);
console.log('Alpha 8 corpus export checks passed.');
