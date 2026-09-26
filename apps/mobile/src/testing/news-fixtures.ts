import type { Cover, NewsDetail, NewsListResponse, NewsSectionsResponse } from "@bgs/shared-types";
import { PROCEDURE_DETAIL, PROCEDURE_LIST } from "./procedure-fixtures";

export const COVER: Cover = {
  width: 1200,
  height: 800,
  blurhash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
  sources: [
    { format: "avif", width: 480, url: "https://api.test/media/images/a/480.avif" },
    { format: "webp", width: 960, url: "https://api.test/media/images/a/960.webp" },
    { format: "webp", width: 480, url: "https://api.test/media/images/a/480.webp" },
    { format: "jpeg", width: 480, url: "https://api.test/media/images/a/480.jpg" },
  ],
};

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
      cover: COVER,
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
      cover: COVER,
    },
  ],
  nextCursor: null,
};

/** Front page rows built from the same placeholder stories. */
export const SECTIONS: NewsSectionsResponse = {
  sections: LIST.items.map((item) => ({ category: item.category, total: 12, items: [item] })),
};

export const DETAIL: NewsDetail = {
  id: "00000000-0000-5000-8000-000000000002",
  category: "conseil-des-ministres",
  publishedOn: "2026-09-24",
  lang: "fr",
  title: "Titre de test A",
  translationStatus: "official",
  availableLangs: ["fr"],
  cover: COVER,
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

/** Fake fetch answering the news and procedures endpoints. */
export function newsFetch(
  overrides: {
    list?: () => Response;
    detail?: () => Response;
    search?: () => Response;
    sections?: () => Response;
    procedures?: () => Response;
  } = {},
) {
  return jest.fn((input: string) => {
    if (input.includes("/v1/procedures?")) {
      return Promise.resolve(
        overrides.procedures?.() ?? new Response(JSON.stringify(PROCEDURE_LIST)),
      );
    }
    if (input.includes("/v1/procedures/")) {
      return Promise.resolve(new Response(JSON.stringify(PROCEDURE_DETAIL)));
    }
    if (input.includes("/v1/news/sections?")) {
      return Promise.resolve(overrides.sections?.() ?? new Response(JSON.stringify(SECTIONS)));
    }
    if (input.includes("/v1/news/search?")) {
      return Promise.resolve(overrides.search?.() ?? new Response(JSON.stringify(LIST)));
    }
    return Promise.resolve(
      input.includes("/v1/news?")
        ? (overrides.list?.() ?? new Response(JSON.stringify(LIST)))
        : (overrides.detail?.() ?? new Response(JSON.stringify(DETAIL))),
    );
  });
}
