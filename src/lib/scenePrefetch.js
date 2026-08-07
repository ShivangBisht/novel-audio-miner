const DEFAULT_FORWARD_LIMIT = 10;
const HIGH_PRIORITY_FORWARD_COUNT = 5;

function normalizeText(value) {
  return String(value ?? '').trim();
}

function getTextScene(item) {
  if (!item || item.type !== 'scene') return null;
  const text = normalizeText(item.data?.plainText);
  return text ? { text, data: item.data } : null;
}

function collectDirection(items, currentIndex, step, limit) {
  const targets = [];
  for (
    let index = currentIndex + step;
    index >= 0 && index < items.length && targets.length < limit;
    index += step
  ) {
    const scene = getTextScene(items[index]);
    if (!scene) continue;
    targets.push({
      index,
      text: scene.text,
      direction: step > 0 ? 'next' : 'previous',
      textDistance: targets.length + 1
    });
  }
  return targets;
}

function withPriority(target, queuePriority, priorityClass) {
  return { ...target, queuePriority, priorityClass };
}

export function planRollingTextScenePrefetch(
  items,
  currentIndex,
  { forwardLimit = DEFAULT_FORWARD_LIMIT } = {}
) {
  const source = Array.isArray(items) ? items : [];
  const safeIndex = Number.isInteger(currentIndex) ? currentIndex : -1;
  const safeLimit = Math.max(0, Number.isInteger(forwardLimit) ? forwardLimit : DEFAULT_FORWARD_LIMIT);
  const forward = collectDirection(source, safeIndex, 1, safeLimit);
  const previous = collectDirection(source, safeIndex, -1, 1)[0] ?? null;
  const candidates = [];
  const firstForward = forward.slice(0, HIGH_PRIORITY_FORWARD_COUNT);
  const remainingForward = forward.slice(HIGH_PRIORITY_FORWARD_COUNT);
  firstForward.forEach((target, offset) => {
    candidates.push(withPriority(target, offset + 1, 'forward-near'));
  });
  if (previous) {
    candidates.push(withPriority(previous, HIGH_PRIORITY_FORWARD_COUNT + 1, 'previous-protection'));
  }
  remainingForward.forEach((target, offset) => {
    candidates.push(withPriority(
      target,
      HIGH_PRIORITY_FORWARD_COUNT + 2 + offset,
      'forward-window'
    ));
  });

  const seenText = new Set();
  const ordered = candidates.filter(target => {
    if (seenText.has(target.text)) return false;
    seenText.add(target.text);
    return true;
  });

  return {
    currentIndex: safeIndex,
    forwardLimit: safeLimit,
    forward,
    previous,
    ordered,
    texts: ordered.map(target => target.text)
  };
}

// Backwards-compatible Phase 3 API. New Reader code uses the rolling planner.
export function findAdjacentTextScenes(items, currentIndex) {
  const plan = planRollingTextScenePrefetch(items, currentIndex, { forwardLimit: 1 });
  const next = plan.forward[0] ?? null;
  const previous = plan.previous;
  const seen = new Set();
  const ordered = [];
  for (const target of [next, previous]) {
    if (!target || seen.has(target.text)) continue;
    seen.add(target.text);
    ordered.push(target);
  }
  return { next, previous, ordered };
}

export {
  DEFAULT_FORWARD_LIMIT,
  HIGH_PRIORITY_FORWARD_COUNT
};
