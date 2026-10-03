import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProcedureThemeStore } from "./procedure-theme-store";
import { fileDocument } from "./json-document";

let dir: string;
let store: ProcedureThemeStore;
const NOW = "2026-09-26T12:00:00Z";
const LATER = "2026-09-27T12:00:00Z";

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "bgs-themes-"));
  store = new ProcedureThemeStore(fileDocument(join(dir, "procedure-themes.json")));
  await store.saveThemes([
    { id: "a1", title: "Transports", sourceIcon: "fa-bus-alt", fetchedAt: NOW },
    { id: "b2", title: "Finances", sourceIcon: "fa-wallet", fetchedAt: NOW },
  ]);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("ProcedureThemeStore", () => {
  it("starts empty", async () => {
    const empty = new ProcedureThemeStore(fileDocument(join(dir, "none.json")));
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

  it("keeps the themes the platform added when official themes are collected again", async () => {
    await store.savePlatformThemes([
      { id: "bgsagri", title: "Agriculture", sourceIcon: "fa-seedling", fetchedAt: NOW },
    ]);
    await store.saveThemes([{ id: "a1", title: "Transports", sourceIcon: null, fetchedAt: LATER }]);
    const themes = (await store.read()).themes;
    expect(themes.map((theme) => [theme.id, theme.origin])).toEqual([
      ["a1", "source"],
      ["bgsagri", "platform"],
    ]);
    await expect(
      store.savePlatformThemes([{ id: "a1", title: "X", sourceIcon: null, fetchedAt: NOW }]),
    ).rejects.toThrow(/official/);
  });

  it("applies a delegated classification without replacing what a person validated", async () => {
    await store.propose({ "permis-a": "b2", "credit-b": "b2" }, NOW);
    await store.validate(["credit-b"], "b2", "relecteur-1", NOW);
    const result = await store.applyClassification(
      { "permis-a": "a1", "credit-b": "a1", "sans-proposition": "b2" },
      "delegation:claude",
      LATER,
    );
    expect(result).toEqual({
      applied: ["permis-a", "sans-proposition"],
      keptPersonal: ["credit-b"],
    });
    const { assignments } = await store.read();
    expect(assignments["permis-a"]).toMatchObject({
      themeId: "a1",
      status: "validated",
      reviewedBy: "delegation:claude",
    });
    expect(assignments["credit-b"]).toMatchObject({ themeId: "b2", reviewedBy: "relecteur-1" });
    // Applying the same classification again changes nothing.
    expect(
      (await store.applyClassification({ "permis-a": "a1" }, "delegation:claude", LATER)).applied,
    ).toEqual([]);
    await expect(
      store.applyClassification({ "permis-a": "zz" }, "delegation:claude", LATER),
    ).rejects.toThrow(/Unknown theme/);
  });

  it("refuses a theme that does not exist", async () => {
    await expect(store.validate(["permis-a"], "zz", "relecteur-1", NOW)).rejects.toThrow(
      /Unknown theme/,
    );
  });
});
