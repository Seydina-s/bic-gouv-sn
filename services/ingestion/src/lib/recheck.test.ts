import { describe, expect, it, vi } from "vitest";
import { createDrupalProvider } from "../sources/drupal/drupal-provider";
import { DRUPAL_MINISTRIES } from "../sources/drupal/ministries";
import { createMesriProvider } from "../sources/mesri/mesri-provider";
import { createNumeriqueProvider, NUMERIQUE_API } from "../sources/numerique/numerique-provider";
import {
  createPresidenceProvider,
  PRESIDENCE_API,
} from "../sources/presidence/presidence-provider";
import { createPrimatureProvider } from "../sources/primature/primature-provider";
import type { SourceProvider } from "../sources/source-provider";
import { createWordpressProvider } from "../sources/wordpress/wordpress-provider";
import { WORDPRESS_MINISTRIES } from "../sources/wordpress/ministries";
import { QuarantineError, SourceUnreachableError } from "./errors";
import { createPoliteHttp } from "./polite-http";
import { lastSegmentOf, recheckPage, recheckWith } from "./recheck";

const answering = (status: number, body = "") =>
  vi.fn<typeof fetch>(() => Promise.resolve(new Response(body, { status })));

describe("recheckWith", () => {
  it("tells a page gone for good from a passing failure", async () => {
    const failing = (error: Error) => recheckWith(() => Promise.reject(error));
    expect(await recheckWith(() => Promise.resolve(true))).toBe("still-published");
    expect(await recheckWith(() => Promise.resolve(false))).toBe("withdrawn");
    expect(await failing(new SourceUnreachableError("https://x.sn/a", 404))).toBe("withdrawn");
    expect(await failing(new SourceUnreachableError("https://x.sn/a", 410))).toBe("withdrawn");
    expect(await failing(new QuarantineError("https://x.sn/a", "article is not published"))).toBe(
      "withdrawn",
    );
    for (const passing of [
      new SourceUnreachableError("https://x.sn/a", 503),
      new SourceUnreachableError("https://x.sn/a", 403),
      new SourceUnreachableError("https://x.sn/a", null),
      new QuarantineError("https://x.sn/a", "site structure changed?"),
      new Error("anything else"),
    ]) {
      expect(await failing(passing)).toBe("unconfirmed");
    }
  });
});

describe("recheckPage", () => {
  it("asks for the page and reads only the answer", async () => {
    const fetchImpl = answering(200, "<html>long page</html>");
    const http = createPoliteHttp({ dependency: "x.sn", fetchImpl, intervalMs: 0 });
    expect(await recheckPage(http, "https://x.sn/article/")).toBe("still-published");
    expect(fetchImpl.mock.calls[0]?.[0]).toBe("https://x.sn/article/");
    const gone = createPoliteHttp({ dependency: "x.sn", fetchImpl: answering(404), intervalMs: 0 });
    expect(await recheckPage(gone, "https://x.sn/article/")).toBe("withdrawn");
  });
});

describe("lastSegmentOf", () => {
  it("names the article as its address does", () => {
    expect(lastSegmentOf("https://www.presidence.sn/fr/actualites/un-titre/")).toBe("un-titre");
    expect(lastSegmentOf("https://www.mctn.sn/post/l%C3%A9t%C3%A9")).toBe("lété");
  });
});

/** Each site that can be checked, and the address it is asked about. */
describe("SourceProvider.recheck", () => {
  const options = (fetchImpl: typeof fetch) => ({ fetchImpl, intervalMs: 0 });
  const byPage: [string, (fetchImpl: typeof fetch) => SourceProvider, string][] = [
    [
      "Primature",
      (fetchImpl) => createPrimatureProvider(options(fetchImpl)),
      "https://primature.sn/publications/actualites/un-titre",
    ],
    [
      "WordPress",
      (fetchImpl) => createWordpressProvider(WORDPRESS_MINISTRIES.justice, options(fetchImpl)),
      "https://justice.sec.gouv.sn/un-titre/",
    ],
    [
      "Enseignement supérieur",
      (fetchImpl) => createMesriProvider(options(fetchImpl)),
      "https://mesrisenegal.sn/article/un-titre",
    ],
    [
      "Drupal answering 404",
      (fetchImpl) => createDrupalProvider(DRUPAL_MINISTRIES.economie, options(fetchImpl)),
      "https://www.economie.gouv.sn/fr/blog/un-titre",
    ],
  ];

  it.each(byPage)("%s: reads the official page again", async (_name, create, sourceUrl) => {
    const fetchImpl = answering(404);
    expect(await create(fetchImpl).recheck?.(sourceUrl, "fr")).toBe("withdrawn");
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(sourceUrl);
    expect(await create(answering(200)).recheck?.(sourceUrl, "fr")).toBe("still-published");
  });

  it("is absent where the site answers every address as found", () => {
    const checkable = (site: keyof typeof DRUPAL_MINISTRIES) =>
      "recheck" in createDrupalProvider(DRUPAL_MINISTRIES[site]);
    expect(checkable("sante")).toBe(false);
    expect(checkable("forces-armees")).toBe(false);
    expect(checkable("affaires-etrangeres")).toBe(true);
  });

  it("presidence.sn: asks its interface, in the version's language", async () => {
    const fetchImpl = answering(404);
    const provider = createPresidenceProvider(options(fetchImpl));
    const sourceUrl = "https://www.presidence.sn/wo/actualites/un-titre/";
    expect(await provider.recheck?.(sourceUrl, "wo")).toBe("withdrawn");
    const [url, init] = fetchImpl.mock.calls[0] ?? [];
    expect(url).toBe(`${PRESIDENCE_API}/article/un-titre`);
    expect(init?.headers).toMatchObject({ "Accept-Language": "wo" });
  });

  it("mctn.sn: asks its interface, which gives the publication's status", async () => {
    const publication = (status: string) =>
      JSON.stringify({
        data: {
          id: 7,
          title: "Titre",
          langue: "fr",
          description: "<p>Texte</p>",
          slug: "un-titre",
          updated_at: "2026-10-01T10:00:00Z",
          status,
          publish_date: "2026-10-01",
        },
      });
    const sourceUrl = "https://www.mctn.sn/post/un-titre";
    const recheck = (fetchImpl: typeof fetch) =>
      createNumeriqueProvider(options(fetchImpl)).recheck?.(sourceUrl, "fr");
    const published = answering(200, publication("published"));
    expect(await recheck(published)).toBe("still-published");
    expect(published.mock.calls[0]?.[0]).toBe(`${NUMERIQUE_API}/publication/un-titre`);
    expect(await recheck(answering(200, publication("draft")))).toBe("withdrawn");
    expect(await recheck(answering(404))).toBe("withdrawn");
  });
});
