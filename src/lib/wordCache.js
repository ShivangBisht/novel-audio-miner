/**
 * Known Words Cache v3.1
 *
 * Separates Anki-derived known words from words manually marked known in
 * Novel Audio Miner.
 *
 * - Anki cache can be cleared/rebuilt safely.
 * - Manual known words persist until explicitly removed.
 * - Known word count is the union of Anki known + manual known.
 */

const ANKI_CACHE_KEY = 'novel-audio-miner:ankiWordCache';
const MANUAL_KNOWN_KEY = 'novel-audio-miner:manualKnownWords';
const LEGACY_CACHE_KEY = 'novel-audio-miner:wordCache';
const CACHE_VERSION = 3;
const CACHE_TTL_DAYS = 7;

const NOTE_TYPE_FIELDS = {
  'Kaishi 1.5k': 'Word',
  'JP1Kv3': 'Word',
  'ImmersionKitCard': 'Word',
  'Kiku': 'Expression'
};

let ankiCache = null;
let manualKnownCache = null;

function loadSet(key, { ttl = false } = {}) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== CACHE_VERSION) return null;
    if (ttl) {
      const age = Date.now() - (data.timestamp || 0);
      if (age > CACHE_TTL_DAYS * 24 * 60 * 60 * 1000) return null;
    }
    return new Set(data.words || []);
  } catch {
    return null;
  }
}

function saveSet(key, wordsSet) {
  try {
    localStorage.setItem(key, JSON.stringify({
      version: CACHE_VERSION,
      timestamp: Date.now(),
      words: [...wordsSet]
    }));
  } catch {
    console.warn(`[WordCache] Could not save ${key} to localStorage`);
  }
}

function loadManualKnownWords() {
  if (manualKnownCache) return manualKnownCache;
  manualKnownCache = loadSet(MANUAL_KNOWN_KEY) || new Set();
  return manualKnownCache;
}

function loadAnkiCache() {
  if (ankiCache) return ankiCache;
  ankiCache = loadSet(ANKI_CACHE_KEY, { ttl: true });
  return ankiCache;
}

function getUnionKnownWords() {
  const anki = loadAnkiCache() || new Set();
  const manual = loadManualKnownWords();
  return new Set([...anki, ...manual]);
}

export async function getKnownWords(ankiRequestFn, onProgress) {
  const cachedAnki = loadAnkiCache();
  loadManualKnownWords();
  if (cachedAnki && cachedAnki.size > 0) {
    console.log('[WordCache] Loaded Anki cache:', cachedAnki.size, 'manual:', manualKnownCache.size);
    return getUnionKnownWords();
  }
  return buildCache(ankiRequestFn, onProgress);
}

export async function buildCache(ankiRequestFn, onProgress) {
  console.log('[WordCache] Building Anki cache...');
  const words = new Set();

  for (const [noteType, fieldName] of Object.entries(NOTE_TYPE_FIELDS)) {
    if (onProgress) onProgress(`Reading ${noteType} cards...`);
    try {
      const noteIds = await ankiRequestFn('findNotes', { query: `note:\"${noteType}\"` });
      console.log(`[WordCache] ${noteType}: ${noteIds.length} notes found`);
      if (!noteIds.length) continue;

      for (let i = 0; i < noteIds.length; i += 500) {
        if (onProgress) onProgress(`Reading ${noteType}: ${Math.min(i + 500, noteIds.length)} / ${noteIds.length}`);
        const batch = noteIds.slice(i, i + 500);
        const notes = await ankiRequestFn('notesInfo', { notes: batch });

        for (const note of notes) {
          const value = note.fields?.[fieldName]?.value || '';
          const trimmed = value.trim();
          if (trimmed) words.add(trimmed);
        }
      }
    } catch (err) {
      console.warn(`[WordCache] Failed to read \"${noteType}\":`, err.message);
    }
  }

  ankiCache = words;
  saveSet(ANKI_CACHE_KEY, ankiCache);
  loadManualKnownWords();
  console.log('[WordCache] Built Anki:', ankiCache.size, 'manual:', manualKnownCache.size, 'total:', getUnionKnownWords().size);
  return getUnionKnownWords();
}

export function addManualKnownWord(word) {
  if (!word || typeof word !== 'string') return false;
  const trimmed = word.trim();
  if (!trimmed) return false;
  const manual = loadManualKnownWords();
  if (manual.has(trimmed)) return false;
  manual.add(trimmed);
  saveSet(MANUAL_KNOWN_KEY, manual);
  console.log('[WordCache] Added manual known:', trimmed, 'manual:', manual.size, 'total:', getUnionKnownWords().size);
  return true;
}

// Backward-compatible name. Manual UI and post-mining updates should persist.
export function addKnownWord(word) {
  addManualKnownWord(word);
}

export function removeManualKnownWord(word) {
  if (!word || typeof word !== 'string') return false;
  const trimmed = word.trim();
  if (!trimmed) return false;
  const manual = loadManualKnownWords();
  if (!manual.has(trimmed)) return false;
  manual.delete(trimmed);
  saveSet(MANUAL_KNOWN_KEY, manual);
  console.log('[WordCache] Removed manual known:', trimmed, 'manual:', manual.size, 'total:', getUnionKnownWords().size);
  return true;
}

export function isManualKnownWord(word) {
  if (!word || typeof word !== 'string') return false;
  return loadManualKnownWords().has(word.trim());
}

export function isAnkiKnownWord(word) {
  if (!word || typeof word !== 'string') return false;
  const anki = loadAnkiCache();
  return !!anki && anki.has(word.trim());
}

export function isKnownWord(word) {
  if (!word || typeof word !== 'string') return false;
  const trimmed = word.trim();
  if (!trimmed) return false;
  return isManualKnownWord(trimmed) || isAnkiKnownWord(trimmed);
}

export function getManualKnownWords() {
  return new Set(loadManualKnownWords());
}

// Important: return union size, not just Anki cache size and not anki+manual sum.
// This makes the status-bar count include persistent manual-known words while
// avoiding double-counting words that exist in both Anki and manual known.
export function getCacheSize() {
  return getUnionKnownWords().size;
}

export function getCacheStats() {
  const anki = loadAnkiCache() || new Set();
  const manual = loadManualKnownWords();
  return {
    anki: anki.size,
    manual: manual.size,
    total: getUnionKnownWords().size
  };
}

// Clears only the Anki-derived cache. Manual known words are preserved.
export function clearCache() {
  ankiCache = null;
  try {
    localStorage.removeItem(ANKI_CACHE_KEY);
    localStorage.removeItem(LEGACY_CACHE_KEY);
  } catch {}
  console.log('[WordCache] Cleared Anki cache. Manual known words preserved.');
}

export function clearManualKnownWords() {
  manualKnownCache = new Set();
  saveSet(MANUAL_KNOWN_KEY, manualKnownCache);
  console.log('[WordCache] Cleared manual known words.');
}
