import {
  chooseDictionaryOperation,
  dictionaryEntryBatches,
  inspectDictionaryPackage,
} from './dictionaryPackageImport.js';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8766';

async function request(path, options = {}, baseUrl = DEFAULT_BASE_URL) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.detail || `Dictionary request failed (${response.status}).`);
  }
  return payload;
}

export function getDictionaryManagementStatus(options = {}) {
  return request('/dictionary-sync/management/status', {}, options.baseUrl);
}

export async function cancelDictionaryOperation(operationId, options = {}) {
  return request('/dictionary-sync/item/cancel', {
    method: 'POST', body: JSON.stringify({ operationId }),
  }, options.baseUrl);
}

export async function removeInstalledDictionary(dictionaryId, options = {}) {
  return request('/dictionary-sync/item', {
    method: 'DELETE', body: JSON.stringify({ dictionaryId }),
  }, options.baseUrl);
}

export async function importDictionaryFile(file, options = {}) {
  const inspection = await inspectDictionaryPackage(file, options);
  const status = options.managementStatus || await getDictionaryManagementStatus(options);
  const choice = chooseDictionaryOperation(
    inspection.metadata,
    status.installedDictionaries || [],
  );
  const operation = await request('/dictionary-sync/item/start', {
    method: 'POST',
    body: JSON.stringify({
      mode: options.mode || choice.mode,
      dictionaryId: options.dictionaryId || choice.dictionaryId,
      stableIdentity: inspection.metadata.stableIdentity,
      displayTitle: inspection.metadata.title,
      dictionaryType: inspection.metadata.dictionaryType,
      priority: inspection.metadata.priority,
      expectedEntries: inspection.metadata.entryCount,
      revision: inspection.metadata.revision,
      version: inspection.metadata.version,
      contentDigest: inspection.metadata.contentDigest,
      sourceUrl: inspection.metadata.sourceUrl,
      updateManifestUrl: inspection.metadata.updateManifestUrl,
    }),
  }, options.baseUrl);
  let sent = 0;
  try {
    for await (const entries of dictionaryEntryBatches(inspection, options.batchSize || 2000)) {
      if (options.signal?.aborted) throw new DOMException('Dictionary import cancelled.', 'AbortError');
      await request('/dictionary-sync/item/batch', {
        method: 'POST',
        body: JSON.stringify({ operationId: operation.operationId, entries }),
        signal: options.signal,
      }, options.baseUrl);
      sent += entries.length;
      options.onProgress?.({
        operationId: operation.operationId,
        sent,
        total: inspection.metadata.entryCount,
        ratio: sent / inspection.metadata.entryCount,
      });
    }
    const completed = await request('/dictionary-sync/item/finish', {
      method: 'POST', body: JSON.stringify({ operationId: operation.operationId }),
    }, options.baseUrl);
    return { inspection: inspection.metadata, choice, operation: completed };
  } catch (error) {
    await cancelDictionaryOperation(operation.operationId, options).catch(() => {});
    throw error;
  }
}


export async function updateInstalledDictionaryMetadata(dictionaryId, metadata, options = {}) {
  return request('/dictionary-sync/item/metadata', {
    method: 'PATCH',
    body: JSON.stringify({ dictionaryId, ...metadata }),
  }, options.baseUrl);
}
