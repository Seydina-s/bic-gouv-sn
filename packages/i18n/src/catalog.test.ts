import { describe, expect, it } from "vitest";
import { findMissingMessages, listMessageKeys, lookupMessage } from "./catalog";
import { fr } from "./messages/fr";
import { wo } from "./messages/wo";

const tree = { a: "A", group: { b: "B", count: { one: "1", other: "n" } } };

describe("catalog helpers", () => {
  it("lists every message key, plural messages included", () => {
    expect(listMessageKeys(tree)).toEqual(["a", "group.b", "group.count"]);
  });

  it("looks up nested messages", () => {
    expect(lookupMessage(tree, "group.b")).toBe("B");
    expect(lookupMessage(tree, "group.count")).toEqual({ one: "1", other: "n" });
  });

  it("returns undefined for groups and unknown paths", () => {
    expect(lookupMessage(tree, "group")).toBeUndefined();
    expect(lookupMessage(tree, "a.deeper")).toBeUndefined();
    expect(lookupMessage(tree, "nope")).toBeUndefined();
  });

  it("does not mistake a label group containing an 'other' key for a plural", () => {
    const labels = { group: { general: "G", other: "O" } };
    expect(listMessageKeys(labels)).toEqual(["group.general", "group.other"]);
    expect(lookupMessage(labels, "group.other")).toBe("O");
  });

  it("finds messages missing from a partial catalog", () => {
    expect(findMissingMessages(tree, { group: { b: "b" } })).toEqual(["a", "group.count"]);
  });
});

describe("shipped catalogs", () => {
  it("contain no empty French string", () => {
    for (const key of listMessageKeys(fr)) {
      const message = lookupMessage(fr, key);
      const texts =
        typeof message === "string"
          ? [message]
          : [message?.one, message?.many, message?.other].filter((text) => text !== undefined);
      expect(texts.length).toBeGreaterThan(0);
      expect(texts.every((text) => text.trim() !== "")).toBe(true);
    }
  });

  it("follow French typography: non-breaking space before a colon and inside « »", () => {
    for (const key of listMessageKeys(fr)) {
      const message = lookupMessage(fr, key);
      const texts =
        typeof message === "string"
          ? [message]
          : [message?.one, message?.many, message?.other].filter((text) => text !== undefined);
      for (const text of texts) {
        expect(text, key).not.toMatch(/ :|« | »/);
      }
    }
  });

  it("report every Wolof string still to be translated", () => {
    // Wolof strings come from native speakers: until then, all keys are reported.
    expect(findMissingMessages(fr, wo)).toEqual(listMessageKeys(fr));
  });
});
