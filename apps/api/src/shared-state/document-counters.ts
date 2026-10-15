import type { JsonDocument } from "@bgs/content-store";
import { z } from "zod";
import type { KeyValueStore } from "./key-value-store";

/** What a store of counters must do: read one, add to one. */
export type CounterStore = Pick<KeyValueStore, "get" | "increment">;

const countersSchema = z.object({
  counters: z.record(z.string(), z.object({ value: z.number(), expiresAt: z.number() })),
});
type Counters = z.infer<typeof countersSchema>;

/**
 * Counters kept in a saved document (a file, or a row of PostgreSQL), for an API
 * without Redis: the assistant's questions and spending of the month (12/10/2026:
 * kept in memory, they started again from zero at each restart, so the console
 * showed far fewer questions than were asked). Each change reads and writes the
 * document under its lock; expired counters are dropped as it is written.
 */
export class DocumentCounters implements CounterStore {
  constructor(
    private readonly document: JsonDocument,
    private readonly now: () => number = Date.now,
  ) {}

  private async counters(): Promise<Counters["counters"]> {
    const parsed = countersSchema.safeParse(await this.document.read());
    return parsed.success ? parsed.data.counters : {};
  }

  async get(key: string): Promise<string | null> {
    const entry = (await this.counters())[key];
    return entry === undefined || entry.expiresAt <= this.now() ? null : String(entry.value);
  }

  increment(key: string, ttlMs: number, by = 1): Promise<number> {
    return this.document.update((saved) => {
      const now = this.now();
      const parsed = countersSchema.safeParse(saved);
      const kept = Object.entries(parsed.success ? parsed.data.counters : {}).filter(
        ([, entry]) => entry.expiresAt > now,
      );
      const counters = Object.fromEntries(kept);
      const current = counters[key];
      const value = (current?.value ?? 0) + by;
      counters[key] = { value, expiresAt: current?.expiresAt ?? now + ttlMs };
      return { next: { counters }, result: value };
    });
  }
}
