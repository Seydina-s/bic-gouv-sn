import { IngestionPanel } from "../components/IngestionPanel";
import { StatusPanel } from "../components/StatusPanel";
import { getApiStatus } from "../lib/api-status";
import { readApiUrl } from "../lib/config";
import { t } from "../lib/i18n";
import { getIngestionReport } from "../lib/ingestion-status";

// Always the live state: never served from a cache.
export const dynamic = "force-dynamic";

export default async function StatusPage() {
  const apiUrl = readApiUrl(process.env);
  // Both checks at once: the page never waits for one before starting the other.
  const [status, report] = await Promise.all([
    getApiStatus({ apiUrl }),
    getIngestionReport({ apiUrl }),
  ]);
  return (
    <>
      <StatusPanel status={status} />
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
