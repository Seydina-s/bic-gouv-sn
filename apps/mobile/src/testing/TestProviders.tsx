import { DEFAULT_REMOTE_CONFIG } from "@bgs/shared-types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { DataSaverProvider } from "../features/data-saver/DataSaverProvider";
import { UsageStatsProvider } from "../features/usage-stats/UsageStatsProvider";
import { I18nProvider } from "../i18n/I18nProvider";
import { ThemeProvider } from "../theme/ThemeProvider";

/** Queries answered from memory: a screen part under test never goes to the network. */
function testQueryClient(): QueryClient {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(["remote-config"], DEFAULT_REMOTE_CONFIG);
  return client;
}

/** What a screen part needs around it in tests: data, theme, language, data saving. */
export function TestProviders({ children }: { children: ReactNode }) {
  const [client] = useState(testQueryClient);
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <I18nProvider>
          <DataSaverProvider>
            <UsageStatsProvider>{children}</UsageStatsProvider>
          </DataSaverProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
