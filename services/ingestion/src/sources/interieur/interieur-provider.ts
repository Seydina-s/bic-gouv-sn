import { newsArticleSchema, officialMediaUrl, type NewsArticle } from "@bgs/shared-types";
import { z } from "zod";
import { QuarantineError } from "../../lib/errors";
import { stableUuid } from "../../lib/identity";
import { nuxtData } from "../../lib/nuxt-data";
import { createPoliteHttp } from "../../lib/polite-http";
import { plainLetters, sanitizeArticleHtml, unpublishable } from "../../lib/sanitize";
import { articleContentHash } from "../../merge";
import type { SourceArticleRef, SourceProvider } from "../source-provider";
import { youtubeIdOf } from "../wordpress/clean";
import { blocksToHtml } from "./strapi-blocks";

/*
 * interieur.gouv.sn (Nuxt and Strapi, since August 2026): the news page carries the
 * whole list of articles in its data, each article page its text as structured
 * blocks, its signed documents, videos and photo gallery (docs/sources.md).
 */

export const INTERIEUR_ORIGIN = "https://www.interieur.gouv.sn";

/** The site's sections, mapped to ours when they mean the same thing; else "actualites". */
const SECTIONS: Readonly<Record<string, string>> = {
  communiques: "communiques",
  discours: "discours",
};

const mediaSchema = z.object({
  url: z.string(),
  formats: z
    .record(z.string(), z.object({ url: z.string() }))
    .nullable()
    .optional(),
});

const listedSchema = z.object({
  id: z.int(),
  documentId: z.string().min(1),
  titre: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  updatedAt: z.string(),
  couverture: mediaSchema.nullable().optional(),
  categorie: z.object({ slug: z.string().regex(/^[a-z0-9-]+$/) }).nullable(),
});

const componentSchema = z.looseObject({ __component: z.string() });
const articleSchema = listedSchema.extend({
  contenu: z.array(componentSchema),
  galerie: z.array(mediaSchema).nullable().optional(),
  videoUrl: z.string().nullable().optional(),
});
type Article = z.infer<typeof articleSchema>;

const richTextSchema = z.object({ contenu: z.array(z.unknown()) });
const documentSchema = z.object({
  titre: z.string().nullable().optional(),
  fichier: z.object({ url: z.string(), ext: z.string() }),
});
const videoSchema = z.object({ url: z.string().nullable().optional() });

function absolute(path: string): string {
  return new URL(path, INTERIEUR_ORIGIN).href;
}

