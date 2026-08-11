import { contentStreamText } from './contentStream.js';
function normalize(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/[\t\r\f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compact(value) {
  return String(value ?? '')
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, '');
}
export function buildEpubParserDiagnostics({ packageModel, documents=[] }={}) {
  const documentReports=documents.map(document=>{
    const events=document.events||[]; const extracted=contentStreamText(events); const expected=String(document.visibleText??'');
    const normalizedExpected = normalize(expected);
    const normalizedExtracted = normalize(extracted);
    const compactExpected = compact(expected);
    const compactExtracted = compact(extracted);

    const expectedLength = normalizedExpected.length;
    const extractedLength = normalizedExtracted.length;

    const exactNormalizedMatch =
      normalizedExtracted === normalizedExpected;

    const compactEquivalent =
      compactExtracted === compactExpected;
    const ownership=events.extractionStats||{};
    return Object.freeze({
      documentHref:document.documentHref,spineIndex:document.spineIndex,eventCount:events.length,
      textBlockCount:events.filter(item=>item.type==='text-block').length,
      headingCount:events.filter(item=>item.type==='heading').length,imageCount:events.filter(item=>item.type==='image').length,
      softBreakCount:events.filter(item=>item.type==='soft-break').length,
      reconstructed: exactNormalizedMatch,
      exactNormalizedMatch,
      compactEquivalent,
      reconstructionQualification:
        exactNormalizedMatch
          ? 'exact'
          : compactEquivalent
            ? 'normalized-equivalent'
            : 'failed',
      expectedLength,
      extractedLength,
      compactExpectedLength: compactExpected.length,
      compactExtractedLength: compactExtracted.length,
      lengthDelta: extractedLength - expectedLength,
      textNodeCount:ownership.textNodeCount??null,ownedTextNodeCount:ownership.ownedTextNodeCount??null,
      unownedTextNodeCount:ownership.unownedTextNodeCount??null,duplicateTextNodeCount:ownership.duplicateTextNodeCount??null
    });
  });
  const exactReconstructionCount =
    documentReports.filter(
      item => item.reconstructionQualification === 'exact'
    ).length;

  const normalizedEquivalentCount =
    documentReports.filter(
      item =>
        item.reconstructionQualification ===
        'normalized-equivalent'
    ).length;

  const unsafeReconstructionFailureCount =
    documentReports.filter(
      item =>
        item.reconstructionQualification === 'failed'
    ).length;

  return Object.freeze({
    schemaVersion: '13.6B',
    package: packageModel?.diagnostics || null,
    documentCount: documentReports.length,

    // Retained for diagnostic compatibility.
    reconstructionFailureCount:
      documentReports.filter(
        item => !item.reconstructed
      ).length,

    exactReconstructionCount,
    normalizedEquivalentCount,
    unsafeReconstructionFailureCount,

    documents: Object.freeze(documentReports)
  });
}
export function assertLosslessEpubExtraction(report) {
  const failures=(report?.documents||[]).filter(item=>!item.reconstructed);
  if (failures.length) throw new Error(`EPUB text reconstruction failed for: ${failures.map(item=>item.documentHref).join(', ')}`);
  return true;
}
