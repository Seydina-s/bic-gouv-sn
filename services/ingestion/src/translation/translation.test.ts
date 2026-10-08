import type { NewsArticle, Translation } from "@bgs/shared-types";
import { describe, expect, it } from "vitest";
import { checkTranslation } from "./translation-check";
import { articlesToTranslate, examplePairs, frenchToTranslate } from "./wolof-candidates";
import { translationRequest, translationSystem } from "./wolof-prompt";

// Placeholder texts, not real content.
const IMAGE = "https://bo-admin.presidence.sn/storage/image/content/test.jpeg";
const FRENCH_BODY = `<p><img src="${IMAGE}" /></p><p>Un texte français fictif pour les essais.</p>`;

function translation(lang: "fr" | "wo", overrides: Partial<Translation> = {}): Translation {
  return {
    lang,
    status: "official",
    title: lang === "fr" ? "Titre fictif" : "Tur bu fictif",
    bodyHtml: FRENCH_BODY,
    sourceUrl: `https://www.presidence.sn/${lang}/actualites/test`,
    ...overrides,
  };
}

function article(n: number, publishedOn: string, translations: Translation[]): NewsArticle {
  return {
    id: `00000000-0000-5000-8000-${String(n).padStart(12, "0")}`,
    sourcePublishedOn: publishedOn,
    translations,
  } as NewsArticle;
}

describe("the articles to translate into Wolof", () => {
  it("are those with an official French version and no Wolof one, newest first", () => {
    const frenchOnly = article(1, "2025-11-02", [translation("fr")]);
    const older = article(2, "2025-10-05", [translation("fr")]);
    const paired = article(3, "2025-12-01", [translation("fr"), translation("wo")]);
    const translated = article(4, "2025-12-01", [
      translation("fr"),
      translation("wo", { status: "machine", sourceUrl: undefined }),
    ]);
    const withdrawn = article(5, "2025-12-01", [
      translation("fr", { withdrawnAt: "2025-12-02T10:00:00Z" }),
    ]);
    const all = [older, paired, frenchOnly, translated, withdrawn];
    expect(articlesToTranslate(all, null).map((a) => a.id)).toEqual([frenchOnly.id, older.id]);
    expect(articlesToTranslate(all, "2025-11-01").map((a) => a.id)).toEqual([frenchOnly.id]);
    expect(frenchToTranslate(paired)).toBeNull();
  });

  it("learn from the most recent official pairs of a useful length", () => {
    const long = `<p>${"Un texte fictif. ".repeat(60)}</p>`;
    const pairs = [
      article(1, "2025-09-01", [
        translation("fr", { bodyHtml: long }),
        translation("wo", { bodyHtml: long }),
      ]),
      article(2, "2025-09-10", [
        translation("fr", { bodyHtml: long }),
        translation("wo", { bodyHtml: long }),
      ]),
      article(3, "2025-09-20", [translation("fr"), translation("wo")]),
    ];
    const chosen = examplePairs(pairs, 1);
    expect(chosen).toHaveLength(1);
    expect(chosen[0]?.wolof.title).toBe("Tur bu fictif");
    expect(examplePairs(pairs)).toHaveLength(2);
  });
});

describe("the translation prompt", () => {
  it("gives fixed rules and examples, then the article as data", () => {
    const system = translationSystem([
      { french: { title: "A", bodyHtml: "<p>a</p>" }, wolof: { title: "B", bodyHtml: "<p>b</p>" } },
    ]);
    expect(system).toContain("Keep the HTML exactly");
    expect(system).toContain('<example number="1">');
    expect(translationRequest({ title: "T", bodyHtml: "<p>x</p>" })).toBe(
      '<article>{"title":"T","bodyHtml":"<p>x</p>"}</article>',
    );
  });
});

describe("checkTranslation", () => {
  const french = { title: "Titre fictif", bodyHtml: FRENCH_BODY };
  const reply = (bodyHtml: string, title = "Tur bu fictif") => JSON.stringify({ title, bodyHtml });

  it("keeps a clean translation with the same structure and images", () => {
    const body = `<p><img src="${IMAGE}" /></p><p>Mbind mu fictif ngir seetlu yi, lu gudd.</p>`;
    expect(checkTranslation(french, `Voici : ${reply(body)}`)).toEqual({
      ok: true,
      title: "Tur bu fictif",
      bodyHtml: body,
    });
  });

  it("lets emphasis move with the words, and an empty paragraph go", () => {
    const withEmphasis = {
      title: "Titre fictif",
      bodyHtml: `<p><strong>Un texte</strong> français fictif pour les essais.</p><p><strong><br /></strong></p><p><img src="${IMAGE}" /></p>`,
    };
    const moved = `<p>Mbind mu fictif ngir <strong>seetlu yi</strong>, lu gudd.</p><p><img src="${IMAGE}" /></p>`;
    expect(checkTranslation(withEmphasis, reply(moved))).toMatchObject({ ok: true });
  });

  it("cleans what it keeps like any scraped article", () => {
    const body = `<p><img src="${IMAGE}" /></p><p onclick="x()">Mbind mu fictif ngir seetlu yi, lu gudd.</p><script>x()</script>`;
    const checked = checkTranslation(french, reply(body));
    expect(checked.ok && checked.bodyHtml).not.toMatch(/onclick|script/);
  });

  it.each([
    ["unreadable", "pas du JSON"],
    ["empty", reply(`<p><img src="${IMAGE}" /></p><p></p>`)],
    ["structure_changed", reply(`<p>Mbind mu fictif ngir seetlu yi, lu gudd.</p>`)],
    [
      "media_changed",
      reply(
        `<p><img src="https://bo-admin.presidence.sn/autre.jpeg" /></p><p>Mbind mu fictif ngir seetlu yi, lu gudd.</p>`,
      ),
    ],
    ["length_off", reply(`<p><img src="${IMAGE}" /></p><p>Waaw.</p>`)],
  ])("refuses a reply %s", (refusal, text) => {
    expect(checkTranslation(french, text)).toEqual({ ok: false, refusal });
  });
});
