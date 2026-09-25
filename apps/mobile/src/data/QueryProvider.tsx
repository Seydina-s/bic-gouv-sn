import { apiContractFingerprint } from "@bgs/shared-types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useState, type ReactNode } from "react";

const WEEK = 7 * 24 * 60 * 60 * 1000;

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
        retry: 1,
      },
    },
  });
}

const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: "bgs-query-cache" });

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);
  return (
    <PersistQueryClientProvider
      client={client}
      // A cache saved in an older data format (before an app update) is discarded.
      persistOptions={{ persister, maxAge: WEEK, buster: apiContractFingerprint() }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
