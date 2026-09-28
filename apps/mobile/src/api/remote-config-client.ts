import { readRemoteConfig, type RemoteConfig } from "@bgs/shared-types";
import { createJsonGetter, type ApiClientOptions } from "./json-getter";

/**
 * Talks to /v1/remote-config: the features switched on or off in every installed
 * app, and the oldest version still allowed. Read leniently: nothing unknown ever
 * breaks the app.
 */
export function createRemoteConfigClient(options: ApiClientOptions) {
  const getJson = createJsonGetter(options);
  return {
    getRemoteConfig(signal?: AbortSignal): Promise<RemoteConfig> {
      return getJson("/v1/remote-config", readRemoteConfig, signal);
    },
  };
}
