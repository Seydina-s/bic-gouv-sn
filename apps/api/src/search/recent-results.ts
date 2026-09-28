/**
 * Results kept for a short time and a bounded number of queries: a search repeated
 * by many people at once (after a Council of Ministers) is computed once a minute,
 * not once per person. A search still being computed is shared too, so a burst of
 * identical requests computes it once. As fresh as the public cache of the same
 * answers (60 s). A failed computation is not kept.
 */
export class RecentResults<V> {
  private readonly results = new Map<string, { value: Promise<V>; until: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly max: number,
    private readonly now: () => number = Date.now,
  ) {}

  get(key: string, compute: () => Promise<V>): Promise<V> {
    const known = this.results.get(key);
    if (known !== undefined && known.until > this.now()) {
      return known.value;
    }
    this.results.delete(key);
    if (this.results.size >= this.max) {
      // The oldest query gives way (a Map keeps insertion order).
      const [oldest] = this.results.keys();
      if (oldest !== undefined) {
        this.results.delete(oldest);
      }
    }
    const value = compute();
    const entry = { value, until: this.now() + this.ttlMs };
    this.results.set(key, entry);
    value.catch(() => {
      if (this.results.get(key) === entry) {
        this.results.delete(key);
      }
    });
    return value;
  }
}
