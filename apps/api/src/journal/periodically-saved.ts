import { writeFileDurably } from "@bgs/content-store";

/**
 * Something the API keeps in memory and saves now and then, never on a request's
 * path (error journal, search misses, usage counters). Saved again only when it
 * changed, again after a failed save, and once more when the API stops.
 */
export abstract class PeriodicallySaved {
  private dirty = false;
  private timer: NodeJS.Timeout | null = null;

  protected abstract save(): Promise<void>;

  protected changed(): void {
    this.dirty = true;
  }

  async flush(): Promise<void> {
    if (!this.dirty) {
      return;
    }
    this.dirty = false;
    try {
      await this.save();
    } catch (error) {
      this.dirty = true;
      throw error;
    }
  }

  /** Saves every `intervalMs` while something changed. */
  start(intervalMs: number, onError: (error: unknown) => void): void {
    this.timer = setInterval(() => {
      this.flush().catch(onError);
    }, intervalMs);
    this.timer.unref();
  }

  async close(): Promise<void> {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }
}

/** Saved whole to a JSON file: for what a single instance writes. */
export abstract class SavedToFile extends PeriodicallySaved {
  protected constructor(private readonly path: string) {
    super();
  }

  /** What goes to the file. */
  protected abstract snapshot(): unknown;

  protected save(): Promise<void> {
    return writeFileDurably(this.path, JSON.stringify(this.snapshot(), null, 2));
  }
}
