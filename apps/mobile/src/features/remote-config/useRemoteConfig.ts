import {
  DEFAULT_REMOTE_CONFIG,
  isOlderVersion,
  type AppFeature,
  type RemoteConfig,
} from "@bgs/shared-types";
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { createRemoteConfigClient } from "../../api/remote-config-client";
import { API_BASE_URL } from "../../api/base-url";

const client = createRemoteConfigClient({ baseUrl: API_BASE_URL });

/** A switched-off feature reaches the phone within about a minute of use. */
const FRESH_MS = 60_000;

/**
 * The remote control of the app, kept offline like the news: while it cannot be
 * read, the last known one applies, and before any, everything stays on. A server
 * problem therefore never switches anything off.
 */
export function useRemoteConfig(): RemoteConfig {
  const { data } = useQuery({
    queryKey: ["remote-config"],
    queryFn: ({ signal }) => client.getRemoteConfig(signal),
    staleTime: FRESH_MS,
    refetchInterval: FRESH_MS,
  });
  return data ?? DEFAULT_REMOTE_CONFIG;
}

/** True unless the console switched this feature off. */
export function useFeature(feature: AppFeature): boolean {
  return useRemoteConfig().features[feature];
}

/** This app's version, from its build. */
export function appVersion(): string {
  return Constants.expoConfig?.version ?? "0.0.0";
}

/** True when this version is older than the oldest one still allowed. */
export function useUpdateRequired(): boolean {
  const { minVersion } = useRemoteConfig();
  return minVersion !== null && isOlderVersion(appVersion(), minVersion);
}
