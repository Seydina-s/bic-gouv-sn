import type { EmbeddingProvider } from "./hybrid-search";

/*
 * The search by meaning (AI-02, AI-07): multilingual-e5-small (MIT), quantized,
 * run on the server's own processor by @huggingface/transformers (Apache 2.0). No
 * provider, no cost per question: about 8 ms a question on the test computer. The
 * model is fetched once into `cacheDir`, and loaded only when first needed.
 */

export const EMBEDDING_MODEL = "Xenova/multilingual-e5-small";
/** The model was trained to tell questions from passages by these words. */
const PREFIX = { query: "query: ", passage: "passage: " } as const;
const BATCH = 16;

type Extractor = (
  texts: string[],
  options: { pooling: "mean"; normalize: boolean },
) => Promise<{ tolist: () => number[][] }>;

export class TransformersEmbedder implements EmbeddingProvider {
  readonly model = EMBEDDING_MODEL;
  private extractor: Promise<Extractor> | null = null;

  constructor(private readonly cacheDir: string) {}

  private load(): Promise<Extractor> {
    this.extractor ??= import("@huggingface/transformers").then(async ({ env, pipeline }) => {
      env.cacheDir = this.cacheDir;
      const extractor: Extractor = await pipeline("feature-extraction", EMBEDDING_MODEL, {
        dtype: "q8",
      });
      return extractor;
    });
    return this.extractor;
  }

  async embed(
    texts: readonly string[],
    role: "query" | "passage",
    signal: AbortSignal,
  ): Promise<Float32Array[]> {
    const extract = await this.load();
    const vectors: Float32Array[] = [];
    for (let start = 0; start < texts.length; start += BATCH) {
      signal.throwIfAborted();
      const batch = texts.slice(start, start + BATCH).map((text) => PREFIX[role] + text);
      const output = await extract(batch, { pooling: "mean", normalize: true });
      vectors.push(...output.tolist().map((values) => Float32Array.from(values)));
    }
    return vectors;
  }
}
