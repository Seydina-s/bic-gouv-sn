import { z } from "zod";
import { officialSourceUrlSchema } from "../common/official-source.schema";
import {
  isoDateTimeSchema,
  langSchema,
  positiveIntSchema,
  sha256HexSchema,
} from "../common/primitives.schema";
import { audioTrackSchema } from "./audio.schema";
import { embeddingSchema } from "./embedding.schema";
import { translationSchema } from "./translation.schema";

/**
 * Fields every published content carries (CLAUDE.md §4.2): traceability to the
 * official source, versioning, languages, and the AI-ready fields (audio, embedding).
 */
export const traceableContentShape = {
  id: z.uuid(),
  sourceUrl: officialSourceUrlSchema,
  /** Null when the source page shows no publication date: never guessed. */
  sourcePublishedAt: isoDateTimeSchema.nullable(),
  fetchedAt: isoDateTimeSchema,
  contentHash: sha256HexSchema,
  version: positiveIntSchema,
  /** Language of the original publication. */
  lang: langSchema,
  translations: z.array(translationSchema).min(1),
  audio: z.array(audioTrackSchema),
  embedding: embeddingSchema.nullable(),
};

type TraceableContent = z.infer<z.ZodObject<typeof traceableContentShape>>;

export function checkTraceableContent(content: TraceableContent, ctx: z.RefinementCtx): void {
  const langs = content.translations.map((translation) => translation.lang);
  if (new Set(langs).size !== langs.length) {
    ctx.addIssue({
      code: "custom",
      path: ["translations"],
      message: "Only one translation per language is allowed",
    });
  }
  const original = content.translations.find((translation) => translation.lang === content.lang);
  if (original?.status !== "official") {
    ctx.addIssue({
      code: "custom",
      path: ["translations"],
      message: "The original language must be present as an official translation",
    });
  }
  if (content.audio.some((track) => !langs.includes(track.lang))) {
    ctx.addIssue({
      code: "custom",
      path: ["audio"],
      message: "Audio is only allowed for languages that have a translation",
    });
  }
}
