import {
  BroadcastIcon,
  LockIcon,
  PauseCircleIcon,
  PlugsIcon,
  ShieldWarningIcon,
} from "@phosphor-icons/react/dist/ssr";
import type { ReviewedSite, SitesReview } from "@bgs/shared-types";
import { formatClockTime, formatDay } from "../lib/format";
import { t } from "../lib/i18n";

const STATUS_ICON = {
  publishing: BroadcastIcon,
  frozen: PauseCircleIcon,
  certificate: ShieldWarningIcon,
  protected: LockIcon,
  unreachable: PlugsIcon,
} as const;

/** A publication day ("2026-10-02"), in words, read at noon so no time zone shifts it. */
function dayInWords(day: string): string {
  return formatDay(new Date(`${day}T12:00:00Z`));
}

/**
 * "Sites à revoir": the ministry sites the collection cannot read yet, as their last
 * weekly look found them. A site publishing again comes first, highlighted, since a
 * person can then add it to the collection.
 */
export function SitesReviewPanel({ review }: { review: SitesReview | null }) {
  if (review === null) {
    return <p className="max-w-prose text-base text-ink-soft">{t("sites.none")}</p>;
  }
  const checkedAt = new Date(review.checkedAt);
  const sites = [...review.sites].sort(
    (a, b) => Number(b.status === "publishing") - Number(a.status === "publishing"),
  );
  return (
    <div className="space-y-4">
      <p className="max-w-prose text-base text-ink-soft">
        {t("sites.intro")}{" "}
        {t("sites.checkedAt", { day: formatDay(checkedAt), time: formatClockTime(checkedAt) })}
      </p>
      <ul className="grid gap-3 md:grid-cols-2">
        {sites.map((site) => (
          <SiteRow key={site.url} site={site} />
        ))}
      </ul>
    </div>
  );
}

function SiteRow({ site }: { site: ReviewedSite }) {
  const Icon = STATUS_ICON[site.status];
  const publishing = site.status === "publishing";
  return (
    <li
      className={`flex items-start gap-3 rounded-lg p-5 ${
        publishing ? "bg-primary-container text-on-primary-container" : "border border-line"
      }`}
    >
      <Icon aria-hidden="true" weight="duotone" className="mt-0.5 size-6 shrink-0" />
      <div className="min-w-0">
        <p className="font-semibold">{site.name}</p>
        <p className={`mt-1 text-sm ${publishing ? "font-semibold" : "text-ink-soft"}`}>
          {t(`sites.status.${site.status}`)}
        </p>
        <p className={`mt-1 text-sm ${publishing ? "" : "text-ink-soft"}`}>
          {site.newestDay === null
            ? t("sites.noDay")
            : t("sites.newestDay", { day: dayInWords(site.newestDay) })}
        </p>
        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block break-all text-sm underline underline-offset-4"
        >
          {new URL(site.url).host}
        </a>
      </div>
    </li>
  );
}
