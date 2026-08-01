import fs from 'node:fs';

function read(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`Required source file is missing: ${path}`);
  }
  return fs.readFileSync(path, 'utf8');
}

function requireToken(source, token, description) {
  if (!source.includes(token)) {
    throw new Error(`Missing portability contract: ${description}`);
  }
}

const dashboard = read('src/components/TeachingAdvancedDashboard.jsx');
const panel = read('src/components/TeachingPortabilityPanel.jsx');
const client = read('src/lib/teachingPortabilityClient.js');
const quality = read('src/components/TeachingCorpusQualityPanel.jsx');

requireToken(dashboard, 'TeachingPortabilityPanel', 'dashboard import');
requireToken(dashboard, "'Portability'", 'Portability category');
requireToken(dashboard, "tool === 'portability'", 'conditional dashboard mount');
requireToken(panel, 'exportTeachingEvidence', 'evidence export');
requireToken(panel, 'verifyTeachingEvidence', 'package verification');
requireToken(panel, 'previewTeachingImport', 'read-only import preview');
requireToken(panel, 'applyTeachingImport', 'verified import');
requireToken(panel, 'canApply', 'apply safety gate');
requireToken(client, '/teaching-portability/export', 'export route');
requireToken(client, '/teaching-portability/verify', 'verify route');
requireToken(client, '/teaching-portability/import/preview', 'preview route');
requireToken(client, '/teaching-portability/import/apply', 'apply route');
requireToken(client, 'response.text()', 'raw JSON transport');
requireToken(panel, 'packageDigest', 'package digest confirmation');
requireToken(panel, 'Conflicts', 'conflict reporting');
requireToken(panel, 'Already present', 'idempotency reporting');

if (quality.includes('TeachingPortabilityPanel')) {
  throw new Error('Portability is incorrectly nested in the quality panel.');
}

console.log('Post-Alpha A portability compatibility checks passed.');
