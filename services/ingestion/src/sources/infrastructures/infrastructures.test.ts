import { describe, expect, it, vi } from "vitest";
import { QuarantineError } from "../../lib/errors";
import {
  createInfrastructuresProvider,
  INFRASTRUCTURES_BASE,
  INFRASTRUCTURES_SITE,
  infrastructuresArticleId,
  normalizeInfrastructures,
  paragraphs,
  publicKeyIn,
} from "./infrastructures-provider";

// A made-up token shaped like the site's public key, built here so that nothing in the
// repository looks like a real key.
function token(role: string): string {
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return [
    part({ alg: "HS256", typ: "JWT" }),
    part({ role, iss: "test" }),
    "signature-of-test",
  ].join(".");
}

// Placeholder texts, not real content.
const ROW = {
  id: "66884a75-2964-4d26-be9f-69618a3b5cf2",
  title: "Réception d'un ouvrage de test",
  content:
    "Le ministre a réceptionné un ouvrage de test à Diamniadio, en présence des équipes.\n\nLes travaux se poursuivront au cours des prochaines semaines, selon le calendrier prévu.",
  image: `${INFRASTRUCTURES_BASE}/storage/v1/object/public/images/a.jpg`,
  published: true as const,
  created_at: "2026-08-29T10:00:00+00:00",
  updated_at: "2026-09-01T12:15:37.661576+00:00",
  gallery_images: [`${INFRASTRUCTURES_BASE}/storage/v1/object/public/images/b.jpg`],
};

describe("publicKeyIn", () => {
  it("finds the public key among the site's tokens, never another one", () => {
    expect(publicKeyIn(`a="${token("service_role")}";b="${token("anon")}"`)).toBe(token("anon"));
    expect(publicKeyIn(`a="${token("service_role")}"`)).toBeNull();
  });
});

describe("normalizeInfrastructures", () => {
  it("makes paragraphs of the lines and adds the gallery", () => {
    const article = normalizeInfrastructures(ROW, "2026-10-10T02:00:00Z");
    expect(article.translations[0]?.bodyHtml.match(/<p>/g)?.length).toBe(3);
    expect(article).toMatchObject({
      id: infrastructuresArticleId(ROW.id),
      publisher: "infrastructures",
      sourcePublishedOn: "2026-08-29",
      sourceUrl: `${INFRASTRUCTURES_SITE}/actualites/${ROW.id}`,
    });
  });

  it("keeps text already written in HTML", () => {
    expect(paragraphs("<p>Déjà <strong>prêt</strong></p>")).toBe(
      "<p>Déjà <strong>prêt</strong></p>",
    );
    expect(paragraphs("Un & deux\nTrois")).toBe("<p>Un &amp; deux</p><p>Trois</p>");
  });
});

describe("createInfrastructuresProvider", () => {
  function site(rows: unknown, range = "0-0/6") {
    return vi.fn<(url: string, init?: RequestInit) => Promise<Response>>((url) => {
      if (url === INFRASTRUCTURES_SITE) {
        return Promise.resolve(new Response('<script src="/assets/index-AbC12.js"></script>'));
      }
      if (url.endsWith("/assets/index-AbC12.js")) {
        return Promise.resolve(new Response(`const k="${token("anon")}";`));
      }
      return Promise.resolve(
        new Response(JSON.stringify(rows), { headers: { "content-range": range } }),
      );
    });
  }

  it("reads the list with the site's public key, read from its code", async () => {
    const fetchImpl = site([
      { id: ROW.id, updated_at: ROW.updated_at, created_at: ROW.created_at, image: ROW.image },
    ]);
    const provider = createInfrastructuresProvider({
      fetchImpl: fetchImpl as never,
      intervalMs: 0,
    });
    const page = await provider.listPage("fr", 1);
    expect(page.lastPage).toBe(1);
    expect(page.refs[0]).toMatchObject({ sourceId: ROW.id, publishedOn: "2026-08-29" });
    const [url, init] = fetchImpl.mock.calls.at(-1) ?? [];
    expect(url).toMatch(/\/rest\/v1\/actualites\?select=.*published=eq\.true/);
    expect(init?.headers).toMatchObject({ apikey: token("anon") });
  });

  it("reads one published article", async () => {
    const provider = createInfrastructuresProvider({
      fetchImpl: site([ROW]) as never,
      intervalMs: 0,
    });
    const article = await provider.fetchArticle({
      sourceId: ROW.id,
      slug: ROW.id,
      lang: "fr",
      sourceUpdatedAt: "",
      coverSourceUrl: null,
    });
    expect(article.publisher).toBe("infrastructures");
  });

  it("sets aside an article no longer published", async () => {
    const provider = createInfrastructuresProvider({ fetchImpl: site([]) as never, intervalMs: 0 });
    await expect(
      provider.fetchArticle({
        sourceId: ROW.id,
        slug: ROW.id,
        lang: "fr",
        sourceUpdatedAt: "",
        coverSourceUrl: null,
      }),
    ).rejects.toBeInstanceOf(QuarantineError);
  });
});
