/**
 * Reader progress storage.
 *
 * Responsibility:
 * - Persist per-book reader state in localStorage.
 * - Return null if progress cannot be read safely.
 *
 * This module intentionally stores only UI/reader progress, not vocabulary data.
 * Known-word data belongs in wordCache.js.
 */

const PREFIX = 'novel-audio-miner:';

function progressKey(id) {
  return id ? `${PREFIX}${id}` : '';
}

export function saveProgress(id, state) {
  const key = progressKey(id);
  if (!key) return;

  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore storage failures. Reader progress is useful but non-critical.
  }
}

export function getProgress(id) {
  const key = progressKey(id);
  if (!key) return null;

  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
