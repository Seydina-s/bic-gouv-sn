import {
  APP_FEATURES,
  DEFAULT_REMOTE_CONFIG,
  remoteConfigSchema,
  type RemoteConfig,
} from "@bgs/shared-types";
import { z } from "zod";
import type { JsonDocument } from "./json-document";

/** What was saved: a feature added since (or dropped) does not make it unreadable. */
const savedSchema = z.object({
  minVersion: remoteConfigSchema.shape.minVersion,
  features: z.record(z.string(), z.boolean()),
});

/**
 * The remote control of the installed apps (kill switches, minimum version), set
 * in the console. Nothing saved: everything on, no minimum. In a file or in
 * PostgreSQL (SCALE-02).
 */
export class RemoteConfigStore {
  constructor(private readonly document: JsonDocument) {}

  async read(): Promise<RemoteConfig> {
    const raw = await this.document.read();
    if (raw === undefined) {
      return DEFAULT_REMOTE_CONFIG;
    }
    // A malformed value is refused; a feature added since it was saved stays on.
    const saved = savedSchema.parse(raw);
    const features = Object.fromEntries(
      APP_FEATURES.map((feature) => [
        feature,
        saved.features[feature] ?? DEFAULT_REMOTE_CONFIG.features[feature],
      ]),
    );
    return remoteConfigSchema.parse({ minVersion: saved.minVersion, features });
  }

  write(config: RemoteConfig): Promise<RemoteConfig> {
    const valid = remoteConfigSchema.parse(config);
    return this.document.update(() => ({ next: valid, result: valid }));
  }
}
