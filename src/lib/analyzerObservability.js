function finiteNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function safeKind(value) {
  return value === 'foreground' || value === 'prefetch' ? value : null;
}

export function buildSanitizedAnalyzerObservability({
  scheduler = {},
  sessionCache = {},
  shadow = {},
  reader = {}
} = {}) {
  const queued = Array.isArray(scheduler?.queued) ? scheduler.queued : [];
  const activeKind = safeKind(scheduler?.active?.kind);
  return {
    schemaVersion: '1.0',
    scheduler: {
      activeCount: finiteNumber(scheduler?.activeCount),
      activeKind,
      activePriority: Number.isFinite(scheduler?.active?.priority)
        ? scheduler.active.priority
        : null,
      queuedCount: finiteNumber(scheduler?.queuedCount, queued.length),
      queuedForegroundCount: queued.filter(item => item?.kind === 'foreground').length,
      queuedPrefetchCount: queued.filter(item => item?.kind === 'prefetch').length,
      startedCount: finiteNumber(scheduler?.started),
      completedCount: finiteNumber(scheduler?.completed),
      failedCount: finiteNumber(scheduler?.failed),
      promotedCount: finiteNumber(scheduler?.promoted),
      coalescedCount: finiteNumber(scheduler?.coalesced),
      staleRemovedCount: finiteNumber(scheduler?.staleRemoved)
    },
    sessionCache: {
      size: finiteNumber(sessionCache?.size),
      limit: finiteNumber(sessionCache?.limit),
      protectedCount: finiteNumber(sessionCache?.protectedCount),
      evictionCount: finiteNumber(sessionCache?.evictionCount)
    },
    visibleAnalysis: {
      source: String(shadow?.source ?? '') || null,
      elapsedMs: Number.isFinite(shadow?.elapsedMs)
        ? Math.round(shadow.elapsedMs)
        : null,
      cacheReason: String(shadow?.cacheReason ?? '') || null
    },
    prefetch: {
      status: String(shadow?.prefetchStatus ?? 'idle'),
      targetCount: finiteNumber(shadow?.prefetchTargetCount),
      completedCount: finiteNumber(shadow?.prefetchCompletedCount),
      failedCount: finiteNumber(shadow?.prefetchFailedCount),
      currentSceneIndex: Number.isInteger(reader?.currentSceneIndex)
        ? reader.currentSceneIndex
        : null,
      forwardTargetCount: finiteNumber(reader?.forwardTargetCount),
      hasPreviousProtection: Boolean(reader?.hasPreviousProtection)
    }
  };
}
