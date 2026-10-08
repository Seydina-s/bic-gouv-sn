import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { answerQuestion } from "./grounded-answer";
import type { EmbeddingProvider } from "./hybrid-search";
import type { LlmProvider, LlmRequest } from "./llm-provider";
import { PassageIndex } from "./passage-search";
import type { Passage } from "./passages";
import { SemanticLayer } from "./semantic-layer";

// Placeholder texts, not real content.
function passage(n: number, title: string, text: string, hash = "1"): Passage {
  return {
    id: `content-${String(n)}:fr:0`,
    contentId: `content-${String(n)}`,
    kind: "procedure",
    lang: "fr",
    status: "official",
    title,
    sourceUrl: `https://e-senegal.sn/#/demarche/test-${String(n)}`,
    publishedOn: null,
    contentHash: hash.repeat(64),
    text,
  };
}

/**
 * A fake model that knows one thing: "voyager à l'étranger" means the same as
 * "passeport". Every other text is far from it. Counts what it encodes.
 */
function fakeEmbedder(): EmbeddingProvider & { encoded: number } {
  const embedder = {
    model: "fake-model",
    encoded: 0,
    embed: (texts: readonly string[]) => {
      embedder.encoded += texts.length;
      return Promise.resolve(
        texts.map((text) =>
          /passeport|voyager/i.test(text) ? Float32Array.from([1, 0]) : Float32Array.from([0, 1]),
        ),
      );
    },
  };
  return embedder;
}

const PASSPORT = passage(1, "Demander un passeport", "Le passeport fictif se demande au guichet.");
const PASSAGES = [
  PASSPORT,
  passage(2, "Acte de naissance", "L'acte fictif se demande à la mairie."),
];

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-vectors-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("the search by meaning", () => {
  it("encodes each passage once, keeps the vectors, and only encodes what changed", async () => {
    const path = join(dir, "vectors.json");
    const first = fakeEmbedder();
    const layer = new SemanticLayer({ embedder: first, path });
    expect(layer.current()).toBeNull();
    await layer.update(PASSAGES);
    expect(first.encoded).toBe(2);
    expect(
      layer.current()?.search(Float32Array.from([1, 0]), { lang: "fr", limit: 1 })[0]?.passage.id,
    ).toBe("content-1:fr:0");

    // After a restart: the saved vectors are read; a corrected passage is encoded again.
    const second = fakeEmbedder();
    const restarted = new SemanticLayer({ embedder: second, path });
    await restarted.update([PASSPORT, passage(2, "Acte de naissance", "Corrigé.", "2")]);
    expect(second.encoded).toBe(1);
  });

  it("finds the page a question means, even without a word in common", async () => {
    const layer = new SemanticLayer({ embedder: fakeEmbedder(), path: join(dir, "v.json") });
    await layer.update(PASSAGES);
    const requests: LlmRequest[] = [];
    const llm: LlmProvider = {
      name: "test",
      complete: (request) => {
        requests.push(request);
        return Promise.resolve({
          text: '{"status":"answered","answer":"Au guichet.","citations":[1]}',
          model: "test",
          inputTokens: 1,
          outputTokens: 1,
        });
      },
    };
    const vectors = layer.current();
    if (vectors === null) {
      throw new Error("vectors not ready");
    }
    const answer = await answerQuestion(
      { question: "Je veux voyager à l'étranger", lang: "fr", today: "2026-10-08" },
      {
        index: new PassageIndex(PASSAGES),
        meaning: { vectors, embedder: layer.embedder },
        llm,
        call: (operation) => operation(new AbortController().signal),
      },
    );
    expect(answer.status).toBe("answered");
    expect(answer.sources[0]?.title).toBe("Demander un passeport");
  });

  it("lets the words answer alone when the model fails", async () => {
    const failing: EmbeddingProvider = {
      model: "fake-model",
      embed: () => Promise.reject(new Error("model unavailable")),
    };
    const layer = new SemanticLayer({ embedder: fakeEmbedder(), path: join(dir, "w.json") });
    await layer.update(PASSAGES);
    const vectors = layer.current();
    if (vectors === null) {
      throw new Error("vectors not ready");
    }
    const answer = await answerQuestion(
      { question: "Je veux voyager à l'étranger", lang: "fr", today: "2026-10-08" },
      {
        index: new PassageIndex(PASSAGES),
        meaning: { vectors, embedder: failing },
        llm: { name: "test", complete: () => Promise.reject(new Error("never called")) },
        call: (operation) => operation(new AbortController().signal),
      },
    );
    // No word in common and no meaning: nothing to read, no model call.
    expect(answer).toMatchObject({ status: "not_found", usage: null });
  });
});
