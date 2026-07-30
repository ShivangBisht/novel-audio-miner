import assert from 'node:assert/strict';import fs from 'node:fs';
const panel=fs.readFileSync(new URL('../src/components/TeachingPanel.jsx',import.meta.url),'utf8');const reader=fs.readFileSync(new URL('../src/components/Reader.jsx',import.meta.url),'utf8');const client=fs.readFileSync(new URL('../src/lib/teachingCorrectionsClient.js',import.meta.url),'utf8');
for(const value of ['Preference','Confident','Needs review','Optional note','Sentence annotation history','Corrected learning and colour outcome','Other sentence ranges: unreviewed'])assert.match(panel,new RegExp(value));
for(const field of ['knownLookupKey','frequencyLookupKey','countsForComprehension','showInNewWords','eligibleForMining','colourSource'])assert.match(panel,new RegExp(field));
for(const field of ['bookId','bookTitle','chapterIndex','chapterTitle','sceneIndex','leftContext','rightContext'])assert.match(reader,new RegExp(field));
assert.match(client,/reader-corrections\/annotations/);assert.match(client,/reader-corrections\/integrity/);assert.match(panel,/annotationId/);assert.match(panel,/postCorrectionSnapshotId/);
console.log('Phase 8.6 frontend annotation workflow contract tests passed');
