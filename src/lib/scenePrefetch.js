function normalizeText(value) {
  return String(value ?? '').trim();
}

function getTextScene(item) {
  if (!item || item.type !== 'scene') return null;
  const text = normalizeText(item.data?.plainText);
  return text ? { text, data: item.data } : null;
}

function findInDirection(items, currentIndex, step) {
  for (let index = currentIndex + step; index >= 0 && index < items.length; index += step) {
    const scene = getTextScene(items[index]);
    if (scene) {
      return {
        index,
        text: scene.text,
        direction: step > 0 ? 'next' : 'previous'
      };
    }
  }
  return null;
}

export function findAdjacentTextScenes(items, currentIndex) {
  const source = Array.isArray(items) ? items : [];
  const safeIndex = Number.isInteger(currentIndex) ? currentIndex : -1;
  const next = findInDirection(source, safeIndex, 1);
  const previous = findInDirection(source, safeIndex, -1);
  const seen = new Set();
  const ordered = [];

  for (const target of [next, previous]) {
    if (!target || seen.has(target.text)) continue;
    seen.add(target.text);
    ordered.push(target);
  }

  return { next, previous, ordered };
}
