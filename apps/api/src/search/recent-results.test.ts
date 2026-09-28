import { describe, expect, it } from "vitest";
import { RecentResults } from "./recent-results";

describe("RecentResults", () => {
  it("computes a repeated search once while it is fresh, then again", async () => {
    let clock = 0;
    let computed = 0;
    const results = new RecentResults<number>(60_000, 10, () => clock);
    const compute = () => {
      computed += 1;
      return Promise.resolve(computed);
    };
    expect(await results.get("conseil", compute)).toBe(1);
    clock = 59_000;
    expect(await results.get("conseil", compute)).toBe(1);
    clock = 61_000;
    expect(await results.get("conseil", compute)).toBe(2);
  });

  it("shares a search still being computed with identical requests", async () => {
    let computed = 0;
    const results = new RecentResults<number>(60_000, 10, () => 0);
    const compute = () => {
      computed += 1;
      return new Promise<number>((resolve) => {
        setTimeout(() => {
          resolve(computed);
        }, 5);
      });
    };
    const burst = await Promise.all([1, 2, 3].map(() => results.get("conseil", compute)));
    expect(burst).toEqual([1, 1, 1]);
    expect(computed).toBe(1);
  });

  it("does not keep a failed search", async () => {
    const results = new RecentResults<number>(60_000, 10, () => 0);
    await expect(results.get("x", () => Promise.reject(new Error("down")))).rejects.toThrow();
    expect(await results.get("x", () => Promise.resolve(2))).toBe(2);
  });

  it("keeps a bounded number of searches, the oldest giving way", async () => {
    let computed = 0;
    const results = new RecentResults<string>(60_000, 2, () => 0);
    const compute = (key: string) => () => {
      computed += 1;
      return Promise.resolve(key);
    };
    for (const key of ["a", "b", "c", "a"]) {
      await results.get(key, compute(key));
    }
    expect(computed).toBe(4);
  });
});
