import { errorJournalEntrySchema } from "@bgs/shared-types";
import { z } from "zod";
import { ErrorJournalList } from "../../components/ErrorJournalList";
import { adminRequest } from "../../lib/admin-api";
import { readApiUrl } from "../../lib/config";
import { journalRows } from "../../lib/error-journal";
import { t } from "../../lib/i18n";
import { getIngestionReport } from "../../lib/ingestion-status";
import { requireAccount } from "../../lib/session";

export const dynamic = "force-dynamic";

const journalSchema = z.object({ entries: z.array(errorJournalEntrySchema) });

/** Every error the platform met, grouped and explained in plain words. */
export default async function ErrorsPage() {
  const { token } = await requireAccount();
  const [journal, collection] = await Promise.all([
    adminRequest({ path: "/errors", token, schema: journalSchema }),
    getIngestionReport({ apiUrl: readApiUrl(process.env) }),
  ]);
  return (
    <section aria-labelledby="errors-title" className="space-y-6">
      <h1 id="errors-title" className="font-display text-3xl font-extrabold tracking-tight">
        {t("errors.title")}
      </h1>
      <p className="max-w-prose text-ink-soft">{t("errors.intro")}</p>
      {journal.ok ? (
        <ErrorJournalList rows={journalRows(journal.data.entries, collection, new Date())} />
      ) : (
        <p role="alert" className="rounded-md bg-danger-surface p-6 text-on-danger-surface">
          {journal.status === 403 ? t("review.forbidden") : t("errors.failed")}
        </p>
      )}
    </section>
  );
}
