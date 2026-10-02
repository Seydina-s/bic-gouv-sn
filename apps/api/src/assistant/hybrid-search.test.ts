import { describe, expect, it } from "vitest";
import { fuseRankings, hybridSearch, VectorIndex, type EmbeddingProvider } from "./hybrid-search";
import { PassageIndex, type ScoredPassage } from "./passage-search";
import type { Passage } from "./passages";

// Placeholder texts, not real content.
function passage(n: number, title: string, text: string, lang: "fr" | "wo" = "fr"): Passage {
  return {
    id: `content-${String(n)}:${lang}:0`,
    contentId: `content-${String(n)}`,
    kind: "procedure",
    lang,
    status: "official",
    title,
    sourceUrl: `https://e-senegal.sn/#/demarche/test-${String(n)}`,
    publishedOn: null,
    contentHash: "1".repeat(64),
    text,
  };
}

const army = passage(1, "Carrière militaire", "Entrer dans les armées.");
const port = passage(2, "Démarche du port", "Le port de test.");
const quay = passage(3, "Quai", "Le quai du port.");
const wolof = passage(4, "[wo] Liggéey", "[wo] Mbind", "wo");

/** Two-dimensional test vectors: [army, port]. */
const VECTORS: Record<string, [number, number]> = {
  [army.id]: [1, 0],
  [port.id]: [0, 1],
  [quay.id]: [0.6, 0.8],
  [wolof.id]: [1, 0],
};
const vectors = new VectorIndex(
  [army, port, quay, wolof].map((p) => ({
    passage: p,
    vector: Float32Array.from(VECTORS[p.id] ?? []),
  })),
);
const words = new PassageIndex([army, port, quay, wolof]);
const direct = <T>(operation: (signal: AbortSignal) => Promise<T>) =>
  operation(new AbortController().signal);

/** Understands "soldat" as the army, and nothing else as anything. */
const embedder: EmbeddingProvider = {
  model: "modele-de-test",
  embed: (texts) =>
    Promise.resolve(
      texts.map((text) => Float32Array.from(text.includes("soldat") ? [1, 0] : [0, 0])),
    ),
};

const ids = (found: readonly ScoredPassage[]) => found.map(({ passage: p }) => p.contentId);

describe("VectorIndex", () => {
  it("ranks the passages of the language asked by similarity", () => {
    const found = vectors.search(Float32Array.from([0, 1]), { lang: "fr", limit: 2 });
    expect(ids(found)).toEqual(["content-2", "content-3"]);
    expect(ids(vectors.search(Float32Array.from([1, 0]), { lang: "wo", limit: 5 }))).toEqual([
      "content-4",
    ]);
  });
});

describe("fuseRankings", () => {
  it("puts first what both rankings place high, each passage once", () => {
    const a = [port, quay, army].map((p) => ({ passage: p, score: 9 }));
    const b = [quay, army].map((p) => ({ passage: p, score: 0.1 }));
    expect(ids(fuseRankings([a, b], 5))).toEqual(["content-3", "content-1", "content-2"]);
    expect(fuseRankings([a, b], 1)).toHaveLength(1);
  });
});

describe("hybridSearch", () => {
  it("finds by meaning what the words miss", async () => {
    expect(ids(words.search("devenir soldat", { lang: "fr", limit: 5 }))).toEqual([]);
    const found = await hybridSearch(
      "devenir soldat",
      { lang: "fr", limit: 1 },
      { words, vectors, embedder, call: direct },
    );
    expect(ids(found)).toEqual(["content-1"]);
  });

  it("keeps searching by words when the model cannot be reached", async () => {
    const failing = () => Promise.reject(new Error("modèle injoignable"));
    const found = await hybridSearch(
      "le port",
      { lang: "fr", limit: 5 },
      { words, vectors, embedder, call: failing },
    );
    expect(ids(found)).toEqual(ids(words.search("le port", { lang: "fr", limit: 5 })));
    const empty: EmbeddingProvider = { model: "vide", embed: () => Promise.resolve([]) };
    const without = await hybridSearch(
      "le port",
      { lang: "fr", limit: 1 },
      { words, vectors, embedder: empty, call: direct },
    );
    expect(without).toHaveLength(1);
  });
});