function escape(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Public page of an article: its section, then its name. */
export function interieurArticleUrl(path: string): string {
  return `${INTERIEUR_ORIGIN}/actualites/${path}`;
}

/** Stable id: the CMS document id, whatever the article's address becomes. */
export function interieurArticleId(documentId: string): string {
  return stableUuid(`${INTERIEUR_ORIGIN}/document/${documentId}`);
}

/** One component of the article's content as HTML (text, signed document, video). */
function component(raw: z.infer<typeof componentSchema>): string {
  switch (raw.__component) {
    case "blocks.rich-text": {
      const parsed = richTextSchema.safeParse(raw);
      return parsed.success ? blocksToHtml(parsed.data.contenu, absolute) : "";
    }
    case "blocks.document": {
      const parsed = documentSchema.safeParse(raw);
      if (!parsed.success || parsed.data.fichier.ext.toLowerCase() !== ".pdf") {
        return "";
      }
      const words = parsed.data.titre ?? "Document officiel (PDF)";
      return `<p><a href="${escape(absolute(parsed.data.fichier.url))}">${escape(words)}</a></p>`;
    }
    case "blocks.video": {
      // Videos stored by the site (MP4) are not read by the app yet (GOV-17).
      const id = youtubeIdOf(videoSchema.safeParse(raw).data?.url ?? "");
      return id === null ? "" : `<iframe src="https://www.youtube.com/embed/${id}"></iframe>`;
    }
    default:
      return "";
  }
}

function photo(media: z.infer<typeof mediaSchema>): string {
  return `<p><img src="${escape(absolute(media.formats?.["large"]?.url ?? media.url))}" alt="" /></p>`;
}

export function normalizeInterieur(article: Article, fetchedAt: string): NewsArticle {
  const section = article.categorie?.slug ?? "actualites";
  const sourceUrl = interieurArticleUrl(`${section}/${article.slug}`);
  const quarantine = (reason: string) => new QuarantineError(sourceUrl, reason);
  const title = plainLetters(article.titre.trim());
  const bodyHtml = sanitizeArticleHtml(
    [...article.contenu.map(component), ...(article.galerie ?? []).map(photo)].join(""),
  );
  if (title === "") {
    throw quarantine("article has no title");
  }
  const problem = unpublishable(title, bodyHtml, "fr");
  if (problem !== null) {
    throw quarantine(`article ${problem}`);
  }
  const category = SECTIONS[section] ?? "actualites";
  const translations: NewsArticle["translations"] = [
    { lang: "fr", status: "official", title, bodyHtml, sourceUrl },
  ];
  const candidate: NewsArticle = {
    id: interieurArticleId(article.documentId),
    kind: "news-article",
    publisher: "interieur",
    alsoPublishedBy: [],
    category,
    sourceUrl,
    sourcePublishedOn: article.date,
    sourceUpdatedAt: article.updatedAt,
    fetchedAt,
    contentHash: articleContentHash(translations, article.date, category),
    version: 1,
    lang: "fr",
    translations,
    audio: [],
    embedding: null,
    images: [],
    attachments: [],
  };
  const result = newsArticleSchema.safeParse(candidate);
  if (!result.success) {
    throw quarantine(result.error.issues.map((issue) => issue.message).join("; "));
  }
  return result.data;
}

export interface InterieurProviderOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  intervalMs?: number;
}

export function createInterieurProvider({
  fetchImpl = fetch,
  now = () => new Date(),
  intervalMs = 1000,
}: InterieurProviderOptions = {}): SourceProvider {
  const http = createPoliteHttp({ dependency: "interieur.gouv.sn", fetchImpl, intervalMs });
  const page = (url: string) =>
    http.read(url, (response) => response.text(), { Accept: "text/html" });

  return {
    circuits: () => [http.breaker.snapshot()],

    async listPage(lang, number) {
      if (lang !== "fr" || number > 1) {
        return { refs: [], lastPage: 1 };
      }
      const url = `${INTERIEUR_ORIGIN}/actualites`;
      const listed = z.array(listedSchema).safeParse(nuxtData(await page(url))?.["actualites-all"]);
      if (!listed.success) {
        throw new QuarantineError(url, "unexpected listing data (site structure changed?)");
      }
      return {
        // The news page lists every article: there is no second page.
        lastPage: 1,
        refs: listed.data.map((item): SourceArticleRef => ({
          sourceId: item.documentId,
          slug: `${item.categorie?.slug ?? "actualites"}/${item.slug}`,
          lang,
          sourceUpdatedAt: item.updatedAt,
          publishedOn: item.date,
          coverSourceUrl:
            item.couverture === null || item.couverture === undefined
              ? null
              : officialMediaUrl(absolute(item.couverture.url)),
        })),
      };
    },

    articleIdFor: (ref) => interieurArticleId(String(ref.sourceId)),

    async downloadMedia(url) {
      return Buffer.from(await http.read(url, (response) => response.arrayBuffer()));
    },

    async fetchArticle(ref) {
      const url = interieurArticleUrl(ref.slug);
      const data = nuxtData(await page(url)) ?? {};
      const key = Object.keys(data).find(
        (name) => name.startsWith("actu-") && !name.startsWith("actu-related-"),
      );
      const parsed = articleSchema.safeParse(key === undefined ? null : data[key]);
      if (!parsed.success) {
        throw new QuarantineError(url, "unexpected article data (site structure changed?)");
      }
      return normalizeInterieur(parsed.data, now().toISOString());
    },
  };
}
