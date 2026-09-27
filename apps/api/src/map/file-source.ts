import { open, type FileHandle } from "node:fs/promises";
import type { RangeResponse, Source } from "pmtiles";

/**
 * A PMTiles archive read from a local file (the library reads over HTTP by default).
 * The file stays open for the life of the API; reads are positioned, never shared.
 */
export class FileSource implements Source {
  private handle: Promise<FileHandle> | null = null;

  constructor(private readonly path: string) {}

  getKey(): string {
    return this.path;
  }

  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    this.handle ??= open(this.path, "r");
    const handle = await this.handle;
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, offset);
    return { data: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + bytesRead) };
  }

  async close(): Promise<void> {
    const handle = this.handle;
    this.handle = null;
    await (await handle)?.close();
  }
}
