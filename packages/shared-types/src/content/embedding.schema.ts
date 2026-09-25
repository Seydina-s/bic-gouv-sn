import { z } from "zod";
import { isoDateTimeSchema, positiveIntSchema } from "../common/primitives.schema";

/** Vector used by the AI assistant (RAG). Computed after ingestion, so it may be absent. */
export const embeddingSchema = z
  .strictObject({
    model: z.string().min(1),
    dimensions: positiveIntSchema,
    vector: z.array(z.number()),
    createdAt: isoDateTimeSchema,
  })
  .refine((embedding) => embedding.vector.length === embedding.dimensions, {
    path: ["vector"],
    message: "Vector length must match the declared dimensions",
  });
export type Embedding = z.infer<typeof embeddingSchema>;
