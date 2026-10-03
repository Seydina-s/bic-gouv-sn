import { stateServicesFileSchema } from "@bgs/shared-types";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fileDocument, postgresDocument, TypedDocument, type JsonDocument } from "./json-document";
import { StateServiceStore } from "./state-service-store";
import { storages, type OpenedStore } from "./testing/stores";

const STORAGES = storages<JsonDocument>(
  (path) => fileDocument(path),
  (database) => postgresDocument(database, "test-document"),
);

describe.each(STORAGES)("a JSON document %s", (_name, open) => {
  let opened: OpenedStore<JsonDocument>;
  let document: JsonDocument;
  beforeEach(async () => {
    opened = await open();
    document = opened.store;
  });
  afterEach(async () => {
    await opened.close();
  });

  it("reads nothing before the first write, then what was written", async () => {
    expect(await document.read()).toBeUndefined();
    expect(await document.update(() => ({ next: { count: 1 }, result: "written" }))).toBe(
      "written",
    );
    expect(await document.read()).toEqual({ count: 1 });
  });

  it("leaves the saved value as it is when a change decides nothing", async () => {
    await document.update(() => ({ next: { count: 1 }, result: undefined }));
    expect(await document.update((saved) => ({ result: saved }))).toEqual({ count: 1 });
    expect(await document.read()).toEqual({ count: 1 });
  });

  it("lets changes take turns: none overwrites another", async () => {
    await document.update(() => ({ next: { count: 0 }, result: undefined }));
    const add = () =>
      document.update((saved) => ({
        next: { count: (saved as { count: number }).count + 1 },
        result: undefined,
      }));
    await Promise.all(Array.from({ length: 10 }, add));
    expect(await document.read()).toEqual({ count: 10 });
  });

  it("keeps the saved value when a change fails", async () => {
    await document.update(() => ({ next: { count: 1 }, result: undefined }));
    await expect(
      document.update(() => {
        throw new Error("refused");
      }),
    ).rejects.toThrow("refused");
    expect(await document.read()).toEqual({ count: 1 });
  });

  it("validates what it reads and what it writes, through its schema", async () => {
    const empty = { schemaVersion: 1 as const, services: {}, places: [] };
    const typed = new TypedDocument(document, stateServicesFileSchema, empty);
    expect(await typed.read()).toEqual(empty);
    await expect(
      typed.change(() => ({ next: { ...empty, schemaVersion: 2 as unknown as 1 }, result: 0 })),
    ).rejects.toThrow();
    expect(await document.read()).toBeUndefined();
  });

  it("serves a store the same way on every storage", async () => {
    const store = new StateServiceStore(document);
    expect(await store.verified()).toEqual([]);
    expect((await store.read()).places).toEqual([]);
  });
});
