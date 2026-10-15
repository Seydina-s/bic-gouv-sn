import type { JsonDocument } from "@bgs/content-store";
import { ENTREPRENDRE_PAGES, entreprendreDocumentSchema } from "@bgs/shared-types";
import { describe, expect, it } from "vitest";
import {
  collectEntreprendre,
  createDerSource,
  type DerPageRead,
  type DerSource,
} from "./der-collector";
import { derPageHtml } from "./der-page";

// A page built like der.sn's (Divi modules), with placeholder words.
const PAGE = `<html><body>
<nav class="et_pb_menu"><a href="/">Accueil</a></nav>
<div id="main-content">
  <div class="et_pb_module et_pb_fullwidth_header">
    <h1 class="et_pb_module_header">Devenez un entrepreneur</h1>
    <span class="et_pb_fullwidth_header_subhead">Comment déposer un dossier fictif</span>
  </div>
  <div class="et_pb_module et_pb_number_counter"><span>+ 1000</span></div>
  <div class="et_pb_module et_pb_text"><div class="et_pb_text_inner">la première mission fictive ;</div></div>
  <div class="et_pb_module et_pb_blurb"><div class="et_pb_blurb_container">
    <h4 class="et_pb_module_header"><span>𝐍𝐀𝐍𝐎-𝐂𝐑𝐄𝐃𝐈𝐓</span></h4>
    <div class="et_pb_blurb_description"><p><p><strong>Montant fictif</strong></p></p></div>
  </div></div>
  <div class="et_pb_module et_pb_toggle">
    <h5 class="et_pb_toggle_title">Documents à scanner</h5>
    <div class="et_pb_toggle_content"><ul><li>Pièce fictive</li></ul><script>alert(1)</script></div>
  </div>
</div></body></html>`;

describe("a der.sn page", () => {
  it("is read module by module: its heading, texts, blurbs and toggles, nothing else", () => {
    expect(derPageHtml(PAGE)).toBe(
      "<h2>Comment déposer un dossier fictif</h2>" +
        "<p>la première mission fictive ;</p>" +
        "<h3>NANO-CREDIT</h3><p><strong>Montant fictif</strong></p>" +
        "<h3>Documents à scanner</h3><ul><li>Pièce fictive</li></ul>",
    );
  });

  it("gives nothing without its main content", () => {
    expect(derPageHtml("<html><body><p>Maintenance</p></body></html>")).toBe("");
  });
});

/** A document kept in memory, as the file or the database would keep it. */
function memoryDocument(): JsonDocument & { value: unknown } {
  const store = {
    value: undefined as unknown,
    read: () => Promise.resolve(store.value),
    update<R>(change: (saved: unknown) => { next?: unknown; result: R }) {
      const { next, result } = change(store.value);
      if (next !== undefined) {
        store.value = next;
      }
      return Promise.resolve(result);
    },
  };
  return store;
}

const LONG = "<p>" + "Texte officiel fictif de la page. ".repeat(5) + "</p>";

function source(words: (slug: string) => string | null): DerSource {
  return {
    page: (definition) => {
      const body = words(definition.slug);
      return body === null
        ? Promise.reject(new Error("unreachable"))
        : Promise.resolve<DerPageRead>({
            title: `Titre ${definition.slug}`,
            sourceUrl: `https://www.der.sn/${definition.path}`,
            sourceUpdatedAt: "2026-10-01T10:00:00Z",
            bodyHtml: body,
          });
    },
    news: () =>
      Promise.resolve([
        {
          title: "Actualité fictive",
          publishedOn: "2026-10-12",
          sourceUrl: "https://www.der.sn/actualite-fictive/",
          excerpt: "Premiers mots fictifs…",
        },
      ]),
  };
}

