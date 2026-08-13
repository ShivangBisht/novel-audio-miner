import assert from 'node:assert/strict';
import fs from 'node:fs';

const reader=fs.readFileSync('src/components/Reader.jsx','utf8');
const panel=fs.readFileSync('src/components/TeachingPanel.jsx','utf8');
const decision=fs.readFileSync('src/components/TeachingDecisionPanel.jsx','utf8');

for(const token of [
 'resolveDomVisualSelection({',
 'resolveLogicalSentenceSelection({',
 'analyzeJpAnalyzerSentenceOnDemand(',
 'qualifyLogicalTeachingInput({',
 'const usesContextualTeaching = logicalSentences.length > 1;',
 'analysis={teachingAnalysis ||',
 "message: 'Preparing sentence-local Teaching analysis...'",
 'teachingAnalysisRequestRef.current !== requestId'
]) assert.ok(reader.includes(token),`Missing Step 6 runtime contract: ${token}`);

// Standalone scenes continue through the original resolver.
assert.ok(reader.includes('const result = resolveTeachingSelection({'));
assert.ok(reader.includes('analyzerSpans: jpAnalyzerReader.words'));

// Contextual runtime must pass the Step 5 output unchanged into the existing panel.
assert.ok(reader.includes('setTeachingSelection(qualified.selection);'));
assert.ok(reader.includes('setTeachingAnalysis(qualified.analysis);'));
assert.ok(reader.includes('<TeachingPanel'));

// The formalized Teaching components remain untouched by Step 6 design.
for(const token of ['previewReaderCorrection','baselineReaderSpans: analysis.words','readerCandidates: analysis.candidates','readerSelection: analysis.selection']) {
 assert.ok(panel.includes(token),`Formal TeachingPanel contract missing: ${token}`);
}
for(const token of ['Save Teaching evidence','createTeachingDecision','sentence: selection.sentence']) {
 assert.ok(decision.includes(token),`Formal TeachingDecision contract missing: ${token}`);
}

// Reader-visible analyzer, mining, and prefetch ownership remain in place.
assert.ok(reader.includes("useJpAnalyzerShadow(\n    isText ? currentData?.plainText : ''"));
assert.ok(reader.includes('planRollingTextScenePrefetch(displayItems, itemIndex)'));
assert.ok(reader.includes('resolveAnalyzerReaderContextForOffsets('));
assert.ok(reader.includes('activeDisplayWords'));

console.log('Phase 14.5A step 6 controlled Teaching runtime integration tests passed');
