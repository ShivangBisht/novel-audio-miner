import assert from 'node:assert/strict';
import {
  createAnalyzerReaderContext,
  getAnalyzerSelectionActionState,
  resolveAnalyzerReaderContextForOffsets
} from '../src/lib/analyzerMiningSelection.js';

const compound = {
  start: 3, end: 8, surface: '出て行った', displayRole: 'lexical-compound',
  headword: '出て行く', knownLookupKey: '出て行く', frequencyLookupKey: '出て行く',
  countsForComprehension: true, showInNewWords: true, eligibleForMining: true
};
const particle = {
  start: 8, end: 9, surface: 'を', displayRole: 'function',
  knownLookupKey: null, eligibleForMining: false
};
const grammar = {
  start: 9, end: 12, surface: 'てきた', displayRole: 'learnable-grammar',
  knownLookupKey: null, eligibleForMining: true, grammarId: 'TE_KURU', hostLookupKey: '来る'
};

const partial = resolveAnalyzerReaderContextForOffsets([compound, particle, grammar], 4, 6, '行っ');
assert.equal(partial.valid, true);
assert.equal(partial.context.surface, '出て行った');
assert.equal(partial.context.knownLookupKey, '出て行く');
assert.equal(partial.context.rawSelectedText, '行っ');

const crossing = resolveAnalyzerReaderContextForOffsets([compound, particle], 7, 9, 'たを');
assert.equal(crossing.valid, false);
assert.equal(crossing.reason, 'selection-crosses-analyzer-spans');

const lexicalActions = getAnalyzerSelectionActionState(partial.context, {
  isKnown: () => false,
  isManualKnown: () => false
});
assert.equal(lexicalActions.canMarkKnown, true);
assert.equal(lexicalActions.canMine, true);
assert.equal(lexicalActions.knownKey, '出て行く');

const functionContext = createAnalyzerReaderContext(particle, 8, 9, 'を');
const functionActions = getAnalyzerSelectionActionState(functionContext);
assert.equal(functionActions.canMarkKnown, false);
assert.equal(functionActions.canMine, false);
assert.match(functionActions.miningMessage, /not eligible for mining/);

const grammarContext = createAnalyzerReaderContext(grammar, 10, 11, 'き');
const grammarActions = getAnalyzerSelectionActionState(grammarContext);
assert.equal(grammarActions.canMarkKnown, false);
assert.equal(grammarActions.canMine, true);
assert.match(grammarActions.knownMessage, /grammar span/);

const manualActions = getAnalyzerSelectionActionState(partial.context, {
  isKnown: key => key === '出て行く',
  isManualKnown: key => key === '出て行く'
});
assert.equal(manualActions.canUndoKnown, true);

console.log('unified analyzer selection ownership tests passed');
