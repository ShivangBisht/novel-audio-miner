import assert from 'node:assert/strict';
import { buildContextualSceneDiagnostics } from '../src/lib/scenePlanning/contextualDiagnostics.js';

const documents = [
  {
    documentHref: 'text/chapter.xhtml',
    spineIndex: 0,
    events: [
      { type: 'text-block', eventIndex: 0, plainText: 'けれど。', htmlText: '<em>けれど。</em>' },
      { type: 'text-block', eventIndex: 1, plainText: '次の完全な文です。', htmlText: '<ruby>次<rt>つぎ</rt></ruby>の完全な文です。' },
      { type: 'image', eventIndex: 2, imageHref: 'image.jpg' },
      { type: 'text-block', eventIndex: 3, plainText: 'と。', htmlText: 'と。' },
      { type: 'text-block', eventIndex: 4, plainText: '最後の完全な文です。', htmlText: '最後の完全な文です。' },
      { type: 'thematic-break', eventIndex: 5 },
      { type: 'text-block', eventIndex: 6, plainText: '♠', htmlText: '♠' }
    ]
  },
  {
    documentHref: 'text/next.xhtml',
    spineIndex: 1,
    events: [
      { type: 'text-block', eventIndex: 0, plainText: '「そうですか」彼女はうなずいた。', htmlText: '「そうですか」彼女はうなずいた。' }
    ]
  }
];
const bookModel = {
  sections: [
    { sectionIndex: 0, type: 'chapter', includedInReading: true, start: { spineIndex: 0, eventIndex: 0 }, end: { spineIndex: 0, eventIndex: 6 } },
    { sectionIndex: 1, type: 'chapter', includedInReading: true, start: { spineIndex: 1, eventIndex: 0 }, end: { spineIndex: 1, eventIndex: 0 } }
  ]
};
const diagnostics = buildContextualSceneDiagnostics({ runtime: { documents, bookModel } });
assert.equal(diagnostics.schemaVersion, '14.4');
assert.equal(diagnostics.mode, 'diagnostic-only');
assert.equal(diagnostics.plannerValid, true);
assert.equal(diagnostics.allMarkupSlicesReconstruct, true);
assert.equal(diagnostics.skippedEventCount, 0);
assert.equal(diagnostics.forwardAttachmentSceneCount >= 2, true);
assert.equal(diagnostics.hardBoundaryCounts.image >= 1, true);
assert.equal(diagnostics.hardBoundaryCounts['thematic-break'] >= 1, true);
assert.equal(diagnostics.hardBoundaryCounts['document-start'] >= 2, true);
assert.equal(diagnostics.multiEventSceneCount >= 2, true);
assert.equal(JSON.stringify(diagnostics).includes('けれど'), false);
assert.equal(JSON.stringify(diagnostics).includes('次の完全な文'), false);

const excluded = buildContextualSceneDiagnostics({
  runtime: {
    documents: [{ documentHref: 'toc.xhtml', spineIndex: 0, events: [{ type: 'text-block', eventIndex: 0, plainText: 'links', htmlText: 'links' }] }],
    bookModel: { sections: [{ sectionIndex: 0, type: 'navigation', includedInReading: false, start: { spineIndex: 0, eventIndex: 0 }, end: { spineIndex: 0, eventIndex: 0 } }] }
  }
});
assert.equal(excluded.contextualSceneCount, 0);
assert.equal(excluded.hardBoundaryCounts['excluded-section'] >= 1, true);

console.log('Phase 14.4 contextual EPUB diagnostics tests passed');