describe("the Entreprendre space collected", () => {
  it("keeps every page with its link, versions a change, and never overwrites with an unreadable page", async () => {
    const document = memoryDocument();
    let times = 0;
    const now = () => new Date(Date.UTC(2026, 9, 15, 10, times++));
    const first = await collectEntreprendre(
      document,
      source(() => LONG),
      now,
    );
    expect(first.created).toHaveLength(ENTREPRENDRE_PAGES.length);
    const changed = await collectEntreprendre(
      document,
      source((slug) =>
        slug === "presentation"
          ? `${LONG}<p>Une phrase ajoutée.</p>`
          : slug === "antennes"
            ? null
            : "<p>Vide</p>",
      ),
      now,
    );
    expect(changed.updated).toEqual(["presentation"]);
    // Unreachable, or too short to be trusted: the last good version stays.
    expect(changed.kept.map(({ slug }) => slug)).toEqual(
      ENTREPRENDRE_PAGES.map((page) => page.slug).filter((slug) => slug !== "presentation"),
    );
    expect(changed.kept.find(({ slug }) => slug === "antennes")?.reason).toBe("unreachable");
    const kept = entreprendreDocumentSchema.parse(document.value);
    expect(kept.pages).toHaveLength(ENTREPRENDRE_PAGES.length);
    expect(kept.pages.find((page) => page.slug === "presentation")).toMatchObject({
      version: 2,
      sourceUrl: "https://www.der.sn/la-der-fj/presentation/",
    });
    expect(kept.pages.find((page) => page.slug === "antennes")).toMatchObject({
      version: 1,
      bodyHtml: LONG,
    });
    expect(kept.news).toHaveLength(1);
  });
});

describe("der.sn read through its own interface", () => {
  // Placeholder answers shaped like der.sn's WordPress interface and pages.
  const fakeDer = ((input: string | URL | Request) => {
    const url = String(input);
    if (url.includes("/wp-json/wp/v2/pages")) {
      return Promise.resolve(
        Response.json([
          {
            title: { rendered: "Pr&#233;sentation fictive" },
            modified_gmt: "2026-10-01T10:00:00",
            link: "https://www.der.sn/la-der-fj/presentation/",
          },
        ]),
      );
    }
    if (url.includes("/wp-json/wp/v2/posts")) {
      return Promise.resolve(
        Response.json([
          {
            date: "2026-10-12T14:18:17",
            link: "https://www.der.sn/actualite-fictive/",
            title: { rendered: "𝐀𝐩𝐩𝐞𝐥 &#224; candidatures fictif &amp; ouvert" },
            excerpt: { rendered: `<p>${"Mot fictif ".repeat(40)}[&hellip;]</p>` },
          },
        ]),
      );
    }
    return Promise.resolve(new Response(PAGE));
  }) as typeof fetch;

  it("reads a page's title and date there, and its words on the page itself", async () => {
    const [presentation] = ENTREPRENDRE_PAGES;
    const read = await createDerSource(fakeDer).page(presentation);
    expect(read).toMatchObject({
      title: "Présentation fictive",
      sourceUrl: "https://www.der.sn/la-der-fj/presentation/",
      sourceUpdatedAt: "2026-10-01T10:00:00Z",
    });
    expect(read.bodyHtml).toContain("<h3>Documents à scanner</h3>");
  });

  it("reads the news with plain titles and first words cut at a word", async () => {
    const [news] = await createDerSource(fakeDer).news();
    expect(news).toMatchObject({
      title: "Appel à candidatures fictif & ouvert",
      publishedOn: "2026-10-12",
      sourceUrl: "https://www.der.sn/actualite-fictive/",
    });
    expect(news?.excerpt.length).toBeLessThanOrEqual(221);
    expect(news?.excerpt.endsWith("…")).toBe(true);
  });
});

describe("the Entreprendre news when der.sn does not answer", () => {
  it("keeps the last news read and says why", async () => {
    const document = memoryDocument();
    await collectEntreprendre(
      document,
      source(() => LONG),
    );
    const silent: DerSource = {
      page: () => Promise.reject(new Error("unreachable")),
      news: () => Promise.reject(new Error("news unreachable")),
    };
    const report = await collectEntreprendre(document, silent);
    expect(report).toMatchObject({ news: null, newsError: "news unreachable" });
    expect(entreprendreDocumentSchema.parse(document.value).news).toHaveLength(1);
  });
});
