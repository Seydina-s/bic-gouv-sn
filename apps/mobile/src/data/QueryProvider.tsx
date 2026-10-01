import { apiContractFingerprint } from "@bgs/shared-types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { defaultShouldDehydrateQuery, QueryClient, type Query } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState, type ReactNode } from "react";
import { NewsApiError } from "../api/json-getter";

const WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * One more try for a passing failure (network, server); none for an answer that
 * will not change, such as "not found" or "withdrawn by the source" (4xx).
 */
export function retryPassingFailure(failures: number, error: unknown): boolean {
  const final =
    error instanceof NewsApiError &&
    error.status !== null &&
    error.status >= 400 &&
    error.status < 500;
  return !final && failures < 1;
}

/**
 * Offline-first cache (CLAUDE.md §1, navigation): screens show the last saved data
 * instantly, then refresh in the background. Kept on the phone for a week.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: WEEK,
        networkMode: "offlineFirst",
        retry: retryPassingFailure,
      },
    },
  });
}

const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: "bgs-query-cache" });

/**
 * What is kept on the phone: what serves offline (articles, sections, procedures,
 * services), never the searches typed, which only pile up (and Android cannot read
 * back a stored value over 2 MB).
 */
export function keptOffline(query: Query): boolean {
  const [area, , kind, typed] = query.queryKey;
  const newsSearch = area === "news" && kind === "search";
  const procedureSearch = area === "procedures" && typeof typed === "string" && typed !== "";
  return defaultShouldDehydrateQuery(query) && !newsSearch && !procedureSearch;
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  return (
    <PersistQueryClientProvider
      client={client}
      // A cache saved in an older data format (before an app update) is discarded.
      persistOptions={{
        persister,
        maxAge: WEEK,
        buster: apiContractFingerprint(),
        dehydrateOptions: { shouldDehydrateQuery: keptOffline },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
