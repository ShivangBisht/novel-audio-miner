import fs from 'node:fs';

const panel = fs.readFileSync('src/components/TeachingPanel.jsx', 'utf8');
const decision = fs.readFileSync('src/components/TeachingDecisionPanel.jsx', 'utf8');

function functionBody(source, signature) {
  const start = source.indexOf(signature);
  if (start < 0) throw new Error(`Missing function: ${signature}`);
  const open = source.indexOf('{', start);
  if (open < 0) throw new Error(`Missing function body: ${signature}`);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, index);
    }
  }
  throw new Error(`Unclosed function body: ${signature}`);
}

const saveBody = functionBody(panel, 'async function saveOccurrenceCorrection');
if (saveBody.includes('onCorrectionMutation')) {
  throw new Error('Occurrence persistence still refreshes the Reader before the success receipt.');
}
if (!decision.includes('onFinishReview?.(savedResult)')) {
  throw new Error('Return to reading is not connected to deferred Reader refresh.');
}
if (!decision.includes("setStage('success')")) {
  throw new Error('Successful save does not enter the persistent success stage.');
}
for (const text of [
  'Teaching evidence saved',
  'Occurrence correction',
  'Quality state',
  'Analyzer tuning',
  'Global analyzer',
  'Return to reading',
]) {
  if (!decision.includes(text)) throw new Error(`Missing success receipt contract: ${text}`);
}
console.log('Post-Alpha C success-screen sequencing checks passed.');
