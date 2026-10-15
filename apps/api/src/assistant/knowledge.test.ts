import { describe, expect, it, vi } from "vitest";
import { PassageIndex } from "./passage-search";
import { RefreshedKnowledge, type Knowledge } from "./knowledge";

function knowledge(): Knowledge {
  return { index: new PassageIndex([]), passages: [], procedureSlugs: new Map() };
}

describe("the refreshed knowledge", () => {
  it("builds once for simultaneous readers, then serves the same base", async () => {
    const build = vi.fn(() => Promise.resolve(knowledge()));
    const source = new RefreshedKnowledge({ build, now: () => 0 });
    const [first, second] = await Promise.all([source.read(), source.read()]);
    expect(first).toBe(second);
    expect(await source.read()).toBe(first);
    expect(build).toHaveBeenCalledTimes(1);
  });

  it("answers from the previous base while a stale one is rebuilt", async () => {
    let now = 0;
    const bases = [knowledge(), knowledge()];
    let built = 0;
    const source = new RefreshedKnowledge({
      build: () => Promise.resolve(bases[built++] ?? knowledge()),
      refreshEveryMs: 1000,
      now: () => now,
    });
    const first = await source.read();
    now = 1500;
    expect(await source.read()).toBe(first);
    await Promise.resolve();
    await Promise.resolve();
    expect(await source.read()).toBe(bases[1]);
  });

  it("keeps the previous base when a rebuild fails, and says so", async () => {
    let now = 0;
    const onRefreshError = vi.fn();
    let fail = false;
    const base = knowledge();
    const source = new RefreshedKnowledge({
      build: () => (fail ? Promise.reject(new Error("base injoignable")) : Promise.resolve(base)),
      refreshEveryMs: 1000,
      now: () => now,
      onRefreshError,
    });
    await source.read();
    fail = true;
    now = 2000;
    expect(await source.read()).toBe(base);
    await vi.waitFor(() => {
      expect(onRefreshError).toHaveBeenCalled();
    });
    expect(await source.read()).toBe(base);
  });
});

describe("a base that follows the sources", () => {
  it("answers from the new sources as soon as an article arrives, without waiting", async () => {
    let stamp = "1:a:1";
    const bases = [knowledge(), knowledge()];
    let built = 0;
    const source = new RefreshedKnowledge({
      build: () => Promise.resolve(bases[built++] ?? knowledge()),
      stamp: () => Promise.resolve(stamp),
      now: () => 0,
    });
    expect(await source.read()).toBe(bases[0]);
    expect(await source.read()).toBe(bases[0]);
    // An article lands: the next question already sees it.
    stamp = "2:b:1";
    expect(await source.read()).toBe(bases[1]);
    expect(built).toBe(2);
  });
});
