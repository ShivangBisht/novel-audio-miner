/**
 * AnkiConnect client.
 *
 * Responsibility:
 * - Send JSON-RPC style requests to the local AnkiConnect endpoint.
 * - Check AnkiConnect availability.
 * - Find the latest note of a configured note type.
 * - Update note fields.
 *
 * Media upload/download orchestration belongs in Reader.jsx and enrichment helpers.
 */

const ANKI_URL = 'http://127.0.0.1:8765';
const ANKI_CONNECT_VERSION = 6;

function escapeAnkiQueryValue(value) {
  return String(value || '').replace(/"/g, '\"');
}

export async function ankiRequest(action, params = {}) {
  const response = await fetch(ANKI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      version: ANKI_CONNECT_VERSION,
      params
    })
  });

  if (!response.ok) throw new Error(`AnkiConnect HTTP ${response.status}`);

  const data = await response.json();
  if (data.error) throw new Error(data.error);

  return data.result;
}

export async function checkAnkiConnect() {
  const version = await ankiRequest('version');
  return { ok: true, version };
}

export async function findLatestNote(noteType = 'Kiku') {
  const safeNoteType = escapeAnkiQueryValue(noteType);
  const query = `note:"${safeNoteType}" added:1`;
  const ids = await ankiRequest('findNotes', { query });

  if (!ids.length) return { query, note: null, ids: [] };

  const sorted = [...ids].sort((a, b) => Number(b) - Number(a));
  const notes = await ankiRequest('notesInfo', { notes: [sorted[0]] });

  return { query, note: notes[0] || null, ids: sorted };
}

export async function updateNoteFields(noteId, fields) {
  return ankiRequest('updateNoteFields', {
    note: {
      id: noteId,
      fields
    }
  });
}
