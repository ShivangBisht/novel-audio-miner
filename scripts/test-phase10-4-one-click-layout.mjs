import fs from 'node:fs';
const app=fs.readFileSync('src/App.jsx','utf8');
const styles=fs.readFileSync('src/styles.css','utf8');
for(const [source,token] of [[app,'reader-status-slot'],[app,'startup-status-slot'],[app,'reader-active'],[styles,'PHASE10_4_READER_SAFE_STATUS_BEGIN'],[styles,'.reader-active .application-status'],[styles,'position: static'],[styles,'.reader-status-slot']]) if(!source.includes(token)) throw new Error(`Missing Phase 10.4 contract: ${token}`);
const block=styles.slice(styles.indexOf('PHASE10_4_READER_SAFE_STATUS_BEGIN'));
if(/\.reader-active\s+\.application-status\s*\{[^}]*position:\s*fixed/s.test(block)) throw new Error('Reader status must not use fixed positioning.');
console.log('Phase 10.4 one-click launcher and Reader-safe status checks passed.');
