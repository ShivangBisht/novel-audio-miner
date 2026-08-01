import fs from 'node:fs';

const panel = fs.readFileSync('src/components/TeachingPanel.jsx', 'utf8');
const decision = fs.readFileSync('src/components/TeachingDecisionPanel.jsx', 'utf8');
const dashboard = fs.readFileSync('src/components/TeachingAdvancedDashboard.jsx', 'utf8');
const styles = fs.readFileSync('src/styles.css', 'utf8');

for (const text of [
  'Already reviewed',
  'Teaching evidence',
  'Quality state',
  'Occurrence correction',
  'Analyzer tuning',
  'Edit this occurrence',
  'Advanced tools',
]) {
  if (!panel.includes(text)) throw new Error(`Missing saved-occurrence contract: ${text}`);
}
if (!panel.includes('TeachingAdvancedDashboard')) {
  throw new Error('Universal Advanced tools dashboard is not integrated.');
}
if (!/existingRecordId\s*=\s*\{\s*editMode\s*\?\s*existingRecordId\s*:\s*null\s*\}/s.test(panel)) {
  throw new Error('Edited reviews are not connected to supersession.');
}
if (!decision.includes('supersedeTeachingDecision')) {
  throw new Error('Guided review cannot supersede existing Teaching evidence.');
}
for (const text of [
  'Review and history',
  'Quality and corpus',
  'Portability',
  'Corpus packages',
  'Offline evaluation',
  'Controlled activation',
  'Back to tools',
]) {
  if (!dashboard.includes(text)) throw new Error(`Missing Advanced dashboard category: ${text}`);
}
for (const cssClass of [
  'teaching-metadata-grid',
  'teaching-success-icon',
  'teaching-role-badge',
  'teaching-status-badge',
  'teaching-advanced-dashboard',
]) {
  if (!styles.includes(cssClass)) throw new Error(`Missing readability style: ${cssClass}`);
}
console.log('Post-Alpha C bounded closeout checks passed.');
