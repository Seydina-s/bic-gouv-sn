import { createHash } from "node:crypto";
import { imageSchema, type Image } from "@bgs/shared-types";
import { encode } from "blurhash";
import sharp from "sharp";
import type { MediaStorage } from "./media-storage";
import { ssim } from "./ssim";

type Format = "avif" | "webp" | "jpeg";

/** Widths produced (never wider than the original). */
export const VARIANT_WIDTHS = [480, 960] as const;
/** Quality ladder per format: the first quality reaching the SSIM floor is kept. */
const QUALITIES: Record<Format, readonly number[]> = {
  avif: [50, 62, 75],
  webp: [78, 86, 92],
  jpeg: [80, 88, 94],
};
export const SSIM_FLOOR = 0.98;

async function gray(input: Buffer, width: number): Promise<{ data: Uint8Array; height: number }> {
  const { data, info } = await sharp(input)
    .resize({ width })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), height: info.height };
}

async function encodeVariant(oriented: Buffer, width: number, format: Format) {
  const reference = await gray(oriented, width);
  let best: { data: Buffer; score: number } | null = null;
  for (const quality of QUALITIES[format]) {
    const data = await sharp(oriented).resize({ width })[format]({ quality }).toBuffer();
    const candidate = await gray(data, width);
    const score =
      candidate.height === reference.height
        ? ssim(candidate.data, reference.data, width, reference.height)
        : 0;
    best = { data, score };
    if (score >= SSIM_FLOOR) {
      break;
    }
  }
  // QUALITIES are never empty: best is always set.
  return best as { data: Buffer; score: number };
}

async function blurhashOf(oriented: Buffer): Promise<string> {
  const { data, info } = await sharp(oriented)
    .resize(32, 32, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 3);
}

export interface ProcessImageInput {
  original: Buffer;
  /** Source URL of the image (traceability, and the stable storage folder). */
  sourceUrl: string;
  alt: string | null;
  /** Cover of the article or image placed in its text. */
  role: Image["role"];
}

/**
 * Keeps the original untouched, produces lighter AVIF/WebP variants plus a JPEG
 * fallback at each width, each at the lowest quality whose SSIM against the original
 * reaches 0.98, and a BlurHash placeholder (CLAUDE.md §1, ingestion step 4).
 * Idempotent: the storage folder is derived from the source URL.
 */
export async function processImage(
  { original, sourceUrl, alt, role }: ProcessImageInput,
  storage: MediaStorage,
): Promise<{ image: Image; lowestSsim: number }> {
  const folder = `images/${createHash("sha256").update(sourceUrl).digest("hex").slice(0, 20)}`;
  const oriented = await sharp(original).rotate().toBuffer();
  const meta = await sharp(oriented).metadata();
  const { width, height } = meta;
  const originalKey = `${folder}/original.${meta.format === "png" ? "png" : "jpg"}`;
  if ((await storage.size(originalKey)) === null) {
    await storage.put(originalKey, original);
  }

  const widths = [...new Set(VARIANT_WIDTHS.map((w) => Math.min(w, width)))];
  const variants: Image["variants"] = [];
  let lowestSsim = 1;
  for (const variantWidth of widths) {
    for (const format of ["avif", "webp", "jpeg"] as const) {
      const key = `${folder}/${String(variantWidth)}.${format === "jpeg" ? "jpg" : format}`;
      // Already produced (and SSIM-checked) by an earlier run: reused, not re-encoded.
      const storedBytes = await storage.size(key);
      if (storedBytes !== null) {
        variants.push({ format, width: variantWidth, key, bytes: storedBytes });
        continue;
      }
      const { data, score } = await encodeVariant(oriented, variantWidth, format);
      await storage.put(key, data);
      variants.push({ format, width: variantWidth, key, bytes: data.length });
      lowestSsim = Math.min(lowestSsim, score);
    }
  }

  const image = imageSchema.parse({
    role,
    originalUrl: sourceUrl,
    originalKey,
    width,
    height,
    alt,
    blurhash: await blurhashOf(oriented),
    variants,
  });
  return { image, lowestSsim };
}
