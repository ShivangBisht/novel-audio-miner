import fs from 'node:fs';
const panel = fs.readFileSync(new URL('../src/components/TeachingDecisionPanel.jsx', import.meta.url), 'utf8');
const client = fs.readFileSync(new URL('../src/lib/teachingDecisionClient.js', import.meta.url), 'utf8');
const host = fs.readFileSync(new URL('../src/components/TeachingPanel.jsx', import.meta.url), 'utf8');
for (const token of ['accepted-current','corrected','rejected','Save review decision','exportStatus']) if (!panel.includes(token)) throw new Error(`missing ${token}`);
for (const token of ['/teaching-decisions/snapshot','/teaching-decisions']) if (!client.includes(token)) throw new Error(`missing ${token}`);
if (!host.includes('<TeachingDecisionPanel')) throw new Error('decision panel not rendered');
if (/^\s*(JS|JSX)\s*$/m.test(panel+client+host)) throw new Error('standalone heredoc marker found');
console.log('Alpha 5 Teaching decision workflow checks passed.');
