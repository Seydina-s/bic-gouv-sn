import { writeFileDurably } from "@bgs/content-store";

/**
 * Something the API keeps in memory and writes durably now and then, never on a
 * request's path (error journal, search misses). Written again only when it changed,
 * and once more when the API stops.
 */
export abstract class PeriodicallySaved {
  private dirty = false;
  private timer: NodeJS.Timeout | null = null;

  protected constructor(private readonly path: string) {}

  /** What goes to the file. */
  protected abstract snapshot(): unknown;

  protected changed(): void {
    this.dirty = true;
  }

  async flush(): Promise<void> {
    if (!this.dirty) {
      return;
    }
    this.dirty = false;
    await writeFileDurably(this.path, JSON.stringify(this.snapshot(), null, 2));
  }

  /** Writes every `intervalMs` while something changed. */
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
