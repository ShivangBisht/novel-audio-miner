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
      `Missing Teaching decision contract: ${description} (${token})`,
    );
  }
}

const decisionPanel = read(
  'src/components/TeachingDecisionPanel.jsx',
);

const teachingPanel = read(
  'src/components/TeachingPanel.jsx',
);

const decisionClient = read(
  'src/lib/teachingDecisionClient.js',
);

const guidedClient = read(
  'src/lib/teachingGuidedReviewClient.js',
);

/*
 * Supported review outcomes.
 */

for (const outcome of [
  'accepted-current',
  'corrected',
  'unclassified',
]) {
  requireToken(
    decisionPanel,
    outcome,
    `review outcome ${outcome}`,
  );
}

/*
 * Guided review and automatic diagnosis.
 */

requireToken(
  decisionPanel,
  'diagnoseGuidedTeaching',
  'automatic guided diagnosis',
);

requireToken(
  decisionPanel,
  'Review automatic diagnosis',
  'diagnosis review stage',
);

requireToken(
  decisionPanel,
  'Accept diagnosis and continue',
  'diagnosis acceptance action',
);

requireToken(
  decisionPanel,
  'Final review',
  'final review stage',
);

/*
 * Evidence persistence.
 */

requireToken(
  decisionPanel,
  'createTeachingDecision',
  'new Teaching evidence creation',
);

requireToken(
  decisionPanel,
  'supersedeTeachingDecision',
  'existing Teaching evidence supersession',
);

requireToken(
  decisionPanel,
  'Save Teaching evidence',
  'Teaching evidence save action',
);

requireToken(
  decisionPanel,
  'Save evidence and fix this occurrence',
  'combined evidence and occurrence-correction action',
);

requireToken(
  decisionPanel,
  'Teaching evidence saved',
  'persistent save result',
);

/*
 * Existing reviewed evidence.
 */

requireToken(
  teachingPanel,
  'Already reviewed',
  'existing reviewed-occurrence state',
);

requireToken(
  teachingPanel,
  'Edit this occurrence',
  'explicit existing-evidence edit action',
);

requireToken(
  teachingPanel,
  'existingRecordId',
  'existing record identity propagation',
);

/*
 * API contracts.
 */

requireToken(
  decisionClient,
  '/teaching-decisions/snapshot',
  'snapshot API route',
);

requireToken(
  decisionClient,
  '/teaching-decisions',
  'Teaching decision API route',
);

requireToken(
  decisionClient,
  '/supersede',
  'supersession API route',
);

requireToken(
  decisionClient,
  '/retract',
  'retraction API route',
);

requireToken(
  guidedClient,
  '/diagnose',
  'guided diagnosis API route',
);

/*
 * Safety boundaries.
 */

requireToken(
  decisionPanel,
  'does not tune or activate the analyzer',
  'no-tuning and no-activation notice',
);

requireToken(
  decisionPanel,
  'Analyzer tuning',
  'tuning status in final review',
);

requireToken(
  decisionPanel,
  'Not performed',
  'tuning not performed status',
);

if (decisionPanel.includes('Save review decision')) {
  throw new Error(
    'Obsolete pre-Phase-C save action remains.',
  );
}

if (decisionPanel.includes('Failure<select')) {
  throw new Error(
    'Manual technical-failure selection remains in the normal workflow.',
  );
}

console.log(
  'Teaching decision workflow compatibility checks passed.',
);
