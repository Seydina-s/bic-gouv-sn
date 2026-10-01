import { readFile } from "node:fs/promises";
import {
  APP_FEATURES,
  DEFAULT_REMOTE_CONFIG,
  remoteConfigSchema,
  type RemoteConfig,
} from "@bgs/shared-types";
import { z } from "zod";
import { writeFileDurably } from "./durable-file";

/** What was saved: a feature added since (or dropped) does not make it unreadable. */
const savedSchema = z.object({
  minVersion: remoteConfigSchema.shape.minVersion,
  features: z.record(z.string(), z.boolean()),
});

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
    // A malformed file is refused; a feature added since it was saved stays on.
    const saved = savedSchema.parse(JSON.parse(raw));
    const features = Object.fromEntries(
      APP_FEATURES.map((feature) => [
        feature,
        saved.features[feature] ?? DEFAULT_REMOTE_CONFIG.features[feature],
      ]),
    );
    return remoteConfigSchema.parse({ minVersion: saved.minVersion, features });
  }

  async write(config: RemoteConfig): Promise<RemoteConfig> {
    const valid = remoteConfigSchema.parse(config);
    await writeFileDurably(this.path, JSON.stringify(valid, null, 2));
    return valid;
  }
}
