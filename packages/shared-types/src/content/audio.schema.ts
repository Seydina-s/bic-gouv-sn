import { z } from "zod";
import {
  isoDateTimeSchema,
  langSchema,
  positiveIntSchema,
  sha256HexSchema,
} from "../common/primitives.schema";
import { mediaKeySchema } from "./media.schema";

/** official: recording published by the source; tts: generated speech. */
export const audioOriginSchema = z.enum(["official", "tts"]);

export const audioTrackSchema = z.strictObject({
  lang: langSchema,
  origin: audioOriginSchema,
  /** Where the file is stored, relative to the media root (like images): CDN-ready. */
  key: mediaKeySchema,
  format: z.enum(["mp3", "aac", "opus"]),
  durationMs: positiveIntSchema,
  bytes: positiveIntSchema,
  voiceId: z.string().min(1).optional(),
  /** Hash of the words read: a track whose text changed since is no longer offered. */
  textHash: sha256HexSchema,
  createdAt: isoDateTimeSchema,
});
export type AudioTrack = z.infer<typeof audioTrackSchema>;
