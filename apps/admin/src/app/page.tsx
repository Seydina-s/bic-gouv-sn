import {
  adminOpportunitiesResponseSchema,
  assistantUsageSchema,
  errorJournalEntrySchema,
  participationResponseSchema,
} from "@bgs/shared-types";
import { z } from "zod";
import { AttentionPanel } from "../components/AttentionPanel";
import { IngestionPanel } from "../components/IngestionPanel";
import { SitesReviewPanel } from "../components/SitesReviewPanel";
import { SourcesTable } from "../components/SourcesTable";
import { StatusPanel } from "../components/StatusPanel";
import { adminRequest } from "../lib/admin-api";
import { getApiStatus } from "../lib/api-status";
import { attentionItems } from "../lib/attention";
import { readApiUrl } from "../lib/config";
import { t } from "../lib/i18n";
import { getIngestionReport } from "../lib/ingestion-status";
import { notificationsOverview } from "../lib/pending-notifications";
import { requireAccount } from "../lib/session";
import { getSitesReview, sitesPublishingAgain } from "../lib/sites-review";
import { getPublishers, sourceRows } from "../lib/sources";

// Always the live state: never served from a cache.
export const dynamic = "force-dynamic";

const journalSchema = z.object({ entries: z.array(errorJournalEntrySchema) });

export default async function StatusPage() {
  const { token } = await requireAccount();
  const apiUrl = readApiUrl(process.env);
  // All checks at once: the page never waits for one before starting the next.
  const [
    status,
    report,
    sitesReview,
    publishers,
    errors,
    notifications,
    participation,
    opportunities,
    assistant,
  ] = await Promise.all([
    getApiStatus({ apiUrl }),
    getIngestionReport({ apiUrl }),
    getSitesReview({ apiUrl }),
    getPublishers({ apiUrl }),
    adminRequest({ path: "/errors", token, schema: journalSchema }),
    // Shared with the navigation's counter: read once.
    notificationsOverview(token),
    adminRequest({ path: "/participation", token, schema: participationResponseSchema }),
    adminRequest({ path: "/opportunities", token, schema: adminOpportunitiesResponseSchema }),
    adminRequest({ path: "/assistant", token, schema: assistantUsageSchema }),
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
    ...(assistant.ok ? { assistant: assistant.data } : {}),
    sitesPublishing: sitesPublishingAgain(sitesReview),
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
      <section aria-labelledby="sources-title" className="mt-12">
        <h2
          id="sources-title"
          className="text-balance font-display text-2xl font-extrabold tracking-tight md:text-3xl"
        >
          {t("sources.title")}
        </h2>
        <div className="mt-6">
          <SourcesTable
            rows={publishers === null ? null : sourceRows(publishers, report?.circuits ?? [])}
          />
        </div>
      </section>
      <section aria-labelledby="sites-title" className="mt-12">
        <h2
          id="sites-title"
          className="text-balance font-display text-2xl font-extrabold tracking-tight md:text-3xl"
        >
          {t("sites.title")}
        </h2>
        <div className="mt-6">
          <SitesReviewPanel review={sitesReview} />
        </div>
      </section>
    </>
  );
}
