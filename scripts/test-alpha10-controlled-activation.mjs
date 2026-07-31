import fs from 'node:fs';
const panel=fs.readFileSync(new URL('../src/components/TeachingControlledActivationPanel.jsx',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../src/lib/teachingControlledActivationClient.js',import.meta.url),'utf8');
for(const token of ['Controlled activation','Shadow observation only','Check eligibility','Create shadow plan','Verify rollback plan','Live mutation: disabled','Automatic deployment: disabled','Rollback: required'])if(!panel.includes(token))throw new Error(`missing ${token}`);
for(const token of ['/teaching-controlled-activation/preview','/teaching-controlled-activation/plan','/teaching-controlled-activation/verify'])if(!client.includes(token))throw new Error(`missing ${token}`);
console.log('Alpha 10 controlled activation checks passed.');
