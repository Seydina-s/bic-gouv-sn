import { z } from "zod";
import { newsDetailSchema, newsListResponseSchema } from "./news.schema";
import { procedureDetailSchema, procedureListResponseSchema } from "./procedures.schema";

/** FNV-1a, 32 bits: tiny and dependency-free; collisions only cost a cache refill. */
function fnv1a(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Fingerprint of a set of schemas (exported for tests). */
export function schemasFingerprint(schemas: readonly z.ZodType[]): string {
  return fnv1a(JSON.stringify(schemas.map((schema) => z.toJSONSchema(schema))));
}

let cached: string | null = null;

/**
 * Fingerprint of the public response formats the app stores offline. It changes by
 * itself whenever one of those schemas changes, so a phone never reuses data saved
 * in an older format after an update (it refetches instead).
 */
export function apiContractFingerprint(): string {
  cached ??= schemasFingerprint([
    newsListResponseSchema,
    newsDetailSchema,
    procedureListResponseSchema,
    procedureDetailSchema,
  ]);
  return cached;
}
