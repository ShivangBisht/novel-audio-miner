import fs from 'node:fs';

const decisionPanel = fs.readFileSync(
  'src/components/TeachingDecisionPanel.jsx',
  'utf8',
);

const teachingPanel = fs.readFileSync(
  'src/components/TeachingPanel.jsx',
  'utf8',
);

const decisionClient = fs.readFileSync(
  'src/lib/teachingDecisionClient.js',
  'utf8',
);

const advancedDashboard = fs.readFileSync(
  'src/components/TeachingAdvancedDashboard.jsx',
  'utf8',
);

function requireContract(source, token, description) {
  if (!source.includes(token)) {
    throw new Error(
      `Missing Alpha 6 contract: ${description} (${token})`,
    );
  }
}

requireContract(
  decisionPanel,
  'listTeachingDecisions',
  'Teaching decision history loading',
);

requireContract(
  decisionPanel,
  'teachingDecisionSummary',
  'Teaching review summary loading',
);

requireContract(
  decisionPanel,
  'teachingDecisionDiagnosis',
  'stored decision diagnosis',
);

requireContract(
  decisionPanel,
  'supersedeTeachingDecision',
  'Teaching decision supersession',
);

requireContract(
  decisionPanel,
  'retractTeachingDecision',
  'Teaching decision retraction',
);

requireContract(
  decisionPanel,
  'replaceId ? await supersedeTeachingDecision',
  'conditional replacement of an existing record',
);

requireContract(
  decisionPanel,
  'result.replacement.recordId',
  'replacement record identity handling',
);

requireContract(
  decisionPanel,
  'save(existingRecordId || null)',
  'existing record passed into the save workflow',
);

requireContract(
  decisionPanel,
  'Candidate:',
  'candidate diagnosis details',
);

requireContract(
  decisionPanel,
  'Boundary:',
  'boundary diagnosis details',
);

requireContract(
  decisionPanel,
  'Classification:',
  'classification diagnosis details',
);

requireContract(
  teachingPanel,
  'existingRecordId',
  'active Teaching record detection',
);

requireContract(
  teachingPanel,
  'editMode',
  'explicit editing of reviewed evidence',
);

requireContract(
  teachingPanel,
  'Edit this occurrence',
  'reviewed-occurrence edit action',
);

requireContract(
  teachingPanel,
  'will supersede the active record',
  'supersession warning before editing',
);

requireContract(
  teachingPanel,
  'existingRecordId={editMode ? existingRecordId:null}',
  'supersession only during explicit edit mode',
);

requireContract(
  decisionClient,
  '/supersede',
  'supersession API route',
);

requireContract(
  decisionClient,
  '/retract',
  'retraction API route',
);

const requiredAdvancedCategories = [
  'Review and history',
  'Quality and corpus',
  'Portability',
  'Corpus packages',
  'Offline evaluation',
  'Controlled activation',
];

for (const category of requiredAdvancedCategories) {
  requireContract(
    advancedDashboard,
    category,
    `Advanced Teaching category ${category}`,
  );
}

if (decisionPanel.includes('Failure<select')) {
  throw new Error(
    'Manual technical-failure selection remains in the normal workflow.',
  );
}

if (decisionPanel.includes('Decision history and management')) {
  throw new Error(
    'Obsolete pre-Phase-C review-management heading remains.',
  );
}

console.log(
  'Alpha 6 review-management compatibility checks passed.',
);
