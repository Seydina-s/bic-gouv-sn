import { describe, expect, it } from "vitest";
import { NOW } from "../testing/fixtures";
import { embeddingSchema } from "./embedding.schema";

const embedding = { model: "test-model", dimensions: 3, vector: [0.1, 0.2, 0.3], createdAt: NOW };

describe("embeddingSchema", () => {
  it("accepts a vector matching its dimensions", () => {
    expect(embeddingSchema.safeParse(embedding).success).toBe(true);
  });

  it("rejects a vector of the wrong length", () => {
    expect(embeddingSchema.safeParse({ ...embedding, vector: [0.1] }).success).toBe(false);
  });

  it("rejects non-finite values", () => {
    const vector = [0.1, Number.POSITIVE_INFINITY, 0.3];
    expect(embeddingSchema.safeParse({ ...embedding, vector }).success).toBe(false);
  });
});
