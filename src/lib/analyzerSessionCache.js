export const MAX_ANALYZER_SESSION_CACHE_ENTRIES = 50;

export class AnalyzerSessionCache {
  constructor(limit = MAX_ANALYZER_SESSION_CACHE_ENTRIES) {
    this.limit = Math.max(1, Number.isInteger(limit) ? limit : MAX_ANALYZER_SESSION_CACHE_ENTRIES);
    this.records = new Map();
    this.protectedIdentities = new Set();
    this.clock = 0;
    this.evictionCount = 0;
  }
  get size() { return this.records.size; }
  get(identity) {
    const entry = this.records.get(identity);
    if (!entry) return undefined;
    entry.access = ++this.clock;
    return entry.record;
  }
  set(identity, record) {
    this.records.set(identity, { record, access: ++this.clock });
    this.evict();
    return this;
  }
  delete(identity) { return this.records.delete(identity); }
  clear() { this.records.clear(); this.protectedIdentities.clear(); }
  has(identity) { return this.records.has(identity); }
  setProtected(identities) {
    this.protectedIdentities = new Set((identities || []).filter(Boolean));
    this.evict();
  }
  evict() {
    while (this.records.size > this.limit) {
      const candidate = [...this.records.entries()]
        .filter(([identity]) => !this.protectedIdentities.has(identity))
        .sort((left, right) => left[1].access - right[1].access)[0];
      if (!candidate) break;
      this.records.delete(candidate[0]);
      this.evictionCount += 1;
    }
  }
  snapshot() {
    return {
      size: this.records.size,
      limit: this.limit,
      protectedCount: [...this.protectedIdentities].filter(identity => this.records.has(identity)).length,
      evictionCount: this.evictionCount,
      identities: [...this.records.keys()]
    };
  }
}
