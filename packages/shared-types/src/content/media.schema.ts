import { z } from "zod";
import { httpsUrlSchema, positiveIntSchema, sha256HexSchema } from "../common/primitives.schema";

/**
 * Path of a stored media file relative to the media root (e.g. "images/ab12/960.webp").
 * Stored instead of a full URL, so moving to a CDN only changes the base URL.
 */
export const mediaKeySchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[/._-][a-z0-9]+)*$/, "Expected a relative media path, no '..'");

export const imageVariantSchema = z.strictObject({
  format: z.enum(["avif", "webp", "jpeg"]),
  width: positiveIntSchema,
  key: mediaKeySchema,
  bytes: positiveIntSchema,
});

export const imageSchema = z
  .strictObject({
    /** Original image URL on the source site (traceability). */
    originalUrl: httpsUrlSchema,
    /** The original file as downloaded, kept untouched in storage. */
    originalKey: mediaKeySchema,
    width: positiveIntSchema,
    height: positiveIntSchema,
    /** Alt text as published by the source, or null when the source provides none. */
    alt: z.string().trim().min(1).nullable(),
    blurhash: z.string().min(6).max(100),
    variants: z.array(imageVariantSchema).min(1),
  })
  .superRefine((image, ctx) => {
    if (!image.variants.some((variant) => variant.format === "jpeg")) {
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "A JPEG fallback variant is required",
      });
    }
    if (image.variants.some((variant) => variant.width > image.width)) {
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Variants must not be wider than the original image",
      });
    }
  });
export type Image = z.infer<typeof imageSchema>;

export const pdfAttachmentSchema = z.strictObject({
  sourceUrl: httpsUrlSchema,
  url: httpsUrlSchema,
  title: z.string().trim().min(1).nullable(),
  mimeType: z.literal("application/pdf"),
  bytes: positiveIntSchema,
  contentHash: sha256HexSchema,
});
export type PdfAttachment = z.infer<typeof pdfAttachmentSchema>;
