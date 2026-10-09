import type { WordpressSite } from "./wordpress-provider";

/*
 * Ministry sites read through WordPress (docs/sources.md, checked on 09/10/2026).
 * Each one's cleanup rules come from its real posts (fixtures/): only blocks seen
 * there are dropped.
 */

const NO_EXTRA = { dropClasses: [], dropTexts: [] };

export const WORDPRESS_MINISTRIES = {
  justice: {
    institution: "justice",
    origin: "https://justice.sec.gouv.sn",
    // Divi builder codes: removed for every site.
    cleanup: NO_EXTRA,
  },
  "industrie-commerce": {
    institution: "industrie-commerce",
    origin: "https://industriecommerce.gouv.sn",
    // Elementor page: search box, category list and related posts around the text.
    cleanup: {
      dropClasses: [
        /^elementor-widget-wcf--blog--search--form$/,
        /^elementor-widget-wpr-taxonomy-list$/,
        /^elementor-widget-elementskit-blog-posts$/,
      ],
      dropTexts: [],
    },
  },
  energie: {
    institution: "energie",
    origin: "https://energie-mines.gouv.sn",
    // Theme block repeating the title and photo, then the site's own menu.
    cleanup: { dropClasses: [], dropTexts: ["Departments", "Suivez-Nous"] },
  },
  hydraulique: {
    institution: "hydraulique",
    origin: "https://mha.gouv.sn",
    cleanup: NO_EXTRA,
  },
  agriculture: {
    institution: "agriculture",
    origin: "https://agriculture.gouv.sn",
    cleanup: NO_EXTRA,
  },
  "emploi-formation": {
    institution: "emploi-formation",
    origin: "https://formation.gouv.sn",
    queryRoute: true,
    cleanup: NO_EXTRA,
  },
  peches: {
    institution: "peches",
    origin: "https://mpem.gouv.sn",
    // Its REST answers start with the page builder's style blocks (parseRestBody).
    cleanup: NO_EXTRA,
  },
} as const satisfies Record<string, WordpressSite>;
