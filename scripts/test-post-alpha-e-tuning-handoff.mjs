import fs from 'node:fs';
const dashboard=fs.readFileSync('src/components/TeachingAdvancedDashboard.jsx','utf8');
const panel=fs.readFileSync('src/components/TeachingTuningHandoffPanel.jsx','utf8');
const client=fs.readFileSync('src/lib/teachingTuningHandoffClient.js','utf8');
for(const t of ['Tuning handoff','TeachingTuningHandoffPanel'])if(!dashboard.includes(t))throw new Error('Missing dashboard integration: '+t);
for(const t of ['No training, candidate derivation, activation, or deployment','Train fit','Candidate derivation','Verify tuning input contract'])if(!panel.includes(t))throw new Error('Missing handoff UI contract: '+t);
for(const t of ['/preview','/verify'])if(!client.includes(t))throw new Error('Missing handoff API client: '+t);
console.log('Post-Alpha E tuning handoff checks passed.');
