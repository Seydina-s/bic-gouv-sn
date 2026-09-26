import { describe, expect, it } from "vitest";
import {
  readNewsDetail,
  readNewsList,
  readProcedureDetail,
  readProcedureList,
} from "./tolerant-reader";

// Placeholder texts, not real content.
const summary = {
  id: "00000000-0000-5000-8000-000000000001",
  category: "communiques",
  publishedOn: "2026-09-24",
  lang: "fr",
  title: "Titre",
  excerpt: "Extrait",
  translationStatus: "official",
  availableLangs: ["fr"],
  cover: {
    width: 1200,
    height: 800,
    blurhash: "LEHV6nWB2yk8pyo0adR*.7kCMdnj",
    sources: [{ format: "webp", width: 480, url: "https://cdn.test/a/480.webp" }],
  },
};

const detail = {
  ...summary,
  excerpt: undefined,
  blocks: [{ type: "paragraph", inlines: [{ text: "Corps" }] }],
  sourceUrl: "https://www.presidence.sn/fr/actualites/test/",
  sourceUpdatedAt: null,
  fetchedAt: "2026-09-25T10:00:00Z",
  version: 1,
};

describe("readNewsList (a newer API talking to an older app)", () => {
  it("ignores fields this version does not know", () => {
    const list = readNewsList({
      items: [{ ...summary, audio: { url: "x" } }],
      nextCursor: null,
      total: 3,
    });
    expect(list?.items[0]).not.toHaveProperty("audio");
    expect(list).not.toHaveProperty("total");
  });

  it("skips one unreadable item instead of failing the page", () => {
    const list = readNewsList({ items: [{ ...summary, title: "" }, summary], nextCursor: null });
    expect(list?.items).toHaveLength(1);
  });

  it("keeps displayable image formats and drops the cover when none is left", () => {
    const newFormat = { format: "jxl", width: 480, url: "https://cdn.test/a/480.jxl" };
    const mixed = {
      ...summary,
      cover: { ...summary.cover, sources: [newFormat, ...summary.cover.sources] },
    };
    expect(
      readNewsList({ items: [mixed], nextCursor: null })?.items[0]?.cover?.sources,
    ).toHaveLength(1);
    const unknownOnly = { ...summary, cover: { ...summary.cover, sources: [newFormat] } };
    expect(readNewsList({ items: [unknownOnly], nextCursor: null })?.items[0]?.cover).toBeNull();
    expect(
      readNewsList({ items: [{ ...summary, cover: "x" }], nextCursor: null })?.items[0]?.cover,
    ).toBeNull();
  });

  it("refuses a page whose essential shape is broken", () => {
    expect(readNewsList(null)).toBeNull();
    expect(readNewsList({ items: "no", nextCursor: null })).toBeNull();
    expect(readNewsList({ items: [] })).toBeNull();
  });
});

describe("readNewsDetail", () => {
  it("drops block types this version cannot display", () => {
    const article = readNewsDetail({
      ...detail,
      blocks: [{ type: "podcast", url: "https://cdn.test/p.mp3" }, ...detail.blocks],
    });
    expect(article?.blocks).toEqual(detail.blocks);
  });

  it("refuses an article without its essentials", () => {
    expect(readNewsDetail({ ...detail, sourceUrl: undefined })).toBeNull();
    expect(readNewsDetail("broken")).toBeNull();
  });
});

describe("procedures (a newer API talking to an older app)", () => {
  const summaryItem = {
    id: "00000000-0000-5000-8000-000000000001",
    slug: "extrait-de-naissance",
    title: "Extrait de naissance",
    summary: null,
    costFcfa: 1000,
    delayDays: 2,
    online: false,
  };
  const detailItem = {
    ...summaryItem,
    translationStatus: "official",
    blocks: [{ type: "podcast" }, { type: "paragraph", inlines: [{ text: "Étape" }] }],
    eligibility: null,
    documents: [],
    offices: [],
    faqs: [{ question: "Délai ?", blocks: [{ type: "podcast" }] }],
    legalTexts: [],
    usefulLinks: [],
    related: [],
    sourceUrl: "https://e-senegal.sn/#/comprendre-ma-demarche/demarche/extrait-de-naissance",
    fetchedAt: "2026-09-26T10:00:00Z",
    version: 1,
  };

  it("skips an unreadable procedure instead of failing the list", () => {
    const list = readProcedureList({
      items: [{ ...summaryItem, title: "" }, summaryItem],
      nextCursor: null,
      total: 2,
    });
    expect(list?.items).toHaveLength(1);
    expect(readProcedureList("broken")).toBeNull();
  });

  it("drops block types this version cannot display, also inside FAQ answers", () => {
    const detail = readProcedureDetail(detailItem);
    expect(detail?.blocks).toEqual([{ type: "paragraph", inlines: [{ text: "Étape" }] }]);
    expect(detail?.faqs[0]?.blocks).toEqual([]);
    expect(readProcedureDetail({ ...detailItem, sourceUrl: "https://example.com" })).toBeNull();
  });
});
