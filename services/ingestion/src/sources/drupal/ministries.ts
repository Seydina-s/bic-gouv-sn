import type { DrupalSite } from "./drupal-provider";

/*
 * Ministry sites built with Drupal 7 (docs/sources.md, checked on 09/10/2026). Both
 * ask robots for 10 seconds between two visits (Crawl-delay: 10).
 */

export const DRUPAL_MINISTRIES = {
  sante: {
    institution: "sante",
    origin: "https://www.sante.gouv.sn",
    sections: [{ path: "/Actualites", category: "actualites" }],
    // Its listing shows no day: the feed dates its newest articles.
    feedPath: "/rss.xml",
    intervalMs: 10_000,
  },
  "forces-armees": {
    institution: "forces-armees",
    origin: "https://www.forcesarmees.gouv.sn",
    sections: [
      { path: "/actualites", category: "actualites" },
      { path: "/communiques", category: "communiques" },
      { path: "/discours", category: "discours" },
    ],
    intervalMs: 10_000,
  },
} as const satisfies Record<string, DrupalSite>;
