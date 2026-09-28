import { remoteConfigSchema } from "@bgs/shared-types";
import { adminRequest } from "../../lib/admin-api";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";
import { RemoteConfigForm } from "./RemoteConfigForm";

export const dynamic = "force-dynamic";

/** Kill switches and minimum version of the installed apps (CLAUDE.md §4.5). */
export default async function RemoteControlPage() {
  const { token } = await requireAccount();
  const current = await adminRequest({ path: "/remote-config", token, schema: remoteConfigSchema });
  return (
    <section aria-labelledby="remote-title" className="space-y-6">
      <h1 id="remote-title" className="font-display text-3xl font-extrabold tracking-tight">
        {t("remote.title")}
      </h1>
      <p className="max-w-prose text-ink-soft">{t("remote.intro")}</p>
      {current.ok ? (
        <RemoteConfigForm config={current.data} />
      ) : (
        <p role="alert" className="rounded-md bg-danger-surface p-6 text-on-danger-surface">
          {current.status === 403 ? t("review.forbidden") : t("remote.failed")}
        </p>
      )}
    </section>
  );
}
