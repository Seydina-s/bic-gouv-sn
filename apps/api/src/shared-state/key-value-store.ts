import type { Redis } from "ioredis";

/**
 * Short-lived state the API instances share (SCALE-01): console sessions and
 * sign-in steps, idempotency keys. Every key expires by itself. In memory for a
 * single instance (development); in Redis when several instances run.
 */
export interface KeyValueStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: number): Promise<void>;
  /** Sets only when the key is absent (atomic across instances); false otherwise. */
  setIfAbsent(key: string, value: string, ttlMs: number): Promise<boolean>;
  delete(key: string): Promise<void>;
  /** Adds a member to a set that expires (e.g. the sessions of one account). */
  addToSet(key: string, member: string, ttlMs: number): Promise<void>;
  membersOf(key: string): Promise<string[]>;
  /**
   * Adds `by` (one by default) to a counter, atomically across instances, and
   * returns its new value.
   * The expiry is set when the counter starts, never pushed back afterwards.
   */
  increment(key: string, ttlMs: number, by?: number): Promise<number>;
  close(): Promise<void>;
}

interface Entry {
  value: string | Set<string>;
  expiresAt: number;
}

/** Writes between two sweeps of the expired keys (memory stays bounded by the TTLs). */
const SWEEP_EVERY = 1000;

/** One instance only: the state lives in this process (lost on restart). */
export class MemoryKeyValueStore implements KeyValueStore {
  private readonly entries = new Map<string, Entry>();
  private writes = 0;

  constructor(private readonly now: () => number = Date.now) {}

  /** Expired keys nobody reads again are dropped now and then. */
  private written(): void {
    this.writes += 1;
    if (this.writes % SWEEP_EVERY !== 0) {
      return;
    }
    const now = this.now();
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.entries.delete(key);
      }
    }
  }

  private live(key: string): Entry | undefined {
    const entry = this.entries.get(key);
    if (entry !== undefined && entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry;
  }

  get(key: string): Promise<string | null> {
    const value = this.live(key)?.value;
    return Promise.resolve(typeof value === "string" ? value : null);
  }

  set(key: string, value: string, ttlMs: number): Promise<void> {
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
    this.written();
    return Promise.resolve();
  }

  setIfAbsent(key: string, value: string, ttlMs: number): Promise<boolean> {
    if (this.live(key) !== undefined) {
      return Promise.resolve(false);
    }
    this.entries.set(key, { value, expiresAt: this.now() + ttlMs });
    this.written();
    return Promise.resolve(true);
  }

  delete(key: string): Promise<void> {
    this.entries.delete(key);
    return Promise.resolve();
  }

  addToSet(key: string, member: string, ttlMs: number): Promise<void> {
    const current = this.live(key)?.value;
    const members = current instanceof Set ? current : new Set<string>();
    members.add(member);
    this.entries.set(key, { value: members, expiresAt: this.now() + ttlMs });
    this.written();
    return Promise.resolve();
  }

  membersOf(key: string): Promise<string[]> {
    const value = this.live(key)?.value;
    return Promise.resolve(value instanceof Set ? [...value] : []);
  }

  increment(key: string, ttlMs: number, by = 1): Promise<number> {
    const entry = this.live(key);
    const count = (typeof entry?.value === "string" ? Number(entry.value) || 0 : 0) + by;
    const expiresAt = entry?.expiresAt ?? this.now() + ttlMs;
    this.entries.set(key, { value: String(count), expiresAt });
    this.written();
    return Promise.resolve(count);
  }

  close(): Promise<void> {
    this.entries.clear();
    return Promise.resolve();
  }
}

/** Several instances: the state lives in Redis, keys under one prefix. */
export class RedisKeyValueStore implements KeyValueStore {
  constructor(
    private readonly redis: Redis,
    private readonly prefix = "bgs:",
  ) {}

  private key(key: string): string {
    return this.prefix + key;
  }

  get(key: string): Promise<string | null> {
    return this.redis.get(this.key(key));
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    await this.redis.set(this.key(key), value, "PX", Math.max(1, Math.round(ttlMs)));
  }

  async setIfAbsent(key: string, value: string, ttlMs: number): Promise<boolean> {
    const done = await this.redis.set(
      this.key(key),
      value,
      "PX",
      Math.max(1, Math.round(ttlMs)),
      "NX",
    );
    return done === "OK";
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(this.key(key));
  }

  async addToSet(key: string, member: string, ttlMs: number): Promise<void> {
    await this.redis
      .multi()
      .sadd(this.key(key), member)
      .pexpire(this.key(key), Math.max(1, Math.round(ttlMs)))
      .exec();
  }

  membersOf(key: string): Promise<string[]> {
    return this.redis.smembers(this.key(key));
  }

  async increment(key: string, ttlMs: number, by = 1): Promise<number> {
    const [[, count], [, remaining]] = (await this.redis
      .multi()
      .incrby(this.key(key), by)
      .pttl(this.key(key))
      .exec()) as [[unknown, number], [unknown, number]];
    // -1: the counter has just started (no expiry yet).
    if (remaining === -1) {
      await this.redis.pexpire(this.key(key), Math.max(1, Math.round(ttlMs)));
    }
    return count;
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
