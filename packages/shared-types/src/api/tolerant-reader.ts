import type { z } from "zod";
import {
  blockSchema,
  coverSchema,
  newsDetailSchema,
  newsListResponseSchema,
  newsSummarySchema,
  type NewsDetail,
  type NewsListResponse,
} from "./news.schema";
import {
  procedureDetailSchema,
  procedureListResponseSchema,
  procedureSummarySchema,
  type ProcedureDetail,
  type ProcedureListResponse,
} from "./procedures.schema";

/*
 * Tolerant reader for clients (the app): a newer API may add block types, image
 * formats or fields that this installed version does not know. Unknown parts are
 * dropped instead of rejecting the whole response; only a response whose essential
 * shape is broken is refused.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function keepValid(values: unknown, schema: z.ZodType): unknown[] {
  return Array.isArray(values) ? values.filter((value) => schema.safeParse(value).success) : [];
}

/** A cover keeps the sources this version can display; none left means no cover. */
function readCover(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return null;
  }
  const sourceSchema = coverSchema.shape.sources.element;
  const sources = keepValid(raw["sources"], sourceSchema);
  const cover = { ...raw, sources };
  return coverSchema.safeParse(cover).success ? cover : null;
}

function withReadableParts(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return raw;
  }
  const readable: Record<string, unknown> = { ...raw, cover: readCover(raw["cover"]) };
  if ("blocks" in raw) {
    readable["blocks"] = keepValid(raw["blocks"], blockSchema);
  }
  return readable;
}

/** Feed page: unreadable items are skipped, the rest is shown. Null if the page is broken. */
export function readNewsList(raw: unknown): NewsListResponse | null {
  if (!isRecord(raw)) {
    return null;
  }
  const items = Array.isArray(raw["items"])
    ? raw["items"]
        .map(withReadableParts)
        .filter((item) => newsSummarySchema.safeParse(item).success)
    : raw["items"];
  const parsed = newsListResponseSchema.safeParse({ ...raw, items });
  return parsed.success ? parsed.data : null;
}

/** One article, without the blocks this version cannot display. Null if broken. */
export function readNewsDetail(raw: unknown): NewsDetail | null {
  const parsed = newsDetailSchema.safeParse(withReadableParts(raw));
  return parsed.success ? parsed.data : null;
}

function withReadableBlocks(raw: unknown): unknown {
  if (!isRecord(raw)) {
    return raw;
  }
  const readable: Record<string, unknown> = {
    ...raw,
    blocks: keepValid(raw["blocks"], blockSchema),
  };
  if (Array.isArray(raw["faqs"])) {
    readable["faqs"] = raw["faqs"].map(withReadableBlocks);
  }
  return readable;
}

/** Procedure list page: unreadable items are skipped. Null if the page is broken. */
export function readProcedureList(raw: unknown): ProcedureListResponse | null {
  if (!isRecord(raw)) {
    return null;
  }
  const items = Array.isArray(raw["items"])
    ? raw["items"].filter((item) => procedureSummarySchema.safeParse(item).success)
    : raw["items"];
  const parsed = procedureListResponseSchema.safeParse({ ...raw, items });
  return parsed.success ? parsed.data : null;
}

/** One procedure, without the blocks this version cannot display. Null if broken. */
export function readProcedureDetail(raw: unknown): ProcedureDetail | null {
  const parsed = procedureDetailSchema.safeParse(withReadableBlocks(raw));
  return parsed.success ? parsed.data : null;
}
