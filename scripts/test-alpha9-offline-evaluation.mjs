import fs from 'node:fs';
const panel=fs.readFileSync(new URL('../src/components/TeachingOfflineEvaluationPanel.jsx',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../src/lib/teachingOfflineEvaluationClient.js',import.meta.url),'utf8');
for(const token of ['Offline evaluation experiment','does not change the live analyzer','Preview baseline','Run offline evaluation','Verify report','Deployment: disabled'])if(!panel.includes(token))throw new Error(`missing ${token}`);
for(const token of ['/teaching-offline-evaluation/preview','/teaching-offline-evaluation/run','/teaching-offline-evaluation/verify'])if(!client.includes(token))throw new Error(`missing ${token}`);
console.log('Alpha 9 offline evaluation checks passed.');
