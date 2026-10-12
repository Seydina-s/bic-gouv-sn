import type { ReviewedSite, SitesReview } from "@bgs/shared-types";
import { frenchDate } from "../lib/french-date";
import { USER_AGENT } from "../lib/polite-http";

/*
 * Once a week, at night, the ministry sites the collection cannot read yet are looked
 * at again (GOV-08, docs/sources.md "sites à revoir"): one visit to each home page,
 * its certificate checked as always (never bypassed). The console then shows which
 * ones came back, so that a site publishing again is added to the collection.
 */

export interface SiteToReview {
  /** The ministry, as the government's decree names it. */
  name: string;
  url: string;
}

/** Re-checked on 11/10/2026 (docs/sources.md). */
export const SITES_TO_REVIEW: readonly SiteToReview[] = [
  { name: "Économie, Finances et Plan", url: "https://finances.gouv.sn/" },
  {
    name: "Urbanisme, Collectivités territoriales et Aménagement des territoires",
    url: "https://www.urbanisme.gouv.sn/",
  },
  {
    name: "Microfinance et Économie sociale et solidaire",
    url: "https://microfinance-ess.gouv.sn/",
  },
  { name: "Transports terrestres et aériens", url: "https://www.mittd.gouv.sn/" },
  { name: "Environnement et Transition écologique", url: "https://www.environnement.gouv.sn/" },
  { name: "Jeunesse et Sports", url: "https://www.sports.gouv.sn/" },
  { name: "Mines et Géologie", url: "https://www.minesgeologie.gouv.sn/" },
  { name: "Élevage (ministre délégué)", url: "https://elevage.sec.gouv.sn/" },
];

/** Published within this many days of the check: the site is news again. */
const RECENT_DAYS = 120;
const DAY_MS = 24 * 60 * 60_000;
const VISIT_TIMEOUT_MS = 20_000;
const REVIEW_EVERY_MS = 7 * DAY_MS;

/** The newest day a page shows, at most `today` (ISO, French, or day/month/year). */
export function newestDayIn(html: string, today: string): string | null {
  // Only what a reader sees, and dates marked as such: a page's head, scripts and
  // styles carry technical days (a plugin's update) that are no publication.
  const visible = html
    .replace(/<head\b[\s\S]*?<\/head>/gi, " ")
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, " ");
  const text = visible.replace(/<[^>]+>/g, " ");
  const days = [
    ...[...visible.matchAll(/<time\b[^>]*\bdatetime="(20\d{2}-[01]\d-[0-3]\d)/gi)].map(
      (match) => match[1],
    ),
    ...[...text.matchAll(/\b(20\d{2}-[01]\d-[0-3]\d)(?!\d)/g)].map((match) => match[1]),
    ...[
      ...text.matchAll(
        /\b[0-3]?\d(?:er)? (?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre) 20\d{2}\b/gi,
      ),
    ].map((match) => frenchDate(match[0])),
    ...[...text.matchAll(/\b([0-3]\d)\/([01]\d)\/(20\d{2})\b/g)].map(
      (match) => `${match[3] ?? ""}-${match[2] ?? ""}-${match[1] ?? ""}`,
    ),
  ].filter(
    (day): day is string => day !== null && day !== undefined && !Number.isNaN(Date.parse(day)),
  );
  const past = days.filter((day) => day <= today).sort();
  return past.at(-1) ?? null;
}

/** Whether a failed visit was refused for its certificate rather than unanswered. */
export function isCertificateError(error: unknown): boolean {
  const cause =
    error instanceof Error ? (error.cause as { code?: unknown } | undefined) : undefined;
  const code = typeof cause?.code === "string" ? cause.code : "";
  return /CERT|SELF_SIGNED|UNABLE_TO_VERIFY|ALTNAME|UNABLE_TO_GET_ISSUER/.test(code);
}

export async function reviewSite(
  site: SiteToReview,
  {
    fetchImpl = fetch,
    now = () => new Date(),
  }: { fetchImpl?: typeof fetch; now?: () => Date } = {},
): Promise<ReviewedSite> {
  const result = (
    status: ReviewedSite["status"],
    newestDay: string | null = null,
  ): ReviewedSite => ({
    name: site.name,
    url: site.url,
    status,
    newestDay,
  });
  let response: Response;
  try {
    response = await fetchImpl(site.url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(VISIT_TIMEOUT_MS),
    });
  } catch (error) {
    return result(isCertificateError(error) ? "certificate" : "unreachable");
  }
  if (response.url.includes("password-protected")) {
    return result("protected");
  }
  if (!response.ok) {
    return result("unreachable");
  }
  const today = now().toISOString().slice(0, 10);
  const newest = newestDayIn(await response.text(), today);
  const recent =
    newest !== null && (Date.parse(today) - Date.parse(newest)) / DAY_MS <= RECENT_DAYS;
  return result(recent ? "publishing" : "frozen", newest);
}

/** Every site, one after the other (a single visit each, a few seconds apart at most). */
export async function reviewSites(
  sites: readonly SiteToReview[],
  options: { fetchImpl?: typeof fetch; now?: () => Date } = {},
): Promise<SitesReview> {
  const reviewed: ReviewedSite[] = [];
  for (const site of sites) {
    reviewed.push(await reviewSite(site, options));
  }
  return { checkedAt: (options.now ?? (() => new Date()))().toISOString(), sites: reviewed };
}

/** Due at night (2 to 5 h UTC) when the last review is a week old, or there is none. */
export function isSitesReviewDue(now: Date, lastCheckedAt: string | null): boolean {
  const hour = now.getUTCHours();
  const quiet = hour >= 2 && hour < 5;
  return (
    quiet &&
    (lastCheckedAt === null || now.getTime() - Date.parse(lastCheckedAt) >= REVIEW_EVERY_MS)
  );
}
