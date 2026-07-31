import fs from 'node:fs';
const panel=fs.readFileSync(new URL('../src/components/TeachingCorpusQualityPanel.jsx',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../src/lib/teachingQualityClient.js',import.meta.url),'utf8');
for(const token of [
  "persisted?.reviewer",
  "persisted?.quality_note",
  "current.reviewer",
  "current.quality_note",
  "Eligible for export:",
  "summary.exportEligibleCount"
]) if(!panel.includes(token)) throw new Error(`missing ${token}`);
if(client.includes('reviewer||null')||client.includes('qualityNote||null')) throw new Error('client still converts blanks to null');
console.log('Corpus quality input hydration checks passed.');
