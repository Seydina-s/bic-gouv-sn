import { participationResponseSchema, type ParticipationEntry } from "@bgs/shared-types";
import { adminRequest } from "../../lib/admin-api";
import { formatClockTime, formatDay } from "../../lib/format";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";
import { HandleForm } from "./HandleForm";

export const dynamic = "force-dynamic";

function when(iso: string): { day: string; time: string } {
  const date = new Date(iso);
  return { day: formatDay(date), time: formatClockTime(date) };
}

/** What kind of entry it is, in words: "Message · Pour le gouvernement". */
function kindOf(entry: ParticipationEntry): string {
  return entry.type === "message"
    ? `${t("participation.message")} · ${t(`participation.topics.${entry.topic}`)}`
    : `${t("participation.report")} · ${t(`participation.categories.${entry.category}`)}`;
}

function EntryCard({ entry, canHandle }: { entry: ParticipationEntry; canHandle: boolean }) {
  return (
    <li className="space-y-3 rounded-lg border border-line p-6">
      <p className="text-sm font-semibold text-brand">{kindOf(entry)}</p>
      <p className="text-sm text-ink-soft">
        {t("participation.receivedAt", when(entry.receivedAt))}
      </p>
      <p className="max-w-prose whitespace-pre-line text-base">{entry.text}</p>
      {entry.type === "report" && entry.place !== null && (
        <p className="text-sm font-semibold">{t("participation.place", { place: entry.place })}</p>
      )}
      {entry.type === "report" && entry.photoId !== null && (
        // Private photo: served by the console's own route, under the person's session.
        <img
          src={`/participation/photos/${entry.photoId}`}
          alt={t("participation.photo")}
          loading="lazy"
          className="max-h-96 w-auto rounded-md border border-line"
        />
      )}
      {entry.handledBy !== null && entry.handledAt !== null && (
        <p className="text-sm text-ink-soft">
          {t("participation.handledBy", { name: entry.handledBy.name, ...when(entry.handledAt) })}
        </p>
      )}
      {canHandle && entry.status === "new" && <HandleForm id={entry.id} />}
    </li>
  );
}

/**
 * Participer in the console (decision of the user, 01/10/2026): what citizens write
 * to the government and the public problems they report, newest first.
 */
export default async function ParticipationPage() {
  const { token, account } = await requireAccount();
  const result = await adminRequest({
    path: "/participation",
    token,
    schema: participationResponseSchema,
  });
  if (!result.ok) {
    return (
      <p role="alert" className="rounded-md bg-danger-surface p-6 text-on-danger-surface">
        {t("participation.listFailed")}
      </p>
    );
  }
  const canHandle = account.role !== "reviewer";
  const fresh = result.data.entries.filter((entry) => entry.status === "new");
  const handled = result.data.entries.filter((entry) => entry.status === "handled");

  return (
    <section aria-labelledby="participation-title" className="space-y-10">
      <div className="space-y-4">
        <h1
          id="participation-title"
          className="font-display text-3xl font-extrabold tracking-tight"
        >
          {t("participation.title")}
        </h1>
        <p className="max-w-prose text-ink-soft">{t("participation.intro")}</p>
      </div>
      <section aria-labelledby="new-title" className="space-y-4">
        <h2 id="new-title" className="font-display text-2xl font-bold">
          {t("participation.newTitle")}
        </h2>
        {fresh.length === 0 ? (
          <p className="text-ink-soft">{t("participation.none")}</p>
        ) : (
          <ul className="space-y-4">
            {fresh.map((entry) => (
              <EntryCard key={entry.id} entry={entry} canHandle={canHandle} />
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="handled-title" className="space-y-4">
        <h2 id="handled-title" className="font-display text-2xl font-bold">
          {t("participation.handledTitle")}
        </h2>
        {handled.length === 0 ? (
          <p className="text-ink-soft">{t("participation.noneHandled")}</p>
        ) : (
          <ul className="space-y-4">
            {handled.map((entry) => (
              <EntryCard key={entry.id} entry={entry} canHandle={false} />
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
