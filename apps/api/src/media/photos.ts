import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

/** Larger pictures are refused before decoding (decompression bombs). */
const MAX_PIXELS = 50_000_000;

/**
 * A photo as it is kept: turned upright, its longest side no larger than `side`,
 * re-encoded as JPEG, which drops its hidden data (place where it was taken, device).
 * Null when it is not a picture.
 */
export async function cleanPhoto(base64: string, side: number): Promise<Buffer | null> {
  try {
    return await sharp(Buffer.from(base64, "base64"), { limitInputPixels: MAX_PIXELS })
      .rotate()
      .resize({ width: side, height: side, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
  } catch {
    return null;
  }
}

/** A folder of JPEG photos, each named by its id. */
export class PhotoFolder {
  constructor(private readonly root: string) {}

  private pathOf(id: string): string {
    return join(this.root, `${id}.jpg`);
  }

  async save(id: string, photo: Buffer): Promise<void> {
    await mkdir(this.root, { recursive: true });
    await writeFile(this.pathOf(id), photo);
  }

  async read(id: string): Promise<Buffer | null> {
    try {
      return await readFile(this.pathOf(id));
    } catch {
      return null;
    }
  }

  async remove(id: string): Promise<void> {
    await rm(this.pathOf(id), { force: true });
  }
}
