/** Alpha 5 latest-Kiku-note enrichment operation. */
import { checkAnkiConnect, findLatestNote, updateNoteFields, ankiRequest } from './ankiConnect.js';
import { autoEnrichWordWithFallback, generateVoicevoxAudio } from './enrichService.js';

function text(value) { return String(value ?? '').trim(); }
function operationId(now) { return `enrich-${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`; }
export function readPinnedNoteExpression(note, expressionField = 'Expression') {
  return text(note?.fields?.[expressionField]?.value);
}
export function comparePinnedTarget(selectedLookupIdentity, pinnedExpression) {
  const selected = text(selectedLookupIdentity);
  const expression = text(pinnedExpression);
  if (!expression) return Object.freeze({ status: 'unavailable', selected, expression, warning: 'The pinned note has no readable expression.' });
  if (selected === expression) return Object.freeze({ status: 'match', selected, expression, warning: null });
  return Object.freeze({ status: 'mismatch', selected, expression, warning: `Selected lookup “${selected}” differs from pinned Kiku expression “${expression}”.` });
}
function emit(onEvent, state, patch) {
  Object.assign(state, patch, { updatedAt: new Date().toISOString() });
  onEvent?.(Object.freeze({ ...state, pinnedTarget: state.pinnedTarget ? Object.freeze({ ...state.pinnedTarget }) : null, comparison: state.comparison ? Object.freeze({ ...state.comparison }) : null }));
}
export async function runLatestKikuEnrichment(options, dependencies = {}) {
  const deps = {
    checkAnkiConnect, findLatestNote, updateNoteFields, ankiRequest,
    autoEnrichWordWithFallback, generateVoicevoxAudio,
    now: () => new Date(), ...dependencies
  };
  const started = deps.now();
  const state = {
    schemaVersion: '1.0', operationId: operationId(started), status: 'running', stage: 'start',
    startedAt: started.toISOString(), updatedAt: started.toISOString(), selectedLookupIdentity: text(options.lookupIdentity),
    readerInteraction: options.readerInteraction || null, sceneIdentity: options.sceneIdentity || null,
    chapterIdentity: options.chapterIdentity || null, noteType: text(options.noteType || 'Kiku'),
    pinnedTarget: null, comparison: null, preparedFields: null, media: {}, verification: null, result: null, outcome: null, error: null
  };
  const onEvent = options.onEvent;
  emit(onEvent, state, {});
  try {
    emit(onEvent, state, { stage: 'checkAnkiConnect' });
    await deps.checkAnkiConnect();
    emit(onEvent, state, { stage: 'findLatestNote' });
    const discovery = await deps.findLatestNote(state.noteType); // exactly once
    if (!discovery?.note) throw new Error(`No ${state.noteType} note found.`);
    const noteId = discovery.note.noteId;
    if (noteId == null || noteId === '') throw new Error('Latest note has no note ID.');
    const expression = readPinnedNoteExpression(discovery.note, options.expressionField || 'Expression');
    state.pinnedTarget = { noteId, noteType: state.noteType, expression, query: discovery.query || '', discoveredCount: discovery.ids?.length ?? null };
    state.comparison = comparePinnedTarget(state.selectedLookupIdentity, expression);
    const originalFields = Object.fromEntries(
      Object.entries(discovery.note.fields || {}).map(([name, field]) => [name, String(field?.value ?? '')])
    );
    emit(onEvent, state, { stage: 'targetPinned' });

    emit(onEvent, state, { stage: 'enrichment' });
    const result = await deps.autoEnrichWordWithFallback(state.selectedLookupIdentity, options.novelSentence, deps.ankiRequest, state.noteType, message => emit(onEvent, state, { stage: message }));
    state.result = result;
    emit(onEvent, state, { stage: 'media' });
    const fields = options.fields;
    const updates = {
      [fields.sentence]: result.sentence,
      [fields.sentenceFurigana]: result.sentenceFurigana || result.sentence,
      [fields.miscInfo]: [options.bookTitle, options.chapterTitle].filter(Boolean).join(' · ')
    };
    if (fields.selectionText && options.novelSentence) updates[fields.selectionText] = options.novelSentence;
    if (result.method === 'voicevox') {
      try { const audio = await deps.generateVoicevoxAudio(options.novelSentence); await deps.ankiRequest('storeMediaFile', { filename: audio.filename, data: audio.audioBase64 }); updates[fields.sentenceAudio] = `[sound:${audio.filename}]`; state.media.sentenceAudio = updates[fields.sentenceAudio]; }
      catch (error) { state.media.voicevoxError = error?.message || String(error); }
    } else if (result.audioUrl) {
      try { const filename = `nade_audio_${Date.now()}.mp3`; const stored = await deps.ankiRequest('storeMediaFile', { filename, url: result.audioUrl });
        if (stored !== filename) throw new Error(`Anki stored unexpected audio filename: ${stored || '(empty)'}`);
        updates[fields.sentenceAudio] = `[sound:${filename}]`; state.media.sentenceAudio = updates[fields.sentenceAudio]; }
      catch (error) { state.media.audioError = error?.message || String(error); }
    }
    if (result.method !== 'voicevox' && result.imageUrl) {
      try { const filename = `nade_img_${Date.now()}.jpg`; const stored = await deps.ankiRequest('storeMediaFile', { filename, url: result.imageUrl });
        if (stored !== filename) throw new Error(`Anki stored unexpected image filename: ${stored || '(empty)'}`);
        updates[fields.picture] = `<img src="${filename}">`; state.media.picture = updates[fields.picture]; }
      catch (error) { state.media.imageError = error?.message || String(error); }
    }
    state.preparedFields = updates;
    emit(onEvent, state, { stage: 'updateNoteFields' });
    await deps.updateNoteFields(noteId, updates); // pinned ID only
    emit(onEvent, state, { stage: 'verifyNoteFields' });
    const refreshedNotes = await deps.ankiRequest('notesInfo', { notes: [noteId] });
    const refreshed = refreshedNotes?.[0];
    if (!refreshed) throw new Error('Pinned note could not be re-read after update.');
    const checks = {};
    for (const [fieldName, expectedValue] of Object.entries(updates)) {
      checks[fieldName] = String(refreshed.fields?.[fieldName]?.value ?? '') === String(expectedValue ?? '');
    }
    state.verification = checks;
    if (!checks[fields.sentence]) throw new Error('Sentence field verification failed.');
    const enrichmentFields = new Set(Object.keys(updates));
    const protectedChanges = {};
    for (const [fieldName, originalValue] of Object.entries(originalFields)) {
      if (enrichmentFields.has(fieldName)) continue;
      const currentValue = String(refreshed.fields?.[fieldName]?.value ?? '');
      if (currentValue !== originalValue) {
        protectedChanges[fieldName] = { before: originalValue, after: currentValue };
      }
    }
    state.protectedFieldVerification = {
      checkedCount: Object.keys(originalFields).filter(name => !enrichmentFields.has(name)).length,
      unchanged: Object.keys(protectedChanges).length === 0,
      changedFields: Object.keys(protectedChanges)
    };
    if (Object.keys(protectedChanges).length) {
      const restoreFields = Object.fromEntries(
        Object.entries(protectedChanges).map(([name, values]) => [name, values.before])
      );
      await deps.updateNoteFields(noteId, restoreFields);
      throw new Error(`Protected Yomitan fields changed and were restored: ${Object.keys(protectedChanges).join(', ')}`);
    }
    const mediaErrors = [state.media.audioError, state.media.imageError, state.media.voicevoxError].filter(Boolean);
    const missingRequestedMedia = [
      result.audioUrl && !updates[fields.sentenceAudio] ? 'audio' : null,
      result.imageUrl && !updates[fields.picture] ? 'image' : null
    ].filter(Boolean);
    const verificationFailures = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
    state.outcome = mediaErrors.length || missingRequestedMedia.length || verificationFailures.length || result.method === 'voicevox'
      ? 'partial'
      : 'complete';
    try { await deps.ankiRequest('guiBrowse', { query: `nid:${noteId}` }); } catch (error) { state.media.guiBrowseError = error?.message || String(error); }
    emit(onEvent, state, { status: state.outcome === 'complete' ? 'completed' : 'partial', stage: 'done', updatedNoteId: noteId });
    return Object.freeze({ ...state, pinnedTarget: Object.freeze({ ...state.pinnedTarget }), comparison: Object.freeze({ ...state.comparison }), preparedFields: Object.freeze({ ...updates }), media: Object.freeze({ ...state.media }) });
  } catch (error) {
    emit(onEvent, state, { status: 'error', stage: 'failed', error: error?.message || String(error) });
    throw Object.assign(error instanceof Error ? error : new Error(String(error)), { enrichmentOperation: Object.freeze({ ...state }) });
  }
}
