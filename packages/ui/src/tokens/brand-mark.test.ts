import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BRAND_MARK } from "./brand-mark";

const SOURCE = new URL("../../../../apps/mobile/assets/brand/icon-source.svg", import.meta.url);

describe("BRAND_MARK", () => {
  it("keeps the colours of the institution's own icon file", () => {
    const svg = readFileSync(SOURCE, "utf8").toUpperCase();
    for (const colour of Object.values(BRAND_MARK)) {
      expect(svg).toContain(colour);
    }
  });
});
