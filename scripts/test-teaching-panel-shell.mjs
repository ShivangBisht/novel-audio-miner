import assert from 'node:assert/strict'; import fs from 'node:fs';
const reader=fs.readFileSync(new URL('../src/components/Reader.jsx',import.meta.url),'utf8');
const panel=fs.readFileSync(new URL('../src/components/TeachingPanel.jsx',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../src/lib/teachingCorrectionsClient.js',import.meta.url),'utf8');
assert.match(reader,/Teaching Mode:/); assert.match(reader,/resolveTeachingSelection/); assert.match(reader,/TeachingPanel/);
for(const label of ['Show as one unit','Split','Vocabulary','Grammar','Function','Name','Leave uncoloured','Preview']) assert.match(panel,new RegExp(label));
assert.doesNotMatch(panel,/>Save</); assert.match(client,/reader-corrections\/preview/); assert.match(client,/reader-corrections\/scope/);
console.log('teaching panel shell tests passed');
