import fs from 'node:fs';
const panel=fs.readFileSync(new URL('../src/components/TeachingDecisionPanel.jsx',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../src/lib/teachingDecisionClient.js',import.meta.url),'utf8');
for(const token of ['Decision history and management','Supersede with current review','Candidate:','Export: disabled','Partial selection'])if(!panel.includes(token))throw new Error(`missing ${token}`);
for(const token of ['/summary','/diagnosis','/supersede'])if(!client.includes(token))throw new Error(`missing ${token}`);
if(/^\s*(JS|JSX)\s*$/m.test(panel+client))throw new Error('standalone marker');
console.log('Alpha 6 review management checks passed.');
