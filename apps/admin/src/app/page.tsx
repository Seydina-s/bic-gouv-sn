import {
  adminOpportunitiesResponseSchema,
  errorJournalEntrySchema,
  participationResponseSchema,
} from "@bgs/shared-types";
import { z } from "zod";
import { AttentionPanel } from "../components/AttentionPanel";
import { IngestionPanel } from "../components/IngestionPanel";
import { StatusPanel } from "../components/StatusPanel";
import { adminRequest } from "../lib/admin-api";
import { getApiStatus } from "../lib/api-status";
import { attentionItems } from "../lib/attention";
import { readApiUrl } from "../lib/config";
import { t } from "../lib/i18n";
import { getIngestionReport } from "../lib/ingestion-status";
import { notificationsOverview } from "../lib/pending-notifications";
import { requireAccount } from "../lib/session";

// Always the live state: never served from a cache.
export const dynamic = "force-dynamic";

const journalSchema = z.object({ entries: z.array(errorJournalEntrySchema) });

export default async function StatusPage() {
  const { token } = await requireAccount();
  const apiUrl = readApiUrl(process.env);
  // All checks at once: the page never waits for one before starting the next.
  const [status, report, errors, notifications, participation, opportunities] = await Promise.all([
    getApiStatus({ apiUrl }),
    getIngestionReport({ apiUrl }),
    adminRequest({ path: "/errors", token, schema: journalSchema }),
    // Shared with the navigation's counter: read once.
    notificationsOverview(token),
    adminRequest({ path: "/participation", token, schema: participationResponseSchema }),
    adminRequest({ path: "/opportunities", token, schema: adminOpportunitiesResponseSchema }),
  ]);
  const items = attentionItems({
    errors: errors.ok ? errors.data.entries : null,
    notifications,
    now: status.checkedAt,
    ...(participation.ok
      ? {
          participationToRead: participation.data.entries.filter((entry) => entry.status === "new")
            .length,
        }
      : {}),
    ...(opportunities.ok
      ? {
          opportunitiesPending: opportunities.data.opportunities.filter(
            (item) => item.status === "pending",
          ).length,
        }
      : {}),
  });
  return (
    <>
      <StatusPanel status={status} />
      <section aria-labelledby="attention-title" className="mt-12">
        <h2
          id="attention-title"
          className="text-balance font-display text-2xl font-extrabold tracking-tight md:text-3xl"
        >
          {t("attention.title")}
        </h2>
        <div className="mt-6">
          <AttentionPanel items={items} />
        </div>
      </section>
      <section aria-labelledby="ingestion-title" className="mt-12">
        <h2
          id="ingestion-title"
          className="text-balance font-display text-2xl font-extrabold tracking-tight md:text-3xl"
        >
          {t("ingestion.title")}
        </h2>
        <div role="status" className="mt-6">
          <IngestionPanel report={report} now={status.checkedAt} />
        </div>
      </section>
    </>
  );
}
