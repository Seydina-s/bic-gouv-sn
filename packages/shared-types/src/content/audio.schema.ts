import { z } from "zod";
import {
  httpsUrlSchema,
  isoDateTimeSchema,
  langSchema,
  positiveIntSchema,
} from "../common/primitives.schema";

/** official: recording published by the source; tts: generated speech. */
export const audioOriginSchema = z.enum(["official", "tts"]);

export const audioTrackSchema = z.strictObject({
  lang: langSchema,
  origin: audioOriginSchema,
  url: httpsUrlSchema,
  format: z.enum(["mp3", "aac", "opus"]),
  durationMs: positiveIntSchema,
  bytes: positiveIntSchema,
  voiceId: z.string().min(1).optional(),
  createdAt: isoDateTimeSchema,
});
export type AudioTrack = z.infer<typeof audioTrackSchema>;
