import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getDictionaryManagementStatus,
  importDictionaryFile,
  removeInstalledDictionary,
  updateInstalledDictionaryMetadata,
} from '../lib/dictionaryDirectImport.js';
import {
  checkAllDictionaryUpdates,
  checkDictionaryUpdate,
  downloadDictionaryUpdate,
} from '../lib/dictionaryUpdateCheck.js';
import { inspectDictionaryPackage } from '../lib/dictionaryPackageImport.js';

function message(error) {
  return error instanceof Error ? error.message : String(error);
}

function statusLabel(value) {
  return String(value || 'not checked').replaceAll('-', ' ');
}

export default function DictionaryManagementPanel() {
  const [management, setManagement] = useState(null);
  const [updates, setUpdates] = useState({});
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(null);
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const abortRef = useRef(null);
  const dictionaries = management?.installedDictionaries || [];
  const availableCount = useMemo(
    () => Object.values(updates).filter(item => item?.updateAvailable).length,
    [updates],
  );

  async function refresh(silent = false) {
    try {
      const value = await getDictionaryManagementStatus();
      setManagement(value);
      if (!silent) setNotice({ type: 'ok', text: 'Dictionary status refreshed.' });
    } catch (error) {
      setNotice({ type: 'error', text: `Analyzer unavailable: ${message(error)}` });
    }
  }

  useEffect(() => { refresh(true); }, []);

  async function inspectFile(file) {
    if (!file) return;
    setBusy(true);
    setNotice({ type: 'working', text: 'Inspecting dictionary package...' });
    try {
      const inspection = await inspectDictionaryPackage(file);
      setPreview({ file, metadata: inspection.metadata });
      setNotice({ type: 'ok', text: `Ready: ${inspection.metadata.title}` });
    } catch (error) {
      setPreview(null);
      setNotice({ type: 'error', text: message(error) });
    } finally {
      setBusy(false);
    }
  }

  async function installPreview() {
    if (!preview?.file) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setProgress({ sent: 0, total: preview.metadata.entryCount, ratio: 0 });
    setNotice({ type: 'working', text: 'Uploading dictionary to JP Analyzer...' });
    try {
      const result = await importDictionaryFile(preview.file, {
        signal: controller.signal,
        managementStatus: management,
        onProgress: setProgress,
      });
      setNotice({
        type: 'ok',
        text: `${result.choice.mode === 'update' ? 'Updated' : 'Installed'} ${result.inspection.title}.`,
      });
      setPreview(null);
      await refresh(true);
    } catch (error) {
      setNotice({ type: 'error', text: message(error) });
    } finally {
      abortRef.current = null;
      setBusy(false);
      setProgress(null);
    }
  }

  async function checkOne(dictionary) {
    setBusy(true);
    setNotice({ type: 'working', text: `Checking ${dictionary.displayTitle}...` });
    try {
      const result = await checkDictionaryUpdate(dictionary);
      setUpdates(current => ({ ...current, [dictionary.dictionaryId]: result }));
      setNotice({ type: result.status === 'check-failed' ? 'error' : 'ok', text: `${dictionary.displayTitle}: ${statusLabel(result.status)}` });
    } finally {
      setBusy(false);
    }
  }

  async function checkAll() {
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setNotice({ type: 'working', text: 'Checking installed dictionaries...' });
    try {
      const results = await checkAllDictionaryUpdates(dictionaries, {
        signal: controller.signal,
        onResult: result => setUpdates(current => ({ ...current, [result.dictionaryId]: result })),
      });
      const count = results.filter(item => item.updateAvailable).length;
      setNotice({ type: 'ok', text: `${count} update${count === 1 ? '' : 's'} available.` });
    } catch (error) {
      setNotice({ type: 'error', text: message(error) });
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }

  async function applyOnlineUpdate(dictionary) {
    const update = updates[dictionary.dictionaryId];
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setNotice({ type: 'working', text: `Downloading ${dictionary.displayTitle}...` });
    try {
      const file = await downloadDictionaryUpdate(update, { signal: controller.signal });
      await importDictionaryFile(file, {
        signal: controller.signal,
        mode: 'update',
        dictionaryId: dictionary.dictionaryId,
        managementStatus: management,
        onProgress: setProgress,
      });
      setNotice({ type: 'ok', text: `Updated ${dictionary.displayTitle}.` });
      setUpdates(current => ({ ...current, [dictionary.dictionaryId]: null }));
      await refresh(true);
    } catch (error) {
      setNotice({ type: 'error', text: message(error) });
    } finally {
      abortRef.current = null;
      setBusy(false);
      setProgress(null);
    }
  }

  async function linkMetadata(dictionary, file) {
    if (!file) return;
    setBusy(true);
    setNotice({ type: 'working', text: `Reading update metadata for ${dictionary.displayTitle}...` });
    try {
      const inspection = await inspectDictionaryPackage(file);
      const metadata = inspection.metadata;
      if (!metadata.updateManifestUrl && !metadata.downloadUrl) {
        throw new Error('This ZIP does not provide indexUrl, updateManifestUrl, or downloadUrl.');
      }
      await updateInstalledDictionaryMetadata(dictionary.dictionaryId, {
        revision: metadata.revision,
        version: metadata.version,
        sourceUrl: metadata.sourceUrl,
        updateManifestUrl: metadata.updateManifestUrl,
        contentDigest: dictionary.contentDigest || null,
      });
      setNotice({ type: 'ok', text: `Saved online update source for ${dictionary.displayTitle}.` });
      await refresh(true);
    } catch (error) {
      setNotice({ type: 'error', text: message(error) });
    } finally {
      setBusy(false);
    }
  }

  async function removeDictionary(dictionary) {
    if (!window.confirm(`Remove ${dictionary.displayTitle} and its ${dictionary.entryCount.toLocaleString()} entries?`)) return;
    setBusy(true);
    try {
      await removeInstalledDictionary(dictionary.dictionaryId);
      setNotice({ type: 'ok', text: `Removed ${dictionary.displayTitle}.` });
      await refresh(true);
    } catch (error) {
      setNotice({ type: 'error', text: message(error) });
    } finally {
      setBusy(false);
    }
  }

  function cancel() {
    abortRef.current?.abort();
    setNotice({ type: 'working', text: 'Cancelling operation...' });
  }

  return (
    <div className="dictionary-manager" data-testid="dictionary-management-panel">
      <div className="dictionary-manager-header">
        <div>
          <strong>Dictionary Management</strong>
          <span>JP Analyzer SQLite is authoritative</span>
        </div>
        <span className={`dictionary-health ${management ? 'ok' : 'error'}`}>
          {management ? 'Connected' : 'Offline'}
        </span>
      </div>

      <div className="dictionary-summary">
        <div><span>Installed</span><strong>{management?.installedDictionaryCount ?? '—'}</strong></div>
        <div><span>Entries</span><strong>{management?.registryEntryCount?.toLocaleString?.() ?? '—'}</strong></div>
        <div><span>Updates</span><strong>{availableCount}</strong></div>
      </div>

      <div className="dictionary-toolbar">
        <label className="dictionary-file-button">
          Add / replace ZIP
          <input type="file" accept=".zip,application/zip" disabled={busy} onChange={event => inspectFile(event.target.files?.[0])} />
        </label>
        <button type="button" className="secondary" disabled={busy || !dictionaries.length} onClick={checkAll}>Check all updates</button>
        <button type="button" className="secondary" disabled={busy} onClick={() => refresh()}>Refresh</button>
        {busy && <button type="button" className="danger-button" onClick={cancel}>Cancel</button>}
      </div>

      {notice.text && <div className={`status-message ${notice.type}`}>{notice.text}</div>}

      {progress && (
        <div className="dictionary-progress">
          <progress max="1" value={progress.ratio || 0} />
          <span>{progress.sent.toLocaleString()} / {progress.total.toLocaleString()} entries ({Math.round((progress.ratio || 0) * 100)}%)</span>
        </div>
      )}

      {preview && (
        <div className="dictionary-preview">
          <strong>{preview.metadata.title}</strong>
          <span>{preview.metadata.entryCount.toLocaleString()} entries · {preview.metadata.dictionaryType}</span>
          <span>Revision: {preview.metadata.revision || preview.metadata.version || 'not supplied'}</span>
          <span>Update source: {preview.metadata.updateManifestUrl || 'not supplied'}</span>
          <button type="button" disabled={busy} onClick={installPreview}>
            {dictionaries.some(item => item.stableIdentity === preview.metadata.stableIdentity) ? 'Update existing dictionary' : 'Install dictionary'}
          </button>
        </div>
      )}

      <div className="dictionary-list">
        {dictionaries.map(dictionary => {
          const update = updates[dictionary.dictionaryId];
          return (
            <article className="dictionary-row" key={dictionary.dictionaryId}>
              <div className="dictionary-row-main">
                <strong>{dictionary.displayTitle}</strong>
                <span>{dictionary.entryCount.toLocaleString()} entries · {dictionary.dictionaryType} · revision {dictionary.revision || dictionary.version || 'unknown'}</span>
                <span className="dictionary-identity">{dictionary.stableIdentity}</span>
                {dictionary.updateManifestUrl && <span className="dictionary-source">Update source configured</span>}
              </div>
              <div className="dictionary-row-actions">
                <span className={`dictionary-update-state ${update?.status || ''}`}>{statusLabel(update?.status)}</span>
                <button type="button" className="secondary" disabled={busy || !dictionary.updateManifestUrl} onClick={() => checkOne(dictionary)}>Check</button>
                {update?.updateAvailable && update?.manifest?.downloadUrl && (
                  <button type="button" disabled={busy} onClick={() => applyOnlineUpdate(dictionary)}>Update</button>
                )}
                <label className="dictionary-replace-button">
                  Replace ZIP
                  <input type="file" accept=".zip,application/zip" disabled={busy} onChange={event => inspectFile(event.target.files?.[0])} />
                </label>
                <label className="dictionary-replace-button">
                  {dictionary.updateManifestUrl ? 'Change update source' : 'Link update source'}
                  <input type="file" accept=".zip,application/zip" disabled={busy} onChange={event => linkMetadata(dictionary, event.target.files?.[0])} />
                </label>
                <button type="button" className="danger-button" disabled={busy} onClick={() => removeDictionary(dictionary)}>Remove</button>
              </div>
            </article>
          );
        })}
        {management && dictionaries.length === 0 && <div className="dictionary-empty">No dictionaries installed.</div>}
      </div>
    </div>
  );
}
