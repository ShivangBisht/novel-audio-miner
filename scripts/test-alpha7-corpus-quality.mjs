import fs from 'node:fs';

function read(path) {
  if (!fs.existsSync(path)) {
    throw new Error(`Required source file is missing: ${path}`);
  }

  return fs.readFileSync(path, 'utf8');
}

function requireToken(source, token, description) {
  if (!source.includes(token)) {
    throw new Error(
      `Missing Alpha 7 contract: ${description} (${token})`,
    );
  }
}

function requireAny(source, tokens, description) {
  if (!tokens.some(token => source.includes(token))) {
    throw new Error(
      `Missing Alpha 7 capability: ${description}. ` +
      `Expected one of: ${tokens.join(', ')}`,
    );
  }
}

const qualityPanel = read(
  'src/components/TeachingCorpusQualityPanel.jsx',
);

const qualityClient = read(
  'src/lib/teachingQualityClient.js',
);

const exportPanel = read(
  'src/components/TeachingCorpusExportPanel.jsx',
);

const exportClient = read(
  'src/lib/teachingCorpusExportClient.js',
);

const advancedDashboard = read(
  'src/components/TeachingAdvancedDashboard.jsx',
);

const governancePanel = read(
  'src/components/TeachingCorpusGovernancePanel.jsx',
);

/*
 * Quality-state management.
 */

for (const state of [
  'captured',
  'needs-review',
  'reviewed',
  'approved',
  'rejected-for-corpus',
]) {
  requireToken(
    qualityPanel,
    state,
    `quality state ${state}`,
  );
}

requireToken(
  qualityPanel,
  'getCorpusQualitySummary',
  'quality summary loading',
);

requireToken(
  qualityPanel,
  'getRecordQuality',
  'record quality loading',
);

requireToken(
  qualityPanel,
  'setRecordQuality',
  'record quality updates',
);

/*
 * Quality API integration.
 */

requireAny(
  qualityClient,
  [
    '/teaching-quality',
    'getCorpusQualitySummary',
    'getRecordQuality',
    'setRecordQuality',
  ],
  'Teaching quality API integration',
);

/*
 * Duplicate, conflict, and eligibility reporting.
 */

requireToken(
  qualityPanel,
  'duplicateGroupCount',
  'duplicate-group reporting',
);

requireToken(
  qualityPanel,
  'conflictCount',
  'conflict reporting',
);

requireToken(
  qualityPanel,
  'exportEligibleCount',
  'corpus eligibility reporting',
);

/*
 * Explicit export safety in the quality screen.
 */

requireToken(
  qualityPanel,
  '<span>Export</span>',
  'quality-panel export status label',
);

requireToken(
  qualityPanel,
  '<strong>Disabled</strong>',
  'quality-panel disabled export status',
);

requireToken(
  qualityPanel,
  'Export remains disabled.',
  'quality-update export safety notice',
);

/*
 * Dry-run corpus export and activation safety.
 */

requireToken(
  exportPanel,
  'Corpus export dry run',
  'dry-run corpus-export mode',
);

requireToken(
  exportPanel,
  'This does not train, tune, or activate the analyzer.',
  'corpus-export safety explanation',
);

requireToken(
  exportPanel,
  'Export: disabled',
  'explicit disabled export status',
);

requireToken(
  exportPanel,
  'Export and activation remain disabled.',
  'validated corpus safety notice',
);

requireToken(
  exportPanel,
  'Generate dry-run package',
  'dry-run package generation',
);

requireToken(
  exportClient,
  '/teaching-corpus-export/preview',
  'corpus preview endpoint',
);

requireToken(
  exportClient,
  '/teaching-corpus-export/generate',
  'dry-run generation endpoint',
);

requireToken(
  exportClient,
  '/teaching-corpus-export/verify',
  'corpus verification endpoint',
);

/*
 * Advanced Teaching dashboard integration.
 */

requireToken(
  advancedDashboard,
  'Quality and corpus',
  'Quality and corpus category',
);

requireToken(
  advancedDashboard,
  'TeachingCorpusQualityPanel',
  'quality panel integration',
);

requireToken(
  advancedDashboard,
  'Corpus packages',
  'corpus packages category',
);

requireToken(
  advancedDashboard,
  'TeachingCorpusExportPanel',
  'dry-run export panel integration',
);

/*
 * Governance integration added after Alpha 7.
 */

requireAny(
  governancePanel,
  [
    'harnessValid',
    'Harness valid',
  ],
  'governance harness-valid reporting',
);

requireAny(
  governancePanel,
  [
    'trainFit',
    'Train fit',
  ],
  'governance train-fit reporting',
);

requireAny(
  governancePanel,
  [
    'leakage',
    'Leakage',
    'leakageFindings',
  ],
  'provenance leakage reporting',
);

console.log(
  'Alpha 7 corpus-quality compatibility checks passed.',
);
