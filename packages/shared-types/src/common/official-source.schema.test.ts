import { describe, expect, it } from "vitest";
import { officialSourceUrlSchema } from "./official-source.schema";

describe("officialSourceUrlSchema", () => {
  it.each([
    "https://www.presidence.sn/fr/actualites",
    "https://presidence.sn/wo/",
    "https://e-senegal.sn/#/home/demarches",
  ])("accepts official source %s", (url) => {
    expect(officialSourceUrlSchema.safeParse(url).success).toBe(true);
  });

  it.each([
    "https://example.com/article",
    "https://presidence.sn.evil.test/fr",
    "https://fakepresidence.sn/fr",
    "http://www.presidence.sn/fr",
    "not a url",
  ])("rejects non-official source %s", (url) => {
    expect(officialSourceUrlSchema.safeParse(url).success).toBe(false);
  });
});
