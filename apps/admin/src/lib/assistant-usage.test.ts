import { describe, expect, it } from "vitest";
import { averageCost, estimatedCost, formatDollars, usedShare } from "./assistant-usage";

const usage = {
  month: "2026-10",
  questions: 1000,
  monthlyLimit: 10_000,
  inputTokens: 2_000_000,
  outputTokens: 150_000,
  configured: true,
};

describe("the assistant's usage", () => {
  it("costs the tokens read and written at the model's price", () => {
    expect(estimatedCost(usage)).toBeCloseTo(2.75);
    expect(averageCost(usage)).toBeCloseTo(0.00275);
    expect(averageCost({ ...usage, questions: 0 })).toBeNull();
  });

  it("tells the share of the monthly limit used, never past all of it", () => {
    expect(usedShare(usage)).toBe(0.1);
    expect(usedShare({ questions: 12, monthlyLimit: 10 })).toBe(1);
  });

  it("writes dollars the French way, cents included", () => {
    expect(formatDollars(2.75).replace(/\s/g, " ")).toBe("2,75 $US");
    expect(formatDollars(0.00275).replace(/\s/g, " ")).toBe("0,0028 $US");
    expect(formatDollars(0).replace(/\s/g, " ")).toBe("0,00 $US");
  });
});
