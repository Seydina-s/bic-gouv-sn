import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FileProcedureThemeStore } from "./procedure-theme-store";

let dir: string;
let store: FileProcedureThemeStore;
const NOW = "2026-09-26T12:00:00Z";
const LATER = "2026-09-27T12:00:00Z";

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-themes-"));
  store = new FileProcedureThemeStore(join(dir, "procedure-themes.json"));
  await store.saveThemes([
    { id: "a1", title: "Transports", sourceIcon: "fa-bus-alt", fetchedAt: NOW },
    { id: "b2", title: "Finances", sourceIcon: "fa-wallet", fetchedAt: NOW },
  ]);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("FileProcedureThemeStore", () => {
  it("starts empty", async () => {
    const empty = new FileProcedureThemeStore(join(dir, "none.json"));
    expect(await empty.read()).toEqual({ schemaVersion: 1, themes: [], assignments: {} });
  });

  it("records proposals once, and changes them when the proposal changes", async () => {
    expect(await store.propose({ "permis-a": "a1", "credit-b": "b2" }, NOW)).toBe(2);
    expect(await store.propose({ "permis-a": "a1" }, LATER)).toBe(0);
    expect(await store.propose({ "permis-a": "b2" }, LATER)).toBe(1);
    expect((await store.read()).assignments["permis-a"]).toMatchObject({
      themeId: "b2",
      status: "proposed",
      reviewedBy: null,
    });
  });

  it("never lets a proposal replace a validation made by a person", async () => {
    await store.propose({ "permis-a": "b2" }, NOW);
    const before = await store.validate(["permis-a"], "a1", "relecteur-1", LATER);
    expect(before["permis-a"]?.themeId).toBe("b2");
    expect(await store.propose({ "permis-a": "b2" }, LATER)).toBe(0);
    expect((await store.read()).assignments["permis-a"]).toMatchObject({
      themeId: "a1",
      status: "validated",
      reviewedBy: "relecteur-1",
      reviewedAt: LATER,
    });
  });

  it("refuses a theme that does not exist", async () => {
    await expect(store.validate(["permis-a"], "zz", "relecteur-1", NOW)).rejects.toThrow(
      /Unknown theme/,
    );
  });
});
