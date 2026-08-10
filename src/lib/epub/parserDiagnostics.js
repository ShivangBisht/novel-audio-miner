import { contentStreamText } from './contentStream.js';

function normalize(value) {
  return String(value ?? '').replace(/\u00a0/g,' ').replace(/[\t\r\f]+/g,' ').replace(/\s+/g,' ').trim();
}
export function buildEpubParserDiagnostics({ packageModel, documents = [] } = {}) {
  const documentReports=documents.map(document => {
    const extracted=contentStreamText(document.events || []);
    const expected=String(document.visibleText ?? '');
    const reconstructed=normalize(extracted) === normalize(expected);
    return Object.freeze({
      documentHref:document.documentHref, spineIndex:document.spineIndex,
      eventCount:(document.events || []).length,
      textBlockCount:(document.events || []).filter(item=>item.type==='text-block').length,
      headingCount:(document.events || []).filter(item=>item.type==='heading').length,
      imageCount:(document.events || []).filter(item=>item.type==='image').length,
      reconstructed, expectedLength:normalize(expected).length, extractedLength:normalize(extracted).length
    });
  });
  return Object.freeze({
    schemaVersion:'13.1', package:packageModel?.diagnostics || null,
    documentCount:documentReports.length,
    reconstructionFailureCount:documentReports.filter(item=>!item.reconstructed).length,
    documents:Object.freeze(documentReports)
  });
}
export function assertLosslessEpubExtraction(report) {
  const failures=(report?.documents || []).filter(item=>!item.reconstructed);
  if (failures.length) throw new Error(`EPUB text reconstruction failed for: ${failures.map(item=>item.documentHref).join(', ')}`);
  return true;
}
