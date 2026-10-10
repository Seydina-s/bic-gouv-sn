import { newsArticleSchema, officialMediaUrl, type NewsArticle } from "@bgs/shared-types";
import { z } from "zod";
import { QuarantineError } from "../../lib/errors";
import { stableUuid } from "../../lib/identity";
import { createPoliteHttp } from "../../lib/polite-http";
import { plainLetters, sanitizeNested, unpublishable } from "../../lib/sanitize";
import { articleContentHash } from "../../merge";
import type { SourceArticleRef, SourceProvider } from "../source-provider";

/*
 * ministeredesinfrastructures.sn: a React site reading its published news from a
 * Supabase table ("actualites"), with the public ("anon") key every visitor's browser
 * receives in the site's code. The key is read there at each start, never copied into
 * this repository; only published rows are read, as the site shows them.
 */

export const INFRASTRUCTURES_SITE = "https://www.ministeredesinfrastructures.sn";
/** The site's Supabase project (its photos are served from there). */
export const INFRASTRUCTURES_BASE = "https://usbtgkwvfxarfgncrtea.supabase.co";
const PER_PAGE = 20;

const rowSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  content: z.string().nullable(),
  image: z.string().nullable(),
  published: z.literal(true),
  created_at: z.string(),
  updated_at: z.string(),
  gallery_images: z.array(z.string()).nullable().optional(),
});
type Row = z.infer<typeof rowSchema>;

/** The public key in the site's code: a token whose "role" is "anon", or null. */
export function publicKeyIn(code: string): string | null {
  for (const [token] of code.matchAll(/eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/g)) {
    try {
      const claims = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString()) as {
        role?: unknown;
      };
      if (claims.role === "anon") {
        return token;
      }
    } catch {
      // Not a token.
    }
  }
  return null;
}

function escape(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

/** Plain text written line by line, as paragraphs; text already in HTML is kept. */
export function paragraphs(content: string): string {
  if (/<p[\s>]/i.test(content)) {
    return content;
  }
  return content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => `<p>${escape(line)}</p>`)
    .join("");
}

export function infrastructuresArticleId(id: string): string {
  return stableUuid(`${INFRASTRUCTURES_SITE}/actualites/${id}`);
}

export function normalizeInfrastructures(row: Row, fetchedAt: string): NewsArticle {
  const sourceUrl = `${INFRASTRUCTURES_SITE}/actualites/${row.id}`;
  const quarantine = (reason: string) => new QuarantineError(sourceUrl, reason);
  const title = plainLetters(row.title.replace(/\s+/g, " ").trim());
  const gallery = (row.gallery_images ?? [])
    .map((url) => officialMediaUrl(url))
    .filter((url): url is string => url !== null)
    .map((url) => `<p><img src="${url}" alt="" /></p>`);
  const bodyHtml = sanitizeNested([paragraphs(row.content ?? ""), ...gallery].join(""));
  if (title === "") {
    throw quarantine("article has no title");
  }
  const problem = unpublishable(title, bodyHtml, "fr");
  if (problem !== null) {
    throw quarantine(`article ${problem}`);
  }
  const day = row.created_at.slice(0, 10);
  const translations: NewsArticle["translations"] = [
    { lang: "fr", status: "official", title, bodyHtml, sourceUrl },
  ];
  const candidate: NewsArticle = {
    id: infrastructuresArticleId(row.id),
    kind: "news-article",
    publisher: "infrastructures",
    alsoPublishedBy: [],
    category: "actualites",
    sourceUrl,
    sourcePublishedOn: day,
    sourceUpdatedAt: new Date(row.updated_at).toISOString(),
    fetchedAt,
    contentHash: articleContentHash(translations, day, "actualites"),
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

export interface InfrastructuresProviderOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
  intervalMs?: number;
}

export function createInfrastructuresProvider({
  fetchImpl = fetch,
  now = () => new Date(),
  intervalMs = 1000,
}: InfrastructuresProviderOptions = {}): SourceProvider {
  const http = createPoliteHttp({
    dependency: "ministeredesinfrastructures.sn",
    fetchImpl,
    intervalMs,
  });
  let key: Promise<string> | null = null;

  /** The public key, read once from the site's own code. */
  function publicKey(): Promise<string> {
    key ??= (async () => {
      const home = await http.read(INFRASTRUCTURES_SITE, (response) => response.text());
      const script = /src="(\/assets\/index-[\w-]+\.js)"/.exec(home)?.[1];
      const code =
        script === undefined
          ? ""
          : await http.read(`${INFRASTRUCTURES_SITE}${script}`, (response) => response.text());
      const found = publicKeyIn(code);
      if (found === null) {
        throw new QuarantineError(INFRASTRUCTURES_SITE, "public key not found in the site's code");
      }
      return found;
    })();
    // A failed reading is retried at the next call.
    key.catch(() => {
      key = null;
    });
    return key;
  }

  async function rows(query: string): Promise<{ rows: unknown; total: number }> {
    const token = await publicKey();
    return http.read(
      `${INFRASTRUCTURES_BASE}/rest/v1/actualites?${query}`,
      async (response) => ({
        rows: (await response.json()) as unknown,
        total: Number(/\/(\d+)$/.exec(response.headers.get("content-range") ?? "")?.[1] ?? "0"),
      }),
      { apikey: token, Authorization: `Bearer ${token}`, Prefer: "count=exact" },
    );
  }

  return {
    circuits: () => [http.breaker.snapshot()],

    async listPage(lang, number) {
      if (lang !== "fr") {
        return { refs: [], lastPage: 0 };
      }
      const offset = (number - 1) * PER_PAGE;
      const answer = await rows(
        `select=id,updated_at,created_at,image&published=eq.true&order=created_at.desc&limit=${String(PER_PAGE)}&offset=${String(offset)}`,
      );
      const listed = z
        .array(
          z.object({
            id: z.uuid(),
            updated_at: z.string(),
            created_at: z.string(),
            image: z.string().nullable(),
          }),
        )
        .safeParse(answer.rows);
      if (!listed.success) {
        throw new QuarantineError(
          INFRASTRUCTURES_BASE,
          "unexpected listing shape (site structure changed?)",
        );
      }
      return {
        lastPage: Math.max(1, Math.ceil(answer.total / PER_PAGE)),
        refs: listed.data.map((row): SourceArticleRef => ({
          sourceId: row.id,
          slug: row.id,
          lang,
          sourceUpdatedAt: row.updated_at,
          publishedOn: row.created_at.slice(0, 10),
          coverSourceUrl: row.image === null ? null : officialMediaUrl(row.image),
        })),
      };
    },

    articleIdFor: (ref) => infrastructuresArticleId(String(ref.sourceId)),

    async downloadMedia(url) {
      return Buffer.from(await http.read(url, (response) => response.arrayBuffer()));
    },

    async fetchArticle(ref) {
      const answer = await rows(
        `select=*&published=eq.true&id=eq.${encodeURIComponent(String(ref.sourceId))}`,
      );
      const parsed = z.array(rowSchema).length(1).safeParse(answer.rows);
      if (!parsed.success || parsed.data[0] === undefined) {
        throw new QuarantineError(
          `${INFRASTRUCTURES_SITE}/actualites/${String(ref.sourceId)}`,
          "unexpected article shape, or no longer published",
        );
      }
      return normalizeInfrastructures(parsed.data[0], now().toISOString());
    },
  };
}
