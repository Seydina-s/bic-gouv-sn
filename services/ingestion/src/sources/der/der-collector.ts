import type { JsonDocument } from "@bgs/content-store";
import {
  DER_ORIGIN,
  EMPTY_ENTREPRENDRE,
  ENTREPRENDRE_PAGES,
  entreprendreDocumentSchema,
  type EntreprendreDocument,
  type EntreprendreNews,
  type EntreprendrePage,
} from "@bgs/shared-types";
import { z } from "zod";
import { contentHash } from "../../lib/identity";
import { completedChainFetch } from "../../lib/completed-chain-fetch";
import { createPoliteHttp } from "../../lib/polite-http";
import { plainLetters, textLength } from "../../lib/sanitize";
import { derPageHtml } from "./der-page";

/*
 * Collects the "Entreprendre" space (DER-01) from der.sn: the pages listed in
 * ENTREPRENDRE_PAGES, read as published, and the latest news. A page whose words
 * cannot be read keeps its last good version (quarantine): nothing is overwritten
 * by an empty or broken page, and a change of words is a new version.
 */

/** Below this, a page's words are not trusted (a changed theme, an error page). */
const MIN_PAGE_TEXT = 80;
const NEWS_COUNT = 20;
const EXCERPT_LENGTH = 220;

type PageDefinition = (typeof ENTREPRENDRE_PAGES)[number];

/** What der.sn's own interface says of a page and a news item (WordPress). */
const wpPageSchema = z.array(
  z.object({
    title: z.object({ rendered: z.string() }),
    modified_gmt: z.string(),
    link: z.string(),
  }),
);
const wpPostSchema = z.array(
  z.object({
    date: z.string(),
    link: z.string(),
    title: z.object({ rendered: z.string() }),
    excerpt: z.object({ rendered: z.string() }),
  }),
);

/** Text of a WordPress field: no tags, entities read, decorative letters plain. */
function plainText(html: string): string {
  const decoded = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&rsquo;/g, "’")
    .replace(/&hellip;|\[&hellip;\]|\[…\]/g, "…");
  return plainLetters(decoded).replace(/\s+/g, " ").trim();
}

function cut(text: string, length: number): string {
  if (text.length <= length) {
    return text;
  }
  const slice = text.slice(0, length);
  return `${slice.slice(0, Math.max(slice.lastIndexOf(" "), length / 2)).trimEnd()}…`;
}

export interface DerPageRead {
  title: string;
  sourceUrl: string;
  sourceUpdatedAt: string | null;
  bodyHtml: string;
}

export interface DerSource {
  page(definition: PageDefinition): Promise<DerPageRead>;
  news(): Promise<EntreprendreNews[]>;
}

/**
 * der.sn sends its certificate without the intermediate (15/10/2026): the chain is
 * completed from the address its certificate names, checked against the system's
 * trusted roots (completed-chain-fetch.ts).
 */
const DER_INTERMEDIATE = "http://crt.sectigo.com/SectigoPublicServerAuthenticationCADVR36.crt";

/** der.sn read politely (one request a second, timeouts, circuit breaker). */
export function createDerSource(
  fetchImpl: typeof fetch = completedChainFetch(DER_INTERMEDIATE),
): DerSource {
  const http = createPoliteHttp({ dependency: "der.sn", fetchImpl });
  const api = (path: string) => `${DER_ORIGIN}/wp-json/wp/v2/${path}`;
  return {
    async page(definition) {
      const slug = definition.path.split("/").filter(Boolean).at(-1) ?? "";
      const [info] = wpPageSchema.parse(
        await http.read(
          api(`pages?slug=${encodeURIComponent(slug)}&_fields=title,modified_gmt,link`),
          (response) => response.json(),
        ),
      );
      const sourceUrl = `${DER_ORIGIN}/${definition.path}`;
      const html = await http.read(sourceUrl, (response) => response.text());
      return {
        title: info === undefined ? "" : plainText(info.title.rendered),
        sourceUrl,
        sourceUpdatedAt: info === undefined ? null : `${info.modified_gmt}Z`,
        bodyHtml: derPageHtml(html),
      };
    },
    async news() {
      const posts = wpPostSchema.parse(
        await http.read(
          api(`posts?per_page=${String(NEWS_COUNT)}&_fields=date,link,title,excerpt`),
          (response) => response.json(),
        ),
      );
      return posts.map((post) => ({
        title: plainText(post.title.rendered),
        publishedOn: post.date.slice(0, 10),
        sourceUrl: post.link,
        excerpt: cut(plainText(post.excerpt.rendered), EXCERPT_LENGTH),
      }));
    },
  };
}

export interface EntreprendreReport {
  created: string[];
  updated: string[];
  unchanged: string[];
  /** Pages that could not be read or whose words were not trusted: their last version stays. */
  kept: { slug: string; reason: string }[];
  news: number | null;
  newsError?: string;
}

/** The page as it will be kept, from what was read and what was kept before. */
function nextPage(
  definition: PageDefinition,
  read: DerPageRead,
  before: EntreprendrePage | undefined,
  fetchedAt: string,
): EntreprendrePage {
  const hash = contentHash({ title: read.title, bodyHtml: read.bodyHtml });
  return {
    slug: definition.slug,
    group: definition.group,
    title: read.title,
    sourceUrl: read.sourceUrl,
    sourceUpdatedAt: read.sourceUpdatedAt,
    fetchedAt,
    contentHash: hash,
    version:
      before === undefined ? 1 : before.contentHash === hash ? before.version : before.version + 1,
    bodyHtml: read.bodyHtml,
  };
}

/** Reads der.sn and saves what changed in `document`. */
export async function collectEntreprendre(
  document: JsonDocument,
  source: DerSource,
  now: () => Date = () => new Date(),
): Promise<EntreprendreReport> {
  const saved = entreprendreDocumentSchema.safeParse(await document.read());
  const before: EntreprendreDocument = saved.success ? saved.data : EMPTY_ENTREPRENDRE;
  const report: EntreprendreReport = {
    created: [],
    updated: [],
    unchanged: [],
    kept: [],
    news: null,
  };
  const pages: EntreprendrePage[] = [];
  for (const definition of ENTREPRENDRE_PAGES) {
    const previous = before.pages.find((page) => page.slug === definition.slug);
    const read = await source
      .page(definition)
      .catch((error: unknown) => (error instanceof Error ? error.message : String(error)));
    const reason =
      typeof read === "string"
        ? read
        : read.title === "" || textLength(read.bodyHtml) < MIN_PAGE_TEXT
          ? "words missing or too short"
          : null;
    if (typeof read === "string" || reason !== null) {
      report.kept.push({ slug: definition.slug, reason: reason ?? "unreadable" });
      if (previous !== undefined) {
        pages.push(previous);
      }
      continue;
    }
    const page = nextPage(definition, read, previous, now().toISOString());
    const bucket =
      previous === undefined
        ? report.created
        : page.version === previous.version
          ? report.unchanged
          : report.updated;
    bucket.push(definition.slug);
    pages.push(
      page.version === previous?.version ? { ...previous, fetchedAt: page.fetchedAt } : page,
    );
  }
  const news = await source.news().catch((error: unknown) => {
    report.newsError = error instanceof Error ? error.message : String(error);
    return null;
  });
  report.news = news === null ? null : news.length;
  const next: EntreprendreDocument = {
    pages,
    news: news !== null && news.length > 0 ? news : before.news,
    newsFetchedAt: news !== null && news.length > 0 ? now().toISOString() : before.newsFetchedAt,
  };
  await document.update(() => ({ next: entreprendreDocumentSchema.parse(next), result: null }));
  return report;
}
