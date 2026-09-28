import { readFile } from "node:fs/promises";
import { DEFAULT_REMOTE_CONFIG, remoteConfigSchema, type RemoteConfig } from "@bgs/shared-types";
import { writeFileDurably } from "./durable-file";

/**
 * The remote control of the installed apps (kill switches, minimum version), set
 * in the console. Missing file: everything on, no minimum.
 */
export class FileRemoteConfigStore {
  constructor(private readonly path: string) {}

  async read(): Promise<RemoteConfig> {
    let raw: string;
    try {
      raw = await readFile(this.path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return DEFAULT_REMOTE_CONFIG;
      }
      throw error;
    }
    return remoteConfigSchema.parse(JSON.parse(raw));
  }

  async write(config: RemoteConfig): Promise<RemoteConfig> {
    const valid = remoteConfigSchema.parse(config);
    await writeFileDurably(this.path, JSON.stringify(valid, null, 2));
    return valid;
  }
}
