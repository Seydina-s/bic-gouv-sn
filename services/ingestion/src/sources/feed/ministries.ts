import type { FeedSite } from "./feed-provider";

/* Ministry sites read through their RSS feed (docs/sources.md, checked on 11/10/2026). */

export const FEED_MINISTRIES = {
  "fonction-publique": {
    institution: "fonction-publique",
    origin: "https://www.fonctionpublique.gouv.sn",
    // SPIP: its 10 newest articles, whole; robots.txt absent, one visit a second.
    feedPath: "/spip.php?page=backend",
    category: "actualites",
    intervalMs: 1000,
  },
} as const satisfies Record<string, FeedSite>;
