import { describe, expect, it, vi } from "vitest";
import { PassageIndex } from "./passage-search";
import type { ArticleRepository, ProcedureRepository } from "@bgs/content-store";
import type { StateService } from "@bgs/shared-types";
import { buildKnowledge, RefreshedKnowledge, type Knowledge } from "./knowledge";

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

describe("buildKnowledge", () => {
  it("adds the verified government services to the articles and procedures", async () => {
    const articles = {
      list: () => Promise.resolve({ items: [], nextCursor: null, total: 0 }),
    } as unknown as ArticleRepository;
    const procedures = { all: () => Promise.resolve([]) } as unknown as ProcedureRepository;
    // A placeholder office, not a real one.
    const office: StateService = {
      id: "osm-w7",
      category: "prefecture",
      name: "Préfecture fictive",
      address: null,
      town: "Thiès",
      location: { lat: 14.79, lng: -16.92 },
      phone: null,
      website: null,
      openingHours: null,
      origin: { kind: "osm", osmType: "way", osmId: 7, fetchedAt: "2026-09-27T10:00:00Z" },
      status: "verified",
      reviewedBy: null,
      reviewedAt: null,
      pendingUpdate: null,
      corrections: {},
    };
    const built = await buildKnowledge(articles, procedures, {
      verified: () => Promise.resolve([office]),
    });
    expect(built.passages.map((passage) => passage.contentId)).toEqual(["osm-w7"]);
    expect(
      built.index.search("préfecture Thiès", { lang: "fr", limit: 3 })[0]?.passage.contentId,
    ).toBe("osm-w7");
    // Without the map, the base still builds.
    expect((await buildKnowledge(articles, procedures)).passages).toEqual([]);
  });
});
