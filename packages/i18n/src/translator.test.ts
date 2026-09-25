import { describe, expect, it, vi } from "vitest";
import { fr } from "./messages/fr";
import { createTranslator, interpolate } from "./translator";

// Test catalogs: placeholder strings, not real UI copy.
const reference = {
  greeting: "Bonjour {name}",
  inbox: { unread: { one: "{count} message", other: "{count} messages" } },
  onlyFr: "Texte FR",
};
const wolof = {
  greeting: "WO {name}",
  inbox: { unread: { other: "WO {count}" } },
};

describe("interpolate", () => {
  it("replaces known placeholders and keeps unknown ones visible", () => {
    expect(interpolate("{a} et {b}", { a: 1 })).toBe("1 et {b}");
  });

  it("returns the template untouched without params", () => {
    expect(interpolate("Sans variable")).toBe("Sans variable");
  });
});

describe("createTranslator", () => {
  it("translates in the active language", () => {
    const t = createTranslator({ lang: "wo", reference, catalog: wolof });
    expect(t("greeting", { name: "Awa" })).toBe("WO Awa");
  });

  it("falls back to French and reports it", () => {
    const onFallback = vi.fn();
    const t = createTranslator({ lang: "wo", reference, catalog: wolof, onFallback });
    expect(t("onlyFr")).toBe("Texte FR");
    expect(onFallback).toHaveBeenCalledWith("onlyFr", "wo");
  });

  it("applies French plural rules (0 and 1 are singular)", () => {
    const t = createTranslator({ lang: "fr", reference, catalog: reference });
    expect(t("inbox.unread", { count: 0 })).toBe("0 message");
    expect(t("inbox.unread", { count: 1 })).toBe("1 message");
    expect(t("inbox.unread", { count: 2 })).toBe("2 messages");
  });

  it("uses the French plural rule when the Wolof message is missing", () => {
    const t = createTranslator({ lang: "wo", reference, catalog: {} });
    expect(t("inbox.unread", { count: 1 })).toBe("1 message");
  });

  it("uses the single Wolof form whatever the count", () => {
    const t = createTranslator({ lang: "wo", reference, catalog: wolof });
    expect(t("inbox.unread", { count: 1 })).toBe("WO 1");
  });

  it("types keys from the reference catalog", () => {
    const t = createTranslator({ lang: "fr", reference: fr, catalog: fr });
    expect(t("tabs.home")).toBe("Accueil");
    // @ts-expect-error a misspelled key must not compile
    t("tabs.hom");
    // @ts-expect-error a group is not a message
    t("tabs");
  });

  it("returns the key itself if it exists nowhere", () => {
    const t = createTranslator({ lang: "fr", reference: {}, catalog: {} });
    expect(t("missing.key" as never)).toBe("missing.key");
  });
});
