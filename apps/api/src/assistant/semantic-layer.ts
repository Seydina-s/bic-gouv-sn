import { readFile } from "node:fs/promises";
import { writeFileDurably } from "@bgs/content-store";
import { z } from "zod";
import { VectorIndex, type EmbeddingProvider } from "./hybrid-search";
import type { Passage } from "./passages";

/*
 * The passages' vectors, computed once and kept on disk: a restart or a new article
 * only computes what is new or changed (keyed by the passage and its version). While
 * vectors are being computed, the search by words answers alone; once ready, the
 * two are fused (graceful degradation, CLAUDE.md §4.5).
 */

/** Passages encoded between two saves of the vectors. */
const SAVE_EVERY = 256;

const fileSchema = z.object({
  model: z.string(),
  vectors: z.record(z.string(), z.string()),
});

function keyOf(passage: Passage): string {
  return `${passage.id}@${passage.contentHash}`;
}

function encode(vector: Float32Array): string {
  return Buffer.from(vector.buffer, vector.byteOffset, vector.byteLength).toString("base64");
}

function decode(text: string): Float32Array {
  const bytes = Buffer.from(text, "base64");
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
}

export interface SemanticLayerOptions {
  embedder: EmbeddingProvider;
  /** Where the vectors are kept between runs. */
  path: string;
  onError?: (error: unknown) => void;
}

export class SemanticLayer {
  private vectors = new Map<string, Float32Array>();
  private loaded = false;
  private index: VectorIndex | null = null;
  private running: Promise<void> | null = null;

  constructor(private readonly options: SemanticLayerOptions) {}

  get embedder(): EmbeddingProvider {
    return this.options.embedder;
  }

  /** The vectors ready now, or none yet. */
  current(): VectorIndex | null {
    return this.index;
  }

  private async load(): Promise<void> {
    if (this.loaded) {
      return;
    }
    this.loaded = true;
    try {
      const saved = fileSchema.parse(JSON.parse(await readFile(this.options.path, "utf8")));
      if (saved.model === this.options.embedder.model) {
        this.vectors = new Map(
          Object.entries(saved.vectors).map(([key, text]) => [key, decode(text)]),
        );
      }
    } catch {
      // Nothing saved yet, or another model: everything is computed again.
    }
  }

  private async save(): Promise<void> {
    const vectors = Object.fromEntries(
      [...this.vectors].map(([key, vector]) => [key, encode(vector)]),
    );
    await writeFileDurably(
      this.options.path,
      JSON.stringify({ model: this.options.embedder.model, vectors }),
    );
  }

  private publish(passages: readonly Passage[]): void {
    this.index = new VectorIndex(
      passages.flatMap((passage) => {
        const vector = this.vectors.get(keyOf(passage));
        return vector === undefined ? [] : [{ passage, vector }];
      }),
    );
  }

  /** Brings the vectors up to `passages` in the background; one update at a time. */
  update(passages: readonly Passage[]): Promise<void> {
    this.running ??= this.compute(passages)
      .catch((error: unknown) => this.options.onError?.(error))
      .finally(() => {
        this.running = null;
      });
    return this.running;
  }

  private async compute(passages: readonly Passage[]): Promise<void> {
    await this.load();
    this.publish(passages);
    const missing = passages.filter((passage) => !this.vectors.has(keyOf(passage)));
    for (let start = 0; start < missing.length; start += SAVE_EVERY) {
      const batch = missing.slice(start, start + SAVE_EVERY);
      const vectors = await this.options.embedder.embed(
        batch.map((passage) => `${passage.title}\n${passage.text}`),
        "passage",
        new AbortController().signal,
      );
      batch.forEach((passage, index) => {
        const vector = vectors[index];
        if (vector !== undefined) {
          this.vectors.set(keyOf(passage), vector);
        }
      });
      await this.save();
      this.publish(passages);
    }
    // Passages gone from the base leave the saved vectors at the next save.
    const kept = new Set(passages.map(keyOf));
    if ([...this.vectors.keys()].some((key) => !kept.has(key))) {
      this.vectors = new Map([...this.vectors].filter(([key]) => kept.has(key)));
      await this.save();
    }
  }
}
