import { contentStreamText } from './contentStream.js';
function normalize(value) { return String(value ?? '').replace(/\u00a0/g,' ').replace(/[\t\r\f]+/g,' ').replace(/\s+/g,' ').trim(); }
export function buildEpubParserDiagnostics({ packageModel, documents=[] }={}) {
  const documentReports=documents.map(document=>{
    const events=document.events||[]; const extracted=contentStreamText(events); const expected=String(document.visibleText??'');
    const expectedLength=normalize(expected).length, extractedLength=normalize(extracted).length;
    const ownership=events.extractionStats||{};
    return Object.freeze({
      documentHref:document.documentHref,spineIndex:document.spineIndex,eventCount:events.length,
      textBlockCount:events.filter(item=>item.type==='text-block').length,
      headingCount:events.filter(item=>item.type==='heading').length,imageCount:events.filter(item=>item.type==='image').length,
      softBreakCount:events.filter(item=>item.type==='soft-break').length,
      reconstructed:normalize(extracted)===normalize(expected),expectedLength,extractedLength,lengthDelta:extractedLength-expectedLength,
      textNodeCount:ownership.textNodeCount??null,ownedTextNodeCount:ownership.ownedTextNodeCount??null,
      unownedTextNodeCount:ownership.unownedTextNodeCount??null,duplicateTextNodeCount:ownership.duplicateTextNodeCount??null
    });
  });
  return Object.freeze({schemaVersion:'13.3',package:packageModel?.diagnostics||null,documentCount:documentReports.length,reconstructionFailureCount:documentReports.filter(item=>!item.reconstructed).length,documents:Object.freeze(documentReports)});
}
export function assertLosslessEpubExtraction(report) {
  const failures=(report?.documents||[]).filter(item=>!item.reconstructed);
  if (failures.length) throw new Error(`EPUB text reconstruction failed for: ${failures.map(item=>item.documentHref).join(', ')}`);
  return true;
}
