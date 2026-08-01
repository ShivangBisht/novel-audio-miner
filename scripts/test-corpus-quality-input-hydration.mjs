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
      `Missing corpus-quality hydration contract: ` +
      `${description} (${token})`,
    );
  }
}

const panel = read(
  'src/components/TeachingCorpusQualityPanel.jsx',
);

const client = read(
  'src/lib/teachingQualityClient.js',
);

/*
 * Existing quality states are loaded before form hydration.
 */

requireToken(
  panel,
  'getRecordQuality',
  'loading persisted record-quality state',
);

requireToken(
  panel,
  'Object.fromEntries(states)',
  'building the persisted quality-state map',
);

requireToken(
  panel,
  'values[record.recordId]',
  'matching persisted quality to each Teaching record',
);

/*
 * Reviewer and quality note are restored from persisted state.
 */

requireToken(
  panel,
  'remembered?.reviewer',
  'persisted reviewer hydration',
);

requireToken(
  panel,
  'remembered?.quality_note',
  'persisted quality-note hydration',
);

requireToken(
  panel,
  'setReviewer(current => current ||',
  'non-destructive reviewer hydration',
);

requireToken(
  panel,
  'setNote(current => current ||',
  'non-destructive quality-note hydration',
);

/*
 * Existing record metadata remains the fallback when updating.
 */

requireToken(
  panel,
  'current.reviewer',
  'current persisted reviewer fallback',
);

requireToken(
  panel,
  'current.quality_note',
  'current persisted quality-note fallback',
);

requireToken(
  panel,
  'setRecordQuality',
  'quality-state persistence',
);

/*
 * The quality client must carry reviewer and note metadata.
 */

requireToken(
  client,
  'reviewer',
  'reviewer transport field',
);

if (
  !client.includes('qualityNote') &&
  !client.includes('quality_note')
) {
  throw new Error(
    'Missing quality-note transport field.',
  );
}

requireToken(
  client,
  '/teaching-quality',
  'Teaching quality API route',
);

console.log(
  'Corpus quality input hydration checks passed.',
);
