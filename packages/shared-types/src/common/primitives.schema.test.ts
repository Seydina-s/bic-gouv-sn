import { describe, expect, it } from "vitest";
import {
  httpsUrlSchema,
  isoDateTimeSchema,
  langSchema,
  sha256HexSchema,
  slugSchema,
} from "./primitives.schema";

describe("primitives", () => {
  it("accepts only French and Wolof", () => {
    expect(langSchema.safeParse("wo").success).toBe(true);
    expect(langSchema.safeParse("en").success).toBe(false);
  });

  it("requires ISO date-times with an offset", () => {
    expect(isoDateTimeSchema.safeParse("2026-09-24T10:00:00+00:00").success).toBe(true);
    expect(isoDateTimeSchema.safeParse("2026-09-24").success).toBe(false);
  });

  it("rejects non-HTTPS URLs", () => {
    expect(httpsUrlSchema.safeParse("https://presidence.sn").success).toBe(true);
    expect(httpsUrlSchema.safeParse("http://presidence.sn").success).toBe(false);
  });

  it("validates lowercase SHA-256 digests", () => {
    expect(sha256HexSchema.safeParse("f".repeat(64)).success).toBe(true);
    expect(sha256HexSchema.safeParse("F".repeat(64)).success).toBe(false);
    expect(sha256HexSchema.safeParse("f".repeat(63)).success).toBe(false);
  });

  it("validates kebab-case slugs", () => {
    expect(slugSchema.safeParse("conseil-des-ministres").success).toBe(true);
    expect(slugSchema.safeParse("Conseil des ministres").success).toBe(false);
  });
});
