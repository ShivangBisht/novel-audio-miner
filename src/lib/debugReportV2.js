export const DEBUG_REPORT_SCHEMA_VERSION = '2.0';

function clone(value) {
  if (value == null) return value;
  try { return structuredClone(value); }
  catch {
    try { return JSON.parse(JSON.stringify(value)); }
    catch { return null; }
  }
}

function diagnosticId(now = new Date()) {
  const stamp = now.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const random = Math.random().toString(36).slice(2, 10);
  return `nam-${stamp}-${random}`;
}

function compactBookSummary(book) {
  return {
    id: book?.id || '',
    fileName: book?.fileName || '',
    title: book?.title || '',
    author: book?.author || '',
    tocCount: book?.toc?.length || 0,
    chapterCount: book?.chapters?.length || 0,
    totalItems: book?.debug?.totalItems ?? null,
    sentenceCount: book?.debug?.sentenceCount ?? null,
    imageCount: book?.debug?.imageCount ?? null
  };
}

function readerContract(reader) {
  return {
    valid: Boolean(reader?.valid),
    schemaVersion: reader?.schemaVersion || '',
    errors: clone(reader?.errors || []),
    reconstructsSource: Boolean(reader?.valid),
    spanCount: reader?.words?.length || 0,
    summary: clone(reader?.summary || null),
    correctionAware: Boolean(reader?.correctionAware)
  };
}

export function buildDebugReportV2({
  application = {}, book = null, reader = {}, scene = {}, adjacentScenes = [],
  analyzerShadow = {}, analyzerReader = {}, analyzerResult = null,
  metadataLease = null, metadataLeaseMs = null,
  presentationSpans = [], learning = {}, selection = {}, mining = {},
  prefetchTargets = [], analyzerObservability = null,
  includeFullParserInventory = false, now = new Date()
} = {}) {
  const result = analyzerResult || {};
  const report = {
    report: {
      schemaVersion: DEBUG_REPORT_SCHEMA_VERSION,
      generatedAt: now.toISOString(),
      diagnosticId: diagnosticId(now)
    },
    application: clone(application),
    book: {
      summary: compactBookSummary(book),
      fullParserInventoryIncluded: Boolean(includeFullParserInventory)
    },
    reader: clone(reader),
    scene: {
      current: clone(scene),
      adjacent: clone(adjacentScenes)
    },
    analyzer: {
      health: {
        status: analyzerShadow?.status || 'idle',
        error: analyzerShadow?.error?.message || analyzerShadow?.error || null,
        analyzerVersion: analyzerShadow?.analyzerVersion || result?.analyzerVersion || null,
        readerSpanSchemaVersion: analyzerShadow?.readerSpanSchemaVersion || result?.readerSpanSchemaVersion || null,
        readerCandidateSchemaVersion: result?.readerCandidateSchemaVersion || null,
        correctionRevision: analyzerShadow?.correctionRevision || result?.correctionRevision || null
      },
      contract: readerContract(analyzerReader),
      readerSpans: clone(result?.readerSpans || []),
      readerSelection: clone(result?.readerSelection || null),
      appliedCorrections: clone(
        result?.appliedReaderCorrections ||
        result?.readerSelection?.appliedCorrections ||
        []
      )
    },
    cache: {
      resultSource: analyzerShadow?.source || null,
      requestDurationMs: analyzerShadow?.elapsedMs ?? null,
      cacheKey: analyzerShadow?.cacheKey || null,
      cacheIdentity: analyzerShadow?.cacheIdentity || null,
      cacheReason: analyzerShadow?.cacheReason || null,
      inFlightRequestCount: analyzerShadow?.inFlightRequestCount ?? 0,
      metadataLease: {
        valid: Boolean(metadataLease),
        verifiedAt: metadataLease?.verifiedAt ?? null,
        ageMs: metadataLease?.verifiedAt != null ? Math.max(0, Date.now() - metadataLease.verifiedAt) : null,
        durationMs: metadataLeaseMs,
        analyzerVersion: metadataLease?.analyzerVersion || null,
        readerSpanSchemaVersion: metadataLease?.readerSpanSchemaVersion || null,
        correctionRevision: metadataLease?.correctionRevision || null
      }
    },
    prefetch: {
      status: analyzerShadow?.prefetchStatus || 'idle',
      targetCount: analyzerShadow?.prefetchTargetCount ?? 0,
      completedCount: analyzerShadow?.prefetchCompletedCount ?? 0,
      failureCount: analyzerShadow?.prefetchFailedCount ?? 0,
      targets: clone(prefetchTargets)
    },
    analyzerObservability: clone(analyzerObservability),
    presentation: { spans: clone(presentationSpans) },
    learning: {
      available: Boolean(learning?.available),
      source: learning?.source || null,
      comprehension: clone(learning?.comprehension || null),
      newWords: clone(learning?.newWords || [])
    },
    selection: {
      raw: selection?.raw || '',
      readerContext: clone(selection?.readerContext || null),
      actionState: clone(selection?.actionState || null),
      issue: selection?.issue || null
    },
    mining: {
      candidate: clone(mining?.candidate || null),
      lookupIdentity: mining?.lookupIdentity || null,
      debug: clone(mining?.debug || null),
      enrichment: clone(mining?.enrichment || null),
      working: Boolean(mining?.working)
    },
    epub: {
      parserSummary: {
        ...compactBookSummary(book),
        currentSource: clone(scene?.parserDebug || null)
      },
      currentSource: clone(scene),
      fullInventory: includeFullParserInventory ? clone(book?.debug || null) : null
    }
  };
  return report;
}

export function buildDiagnosticSummaryV2(report) {
  const r = report || {};
  return [
    `diagnostic=${r.report?.diagnosticId || '-'}`,
    `scene=${r.reader?.sceneNumber || '-'}/${r.reader?.totalScenes || '-'}`,
    `analyzer=${r.analyzer?.health?.status || 'idle'}`,
    `contract=${r.analyzer?.contract?.valid ? 'valid' : 'invalid'}`,
    `source=${r.cache?.resultSource || '-'}`,
    `durationMs=${r.cache?.requestDurationMs ?? '-'}`,
    `prefetch=${r.prefetch?.status || 'idle'} ${r.prefetch?.completedCount || 0}/${r.prefetch?.targetCount || 0}`,
    `queue=${r.analyzerObservability?.scheduler?.queuedCount ?? '-'}`,
    `sessionCache=${r.analyzerObservability?.sessionCache?.size ?? '-'}/${r.analyzerObservability?.sessionCache?.limit ?? '-'}`,
    `selection=${r.selection?.readerContext?.surface || r.selection?.raw || '-'}`,
    `mining=${r.mining?.debug?.status || 'idle'}`
  ].join('; ');
}
