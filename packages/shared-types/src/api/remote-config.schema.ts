import { z } from "zod";

/*
 * Remote control of the installed apps (CLAUDE.md §4.5): features switched off
 * without an update (kill switch), and the oldest version still allowed.
 */

/** What can be switched off in every installed app. */
export const APP_FEATURES = [
  "nearMe",
  "map",
  "readAloud",
  "procedures",
  "participate",
  "assistant",
] as const;
export const appFeatureSchema = z.enum(APP_FEATURES);
export type AppFeature = z.infer<typeof appFeatureSchema>;

const versionSchema = z.string().regex(/^\d{1,4}\.\d{1,4}\.\d{1,4}$/);

export const remoteConfigSchema = z.object({
  /** Oldest app version still allowed ("1.2.0"); older apps ask for an update. */
  minVersion: versionSchema.nullable(),
  features: z.record(appFeatureSchema, z.boolean()),
});
export type RemoteConfig = z.infer<typeof remoteConfigSchema>;

/** Everything on, no minimum: what an app uses until it knows better. */
export const DEFAULT_REMOTE_CONFIG: RemoteConfig = {
  minVersion: null,
  features: {
    nearMe: true,
    map: true,
    readAloud: true,
    procedures: true,
    participate: true,
    assistant: true,
  },
};

/**
 * Reads a remote config as an installed app must: a feature it does not know is
 * ignored, one missing stays on, an unreadable answer changes nothing.
 */
export function readRemoteConfig(raw: unknown): RemoteConfig {
  const loose = z
    .object({
      minVersion: versionSchema.nullable().catch(null),
      features: z.record(z.string(), z.boolean()).catch({}),
    })
    .safeParse(raw);
  if (!loose.success) {
    return DEFAULT_REMOTE_CONFIG;
  }
  const features = { ...DEFAULT_REMOTE_CONFIG.features };
  for (const feature of APP_FEATURES) {
    const value = loose.data.features[feature];
    if (value !== undefined) {
      features[feature] = value;
    }
  }
  return { minVersion: loose.data.minVersion, features };
}

/** True when `version` ("1.2.3") is older than `minimum`. */
export function isOlderVersion(version: string, minimum: string): boolean {
  const parts = (text: string) => text.split(".").map((part) => Number.parseInt(part, 10) || 0);
  const [a, b] = [parts(version), parts(minimum)];
  for (let index = 0; index < 3; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) {
      return difference < 0;
    }
  }
  return false;
}
