import type { NewsDetail, NewsListResponse } from "@bgs/shared-types";

// Test data with placeholder texts, not real government content.
export const LIST: NewsListResponse = {
  items: [
    {
      id: "00000000-0000-5000-8000-000000000002",
      category: "conseil-des-ministres",
      publishedOn: "2026-09-24",
      lang: "fr",
      title: "Titre de test A",
      excerpt: "Extrait de test A.",
      translationStatus: "official",
      availableLangs: ["fr"],
    },
    {
      id: "00000000-0000-5000-8000-000000000001",
      category: "rubrique-inconnue",
      publishedOn: null,
      lang: "fr",
      title: "Titre de test B",
      excerpt: "",
      translationStatus: "official",
      availableLangs: ["fr", "wo"],
    },
  ],
  nextCursor: null,
};

export const DETAIL: NewsDetail = {
  id: "00000000-0000-5000-8000-000000000002",
  category: "conseil-des-ministres",
  publishedOn: "2026-09-24",
  lang: "fr",
  title: "Titre de test A",
  translationStatus: "official",
  availableLangs: ["fr"],
  blocks: [
    { type: "paragraph", inlines: [{ text: "Paragraphe de test." }] },
    { type: "heading", level: 3, inlines: [{ text: "Intertitre" }] },
    {
      type: "list",
      ordered: true,
      items: [[{ text: "Point un" }], [{ text: "Point deux", bold: true }]],
    },
    { type: "list", ordered: false, items: [[{ text: "Puce" }]] },
    { type: "quote", inlines: [{ text: "Citation", italic: true }] },
    { type: "paragraph", inlines: [{ text: "Lien", href: "https://www.presidence.sn/fr/" }] },
    { type: "image", src: "https://bo-admin.presidence.sn/storage/test.jpg", alt: null },
  ],
  sourceUrl: "https://www.presidence.sn/fr/actualites/test/",
  sourceUpdatedAt: "2026-09-24T10:00:00Z",
  fetchedAt: "2026-09-25T10:00:00Z",
  version: 1,
};

/** Fake fetch answering the two news endpoints. */
export function newsFetch(overrides: { list?: () => Response; detail?: () => Response } = {}) {
  return jest.fn((input: string) =>
    Promise.resolve(
      input.includes("/v1/news?")
        ? (overrides.list?.() ?? new Response(JSON.stringify(LIST)))
        : (overrides.detail?.() ?? new Response(JSON.stringify(DETAIL))),
    ),
  );
}
