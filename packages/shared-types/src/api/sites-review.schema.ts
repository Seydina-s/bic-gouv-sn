import { z } from "zod";

/*
 * The weekly look at the ministry sites the collection cannot read yet (GOV-08,
 * docs/sources.md "sites à revoir"): whether each one answers, with a valid
 * certificate, and when it last published. Public sites and dates only.
 */

export const REVIEWED_SITE_STATUSES = [
  /** No answer (down, or filtered from where the collection runs). */
  "unreachable",
  /** Answers with a certificate that is invalid: never read (no TLS bypass). */
  "certificate",
  /** Closed by a password (site under construction). */
  "protected",
  /** Answers, but its newest article is old. */
  "frozen",
  /** Answers and published lately: it can be added to the collection. */
  "publishing",
] as const;
export const reviewedSiteStatusSchema = z.enum(REVIEWED_SITE_STATUSES);
export type ReviewedSiteStatus = z.infer<typeof reviewedSiteStatusSchema>;

export const reviewedSiteSchema = z.object({
  /** The ministry, as the government's decree names it. */
  name: z.string().min(1),
  url: z.url({ protocol: /^https$/ }),
  status: reviewedSiteStatusSchema,
  /** The newest day the site's page shows, when it answers and shows one. */
  newestDay: z.iso.date().nullable(),
});
export type ReviewedSite = z.infer<typeof reviewedSiteSchema>;

export const sitesReviewSchema = z.object({
  checkedAt: z.iso.datetime(),
  sites: z.array(reviewedSiteSchema),
});
export type SitesReview = z.infer<typeof sitesReviewSchema>;
