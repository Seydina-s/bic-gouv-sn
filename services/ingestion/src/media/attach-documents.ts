import { createHash } from "node:crypto";
import type { ArticleRepository } from "@bgs/content-store";
import { officialMediaUrl, type NewsArticle, type PdfAttachment } from "@bgs/shared-types";
import { MediaProcessingError } from "../lib/errors";
import type { SourceProvider } from "../sources/source-provider";
import type { AttachResult } from "./attach-result";
import type { MediaStorage } from "./media-storage";

/** Links of the sanitized article HTML (attributes always double-quoted by sanitize-html). */
const LINK = /<a\b[^>]*\bhref="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
const TAG = /<[^>]+>/g;
/** Every PDF file starts with these bytes. */
const PDF_SIGNATURE = "%PDF-";

export interface DocumentLink {
  url: string;
  title: string | null;
}

/**
 * Official PDF documents linked from the text of any language version, deduplicated,
 * in order, with the words of their link. Documents hosted elsewhere are left out.
 */
export function documentLinks(article: NewsArticle): DocumentLink[] {
  const found = new Map<string, string | null>();
  for (const translation of article.translations) {
    for (const [, href = "", words = ""] of translation.bodyHtml.matchAll(LINK)) {
      const url = officialMediaUrl(href.replaceAll("&amp;", "&"));
      if (url === null || !new URL(url).pathname.toLowerCase().endsWith(".pdf")) {
        continue;
      }
      const title = words.replace(TAG, " ").replace(/\s+/g, " ").trim();
      if (!found.has(url)) {
        found.set(url, title === "" ? null : title);
      }
    }
  }
  return [...found].map(([url, title]) => ({ url, title }));
}

/** The stored copy of a downloaded file, when it really is a PDF. */
export function asPdfAttachment(link: DocumentLink, data: Buffer): PdfAttachment | null {
  if (data.subarray(0, PDF_SIGNATURE.length).toString("latin1") !== PDF_SIGNATURE) {
    return null;
  }
  const contentHash = createHash("sha256").update(data).digest("hex");
  return {
    sourceUrl: link.url,
    key: `documents/${contentHash}.pdf`,
    title: link.title,
    mimeType: "application/pdf",
    bytes: data.length,
    contentHash,
  };
}

/** Links of the text first (they have words), then the documents attached apart. */
function allDocuments(article: NewsArticle, attachedUrls: readonly string[]): DocumentLink[] {
  const links = documentLinks(article);
  const known = new Set(links.map(({ url }) => url));
  const apart = [...new Set(attachedUrls)].filter((url) => !known.has(url));
  return [...links, ...apart.map((url) => ({ url, title: null }))];
}

/**
 * Keeps our own copy of the official PDFs of an article: those its text links to
 * and those the source attaches apart (`attachedUrls`, e.g. the Council of
 * Ministers report). Resumable: stored documents are skipped; a failing document
 * never blocks the others nor the article (reported, retried).
 */
export async function attachDocuments(
  article: NewsArticle,
  provider: SourceProvider,
  repository: ArticleRepository,
  storage: MediaStorage,
  attachedUrls: readonly string[] = [],
): Promise<AttachResult> {
  const stored = new Set(article.attachments.map((attachment) => attachment.sourceUrl));
  const result: AttachResult = { attached: 0, failures: [] };
  const missing = allDocuments(article, attachedUrls).filter(({ url }) => !stored.has(url));
  for (const link of missing) {
    try {
      const data = await provider.downloadMedia(link.url);
      const attachment = asPdfAttachment(link, data);
      if (attachment === null) {
        throw new Error("Not a PDF file");
      }
      if ((await storage.size(attachment.key)) !== attachment.bytes) {
        await storage.put(attachment.key, data);
      }
      const latest = (await repository.get(article.id)) ?? article;
      await repository.setAttachments(article.id, [...latest.attachments, attachment]);
      result.attached += 1;
    } catch (cause) {
      result.failures.push(new MediaProcessingError(link.url, { cause }));
    }
  }
  return result;
}
