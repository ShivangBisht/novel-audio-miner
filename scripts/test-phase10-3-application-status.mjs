import fs from 'node:fs';

const app = fs.readFileSync('src/App.jsx', 'utf8');
const indicator = fs.readFileSync('src/components/ApplicationStatusIndicator.jsx', 'utf8');
const panel = fs.readFileSync('src/components/ApplicationStatusPanel.jsx', 'utf8');
const client = fs.readFileSync('src/lib/applicationStartupClient.js', 'utf8');
const styles = fs.readFileSync('src/styles.css', 'utf8');

for (const [source, token] of [
  [app, 'ApplicationStatusIndicator'],
  [indicator, 'ApplicationStatusPanel'],
  [indicator, 'optional service'],
  [indicator, 'setInterval'],
  [panel, 'Japanese analyzer'],
  [panel, 'Dictionary'],
  [panel, 'KWJA'],
  [panel, 'VOICEVOX'],
  [panel, 'AnkiConnect'],
  [panel, 'Retry status check'],
  [panel, 'Technical details'],
  [client, '/api/jp-analyzer/startup/status'],
  [styles, 'PHASE10_3_APPLICATION_STATUS_BEGIN'],
]) {
  if (!source.includes(token)) throw new Error(`Missing Phase 10.3 contract: ${token}`);
}
if (client.includes('127.0.0.1:8766')) throw new Error('Startup client must use the Vite analyzer proxy.');
console.log('Phase 10.3 application status checks passed.');
