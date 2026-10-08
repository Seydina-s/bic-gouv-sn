import { usageReportSchema, type UsageReport } from "@bgs/shared-types";
import { FigureTile } from "../../components/FigureTile";
import { adminRequest } from "../../lib/admin-api";
import { formatDay } from "../../lib/format";
import { t } from "../../lib/i18n";
import { requireAccount } from "../../lib/session";

export const dynamic = "force-dynamic";

const number = new Intl.NumberFormat("fr-FR");
const percent = new Intl.NumberFormat("fr-FR", { style: "percent", maximumFractionDigits: 0 });

/** A figure under its label; without one, says there is not enough data yet. */
function Tile({ label, value }: { label: string; value: string | null }) {
  return <FigureTile label={label} value={value} empty={t("usage.notEnough")} />;
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="space-y-4">
      <h2 id={id} className="font-display text-2xl font-bold">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Each of the last 30 days as a bar, its numbers in words for everyone. */
function Days({ days }: { days: UsageReport["days"] }) {
  const most = Math.max(1, ...days.map((day) => day.active));
  return (
    <ol className="space-y-1">
      {days.map((day) => {
        const words = t("usage.dayLine", {
          count: day.active,
          firstEver: day.firstEver,
          day: formatDay(new Date(day.day)),
        });
        return (
          <li key={day.day} className="flex items-center gap-3 text-sm">
            <span className="sr-only">{words}</span>
            <span aria-hidden="true" className="w-16 shrink-0 text-ink-soft tabular-nums">
              {day.day.slice(8, 10)}/{day.day.slice(5, 7)}
            </span>
            <span aria-hidden="true" className="h-3 flex-1 rounded-full bg-surface">
              <span
                className="block h-3 rounded-full bg-primary"
                style={{ width: `${String((day.active / most) * 100)}%` }}
              />
            </span>
            <span aria-hidden="true" className="w-12 shrink-0 text-right tabular-nums">
              {number.format(day.active)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Shares({
  title,
  rows,
}: {
  title: string;
  rows: readonly { name: string; count: number }[];
}) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-soft">{t("usage.noContent")}</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.map((row) => (
            <li key={row.name} className="flex justify-between gap-4">
              <span>{row.name}</span>
              <span className="tabular-nums">{number.format(row.count)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TopArticles({ rows }: { rows: UsageReport["topRead"] }) {
  if (rows.length === 0) {
    return <p className="text-ink-soft">{t("usage.noContent")}</p>;
  }
  return (
    <ol className="divide-y divide-line rounded-lg border border-line">
      {rows.map((row) => (
        <li
          key={row.articleId}
          className="flex flex-wrap items-baseline justify-between gap-x-6 p-4"
        >
          <span className={row.title === null ? "text-ink-soft" : "font-semibold"}>
            {row.title ?? t("usage.unknownArticle")}
          </span>
          <span className="text-sm tabular-nums">{t("usage.times", { count: row.count })}</span>
        </li>
      ))}
    </ol>
  );
}

const rate = (value: number | null) => (value === null ? null : percent.format(value));

const isPlatform = (value: string | undefined): value is "android" | "ios" | "web" =>
  value === "android" || value === "ios" || value === "web";

/** "Android", "iPhone": the phones people have. */
function platformName(name: string): string {
  return isPlatform(name) ? t(`usage.platformNames.${name}`) : name;
}

/** "Android 14", "iOS 18": the system and its major version. */
function systemName(name: string): string {
  const [platform, version] = name.split(" ");
  const label = isPlatform(platform) ? t(`usage.systemNames.${platform}`) : (platform ?? name);
  return version === undefined ? label : `${label} ${version}`;
}

/**
 * Usage of the app (ADM-12, decision of 29/09/2026): anonymous counters sent only
 * by the people who turned them on. Totals and shares, nothing per person.
 */
export default async function UsagePage() {
  const { token } = await requireAccount();
  const result = await adminRequest({ path: "/usage", token, schema: usageReportSchema });
  return (
    <section aria-labelledby="usage-title" className="space-y-10">
      <div className="space-y-4">
        <h1 id="usage-title" className="font-display text-3xl font-extrabold tracking-tight">
          {t("usage.title")}
        </h1>
        <p className="max-w-prose text-ink-soft">{t("usage.intro")}</p>
        <p className="max-w-prose text-ink-soft">{t("usage.limits")}</p>
      </div>
      {!result.ok ? (
        <p role="alert" className="rounded-md bg-danger-surface p-6 text-on-danger-surface">
          {result.status === 403 ? t("review.forbidden") : t("usage.failed")}
        </p>
      ) : result.data.since === null ? (
        <p className="rounded-lg border border-line p-6">{t("usage.empty")}</p>
      ) : (
        <UsageReportView report={result.data} since={result.data.since} />
      )}
    </section>
  );
}

function UsageReportView({ report, since }: { report: UsageReport; since: string }) {
  return (
    <>
      <p className="text-sm text-ink-soft">
        {t("usage.since", { day: formatDay(new Date(since)) })}
      </p>
      <Section id="usage-active" title={t("usage.activeTitle")}>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Tile label={t("usage.today")} value={number.format(report.activeToday)} />
          <Tile label={t("usage.yesterday")} value={number.format(report.activeYesterday)} />
          <Tile label={t("usage.thisWeek")} value={number.format(report.activeThisWeek)} />
          <Tile label={t("usage.thisMonth")} value={number.format(report.activeThisMonth)} />
        </dl>
      </Section>
      <Section id="usage-new" title={t("usage.newTitle")}>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Tile label={t("usage.last7")} value={number.format(report.newLast7Days)} />
          <Tile label={t("usage.last30")} value={number.format(report.newLast30Days)} />
        </dl>
      </Section>
      <Section id="usage-retention" title={t("usage.retentionTitle")}>
        <p className="max-w-prose text-ink-soft">{t("usage.retentionIntro")}</p>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Tile label={t("usage.after1")} value={rate(report.retention.d1)} />
          <Tile label={t("usage.after7")} value={rate(report.retention.d7)} />
          <Tile label={t("usage.after30")} value={rate(report.retention.d30)} />
        </dl>
      </Section>
      <Section id="usage-days" title={t("usage.daysTitle")}>
        <Days days={report.days} />
      </Section>
      <Section id="usage-phones" title={t("usage.phonesTitle")}>
        <div className="grid gap-8 md:grid-cols-3">
          <Shares
            title={t("usage.platforms")}
            rows={report.platforms.map((row) => ({ ...row, name: platformName(row.name) }))}
          />
          <Shares
            title={t("usage.osVersions")}
            rows={report.osVersions.map((row) => ({ ...row, name: systemName(row.name) }))}
          />
          <Shares title={t("usage.appVersions")} rows={report.appVersions} />
        </div>
      </Section>
      <Section id="usage-read" title={t("usage.readTitle")}>
        <TopArticles rows={report.topRead} />
      </Section>
      <Section id="usage-listened" title={t("usage.listenedTitle")}>
        <TopArticles rows={report.topListened} />
      </Section>
    </>
  );
}
