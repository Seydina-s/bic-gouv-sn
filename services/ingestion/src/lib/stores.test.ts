import { describe, expect, it } from "vitest";
import { contentPaths, openStores } from "./stores";

describe("the collection's stores", () => {
  it("writes to the files of .data/ unless told otherwise", async () => {
    const opened = await openStores({});
    expect(opened.inDatabase).toBe(false);
    expect(opened.paths.news.replaceAll("\\", "/")).toMatch(/\.data\/news\.json$/);
    await opened.close();
  });

  it("follows the paths the environment sets", () => {
    const paths = contentPaths({
      NEWS_STORE_PATH: "/tmp/news.json",
      STATE_SERVICES_PATH: "/s.json",
    });
    expect(paths.news).toBe("/tmp/news.json");
    expect(paths.stateServices).toBe("/s.json");
    expect(paths.procedures.replaceAll("\\", "/")).toMatch(/\.data\/procedures\.json$/);
  });
});
