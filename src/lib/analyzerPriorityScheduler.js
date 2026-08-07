export class AnalyzerPriorityScheduler {
  constructor(worker) {
    if (typeof worker !== 'function') throw new Error('Scheduler worker is required.');
    this.worker = worker;
    this.queue = [];
    this.entries = new Map();
    this.active = null;
    this.sequence = 0;
    this.session = 0;
    this.metrics = { started: 0, completed: 0, failed: 0, promoted: 0, coalesced: 0, staleRemoved: 0 };
  }
  schedule({ identity, text, priority = 0, kind = 'foreground', planId = null }) {
    if (!identity) return Promise.reject(new Error('Scheduler identity is required.'));
    const existing = this.entries.get(identity);
    if (existing) {
      this.metrics.coalesced += 1;
      if (priority < existing.priority && existing.state === 'queued') {
        existing.priority = priority;
        existing.kind = kind;
        existing.planId = planId;
        this.metrics.promoted += 1;
        this._sort();
      }
      return existing.promise;
    }
    const session = this.session;
    let resolvePromise, rejectPromise;
    const promise = new Promise((resolve, reject) => { resolvePromise = resolve; rejectPromise = reject; });
    const entry = { identity, text, priority, kind, planId, session, sequence: this.sequence++, state: 'queued', promise, resolve: resolvePromise, reject: rejectPromise };
    this.entries.set(identity, entry);
    this.queue.push(entry);
    this._sort();
    this._drain();
    return promise;
  }
  replaceSpeculativePlan(planId, identities) {
    const keep = new Set(identities || []);
    const retained = [];
    for (const entry of this.queue) {
      if (entry.kind === 'prefetch' && entry.planId !== planId && !keep.has(entry.identity)) {
        this.entries.delete(entry.identity);
        entry.reject(new DOMException('Stale speculative request removed.', 'AbortError'));
        this.metrics.staleRemoved += 1;
      } else retained.push(entry);
    }
    this.queue = retained;
  }
  clear() {
    this.session += 1;
    const error = new DOMException('Analyzer Reader session closed.', 'AbortError');
    for (const entry of this.queue) { this.entries.delete(entry.identity); entry.reject(error); }
    this.queue = [];
  }
  snapshot() {
    return { active: this.active ? { identity: this.active.identity, kind: this.active.kind, priority: this.active.priority } : null,
      queued: this.queue.map(e => ({ identity: e.identity, kind: e.kind, priority: e.priority })),
      activeCount: this.active ? 1 : 0, queuedCount: this.queue.length, ...this.metrics };
  }
  _sort() { this.queue.sort((a,b) => a.priority-b.priority || a.sequence-b.sequence); }
  async _drain() {
    if (this.active || !this.queue.length) return;
    const entry = this.queue.shift(); this.active = entry; entry.state = 'active'; this.metrics.started += 1;
    try {
      const value = await this.worker(entry.text);
      this.metrics.completed += 1; entry.resolve(value);
    } catch (error) { this.metrics.failed += 1; entry.reject(error); }
    finally {
      this.entries.delete(entry.identity); this.active = null; this._drain();
    }
  }
}
