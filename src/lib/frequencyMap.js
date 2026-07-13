/**
 * Frequency map.
 *
 * Responsibility:
 * - Load local Yomitan-style frequency dictionaries from /public/dict/.
 * - Combine dictionary ranks into one global frequency map.
 * - Provide frequency category lookup for reader word coloring.
 *
 * Expected dictionary files:
 * - public/dict/jpdb.json
 * - public/dict/jiten.json
 * - public/dict/cc100.json
 * - public/dict/bccwj.json
 */

let globalMap = null;
let loadPromise = null;

const DB_NAME = 'novel-audio-miner';
const DB_VERSION = 3;
const STORE_NAME = 'globalFreq';
const GLOBAL_FREQUENCY_KEY = 'globalFrequency';

const DICT_NAMES = ['jpdb', 'jiten', 'cc100', 'bccwj'];

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (db.objectStoreNames.contains(STORE_NAME)) db.deleteObjectStore(STORE_NAME);
      db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = (event) => resolve(event.target.result);
  });
}

async function loadCachedGlobalMap() {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(GLOBAL_FREQUENCY_KEY);

      request.onsuccess = () => resolve(request.result ? new Map(request.result) : null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

async function saveGlobalMap(map) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    store.put([...map.entries()], GLOBAL_FREQUENCY_KEY);

    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return undefined;
  }
}

function readFrequencyRank(payload) {
  if (typeof payload !== 'object' || payload === null) return null;

  if (typeof payload.value === 'number') return payload.value;
  if (typeof payload.frequency === 'number') return payload.frequency;
  if (payload.frequency && typeof payload.frequency === 'object' && typeof payload.frequency.value === 'number') {
    return payload.frequency.value;
  }

  return null;
}

function parseFrequencyArray(entries) {
  const map = new Map();

  for (const entry of entries) {
    if (!Array.isArray(entry) || entry.length < 3) continue;

    const [surface, type, payload] = entry;
    if (type !== 'freq') continue;

    const rank = readFrequencyRank(payload);
    if (rank == null || rank <= 0) continue;

    const existing = map.get(surface);
    if (existing === undefined || rank < existing) {
      map.set(surface, rank);
    }
  }

  return map;
}

async function fetchDictionary(name) {
  const response = await fetch(`/dict/${name}.json`);
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${name}`);

  const data = await response.json();
  return parseFrequencyArray(data);
}

function harmonicMean(ranks) {
  if (!ranks || ranks.length === 0) return null;

  let reciprocalSum = 0;
  for (const rank of ranks) reciprocalSum += 1 / rank;

  return Math.round(ranks.length / reciprocalSum);
}

async function loadDictionaryMaps() {
  const dictMaps = {};

  for (const name of DICT_NAMES) {
    try {
      dictMaps[name] = await fetchDictionary(name);
    } catch (error) {
      console.warn(`[Freq] Could not load ${name}:`, error.message);
      dictMaps[name] = new Map();
    }
  }

  return dictMaps;
}

function collectAllWords(dictMaps) {
  const words = new Set();

  for (const name of DICT_NAMES) {
    for (const word of dictMaps[name].keys()) words.add(word);
  }

  return words;
}

function combineDictionaryMaps(dictMaps) {
  const combined = new Map();

  for (const word of collectAllWords(dictMaps)) {
    const ranks = [];

    for (const name of DICT_NAMES) {
      const rank = dictMaps[name].get(word);
      if (rank) ranks.push(rank);
    }

    const meanRank = harmonicMean(ranks);
    if (meanRank) combined.set(word, meanRank);
  }

  return combined;
}

async function buildGlobalMap() {
  const dictMaps = await loadDictionaryMaps();
  const combined = combineDictionaryMaps(dictMaps);
  await saveGlobalMap(combined);
  return combined;
}

async function ensureGlobalMap() {
  const cached = await loadCachedGlobalMap();

  if (cached && cached.size > 0) {
    globalMap = cached;
    return;
  }

  globalMap = await buildGlobalMap();
}

function getCategory(rank) {
  if (!rank || rank <= 0) return 'unlisted';
  if (rank <= 4000) return 'very-common';
  if (rank <= 10000) return 'common';
  if (rank <= 20000) return 'uncommon';
  return 'rare';
}

export function startLoadingGlobalFrequency() {
  if (loadPromise) return loadPromise;

  loadPromise = ensureGlobalMap().catch((error) => {
    console.warn('[Freq] Failed to build global map:', error);
    globalMap = new Map();
  });

  return loadPromise;
}

export function getFrequency(word) {
  if (!globalMap) return null;

  const rank = globalMap.get(word);
  if (rank === undefined) return null;

  return { rank, category: getCategory(rank) };
}
